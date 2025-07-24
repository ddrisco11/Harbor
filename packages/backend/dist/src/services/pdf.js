"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfService = void 0;
const pdf_lib_1 = require("pdf-lib");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const openai_1 = __importDefault(require("openai"));
const logger_1 = require("../utils/logger");
const index_1 = require("../index");
class PdfService {
    constructor() {
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.templatesDir = process.env.PDF_TEMPLATES_DIR || './storage/templates';
        this.outputDir = process.env.PDF_OUTPUT_DIR || './storage/generated';
        // Ensure directories exist
        this.ensureDirectories();
    }
    ensureDirectories() {
        [this.templatesDir, this.outputDir].forEach(dir => {
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
        });
    }
    /**
     * Extract form fields from PDF template
     */
    async analyzeTemplate(templatePath) {
        try {
            const pdfBuffer = fs_1.default.readFileSync(templatePath);
            const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBuffer);
            const form = pdfDoc.getForm();
            const fields = form.getFields();
            const fieldMappings = [];
            for (const field of fields) {
                const fieldName = field.getName();
                let fieldType = 'text';
                let options;
                if (field instanceof pdf_lib_1.PDFTextField) {
                    fieldType = 'text';
                }
                else if (field instanceof pdf_lib_1.PDFCheckBox) {
                    fieldType = 'checkbox';
                }
                else if (field instanceof pdf_lib_1.PDFDropdown) {
                    fieldType = 'dropdown';
                    options = field.getOptions();
                }
                fieldMappings.push({
                    type: fieldType,
                    label: fieldName,
                    description: `Auto-generated from PDF field: ${fieldName}`,
                    required: false,
                    options,
                });
            }
            return fieldMappings;
        }
        catch (error) {
            logger_1.logger.error('Error analyzing PDF template:', error);
            throw error;
        }
    }
    /**
     * Generate LLM completions for form fields
     */
    async generateCompletions(templateId, contextData, searchResults) {
        try {
            const template = await index_1.prisma.pdfTemplate.findUnique({
                where: { id: templateId },
            });
            if (!template) {
                throw new Error('Template not found');
            }
            const fieldMappings = template.fieldMappings;
            const llmPrompts = template.llmPrompts;
            const completions = [];
            // Build context from search results and user data
            let context = 'Context Information:\n';
            if (searchResults?.length) {
                context += 'Relevant documents:\n';
                searchResults.forEach((result, idx) => {
                    context += `${idx + 1}. ${result.content.substring(0, 500)}...\n`;
                });
            }
            if (contextData) {
                context += '\nUser-provided data:\n';
                Object.entries(contextData).forEach(([key, value]) => {
                    context += `${key}: ${value}\n`;
                });
            }
            // Generate completions for each field with LLM prompt
            for (const [fieldName, mapping] of Object.entries(fieldMappings)) {
                const prompt = llmPrompts[fieldName] || mapping.llmPrompt;
                if (prompt && mapping.type === 'text') {
                    const fullPrompt = `${context}\n\nTask: ${prompt}\n\nPlease provide a concise, accurate response for the field "${mapping.label}". If you cannot determine the answer from the context, respond with "N/A".`;
                    try {
                        const response = await this.openai.chat.completions.create({
                            model: 'gpt-4',
                            messages: [
                                {
                                    role: 'system',
                                    content: 'You are a helpful assistant that fills out form fields based on provided context. Be concise and accurate.',
                                },
                                {
                                    role: 'user',
                                    content: fullPrompt,
                                },
                            ],
                            max_tokens: 200,
                            temperature: 0.1,
                        });
                        const completion = response.choices[0]?.message?.content?.trim() || 'N/A';
                        completions.push({
                            fieldName,
                            prompt,
                            completion,
                            confidence: completion !== 'N/A' ? 0.8 : 0.1,
                        });
                    }
                    catch (error) {
                        logger_1.logger.warn(`Failed to generate completion for field ${fieldName}:`, error);
                        completions.push({
                            fieldName,
                            prompt,
                            completion: 'N/A',
                            confidence: 0.0,
                        });
                    }
                }
            }
            return completions;
        }
        catch (error) {
            logger_1.logger.error('Error generating LLM completions:', error);
            throw error;
        }
    }
    /**
     * Fill PDF template with form data
     */
    async fillTemplate(templateId, formData, llmCompletions) {
        try {
            const template = await index_1.prisma.pdfTemplate.findUnique({
                where: { id: templateId },
            });
            if (!template) {
                throw new Error('Template not found');
            }
            // Load PDF template
            const templatePath = path_1.default.join(this.templatesDir, template.filePath);
            const pdfBuffer = fs_1.default.readFileSync(templatePath);
            const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBuffer);
            const form = pdfDoc.getForm();
            const fieldMappings = template.fieldMappings;
            // Merge form data with LLM completions
            const allData = { ...formData };
            if (llmCompletions) {
                llmCompletions.forEach(completion => {
                    if (!allData[completion.fieldName] && completion.completion !== 'N/A') {
                        allData[completion.fieldName] = completion.completion;
                    }
                });
            }
            // Fill form fields
            Object.entries(allData).forEach(([fieldName, value]) => {
                try {
                    const field = form.getField(fieldName);
                    const mapping = fieldMappings[fieldName];
                    if (field instanceof pdf_lib_1.PDFTextField) {
                        field.setText(String(value));
                    }
                    else if (field instanceof pdf_lib_1.PDFCheckBox) {
                        if (typeof value === 'boolean') {
                            if (value)
                                field.check();
                            else
                                field.uncheck();
                        }
                        else {
                            // Handle string values like "true", "false", "yes", "no"
                            const boolValue = ['true', 'yes', '1'].includes(String(value).toLowerCase());
                            if (boolValue)
                                field.check();
                            else
                                field.uncheck();
                        }
                    }
                    else if (field instanceof pdf_lib_1.PDFDropdown) {
                        if (mapping?.options?.includes(String(value))) {
                            field.select(String(value));
                        }
                    }
                }
                catch (error) {
                    logger_1.logger.warn(`Failed to fill field ${fieldName}:`, error);
                }
            });
            // Generate output filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const outputFilename = `${template.name}-${timestamp}.pdf`;
            const outputPath = path_1.default.join(this.outputDir, outputFilename);
            // Save filled PDF
            const pdfBytes = await pdfDoc.save();
            fs_1.default.writeFileSync(outputPath, pdfBytes);
            logger_1.logger.info(`PDF generated: ${outputPath}`);
            return outputPath;
        }
        catch (error) {
            logger_1.logger.error('Error filling PDF template:', error);
            throw error;
        }
    }
    /**
     * Create a new PDF template
     */
    async createTemplate(userId, name, description, filePath) {
        try {
            // Analyze the template to extract field mappings
            const fieldMappings = await this.analyzeTemplate(filePath);
            // Create template record
            const template = await index_1.prisma.pdfTemplate.create({
                data: {
                    userId,
                    name,
                    description,
                    filePath: path_1.default.basename(filePath),
                    fieldMappings: fieldMappings.reduce((acc, field) => {
                        acc[field.label] = field;
                        return acc;
                    }, {}),
                    llmPrompts: {},
                },
            });
            return template.id;
        }
        catch (error) {
            logger_1.logger.error('Error creating PDF template:', error);
            throw error;
        }
    }
    /**
     * Update LLM prompts for template fields
     */
    async updateTemplatePrompts(templateId, prompts) {
        try {
            await index_1.prisma.pdfTemplate.update({
                where: { id: templateId },
                data: {
                    llmPrompts: prompts,
                },
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating template prompts:', error);
            throw error;
        }
    }
    /**
     * Get template by ID
     */
    async getTemplate(templateId) {
        try {
            const template = await index_1.prisma.pdfTemplate.findUnique({
                where: { id: templateId },
            });
            if (!template)
                return null;
            return {
                id: template.id,
                name: template.name,
                description: template.description || '',
                filePath: template.filePath,
                fieldMappings: template.fieldMappings,
                llmPrompts: template.llmPrompts,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting template:', error);
            throw error;
        }
    }
}
exports.PdfService = PdfService;
//# sourceMappingURL=pdf.js.map