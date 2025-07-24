import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, PDFDropdown } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { prisma } from '../index';

export interface PdfTemplate {
  id: string;
  name: string;
  description: string;
  filePath: string;
  fieldMappings: Record<string, FieldMapping>;
  llmPrompts: Record<string, string>;
}

export interface FieldMapping {
  type: 'text' | 'checkbox' | 'dropdown';
  label: string;
  description?: string;
  required?: boolean;
  options?: string[]; // For dropdown fields
  llmPrompt?: string; // Custom prompt for this field
}

export interface FormData {
  [fieldName: string]: string | boolean;
}

export interface LlmCompletion {
  fieldName: string;
  prompt: string;
  completion: string;
  confidence?: number;
}

export class PdfService {
  private openai: OpenAI;
  private templatesDir: string;
  private outputDir: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.templatesDir = process.env.PDF_TEMPLATES_DIR || './storage/templates';
    this.outputDir = process.env.PDF_OUTPUT_DIR || './storage/generated';
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [this.templatesDir, this.outputDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Extract form fields from PDF template
   */
  async analyzeTemplate(templatePath: string): Promise<FieldMapping[]> {
    try {
      const pdfBuffer = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const form = pdfDoc.getForm();
      
      const fields = form.getFields();
      const fieldMappings: FieldMapping[] = [];
      
      for (const field of fields) {
        const fieldName = field.getName();
        let fieldType: 'text' | 'checkbox' | 'dropdown' = 'text';
        let options: string[] | undefined;
        
        if (field instanceof PDFTextField) {
          fieldType = 'text';
        } else if (field instanceof PDFCheckBox) {
          fieldType = 'checkbox';
        } else if (field instanceof PDFDropdown) {
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
    } catch (error) {
      logger.error('Error analyzing PDF template:', error);
      throw error;
    }
  }

  /**
   * Generate LLM completions for form fields
   */
  async generateCompletions(
    templateId: string,
    contextData: Record<string, any>,
    searchResults?: any[]
  ): Promise<LlmCompletion[]> {
    try {
      const template = await prisma.pdfTemplate.findUnique({
        where: { id: templateId },
      });
      
      if (!template) {
        throw new Error('Template not found');
      }
      
      const fieldMappings = template.fieldMappings as unknown as Record<string, FieldMapping>;
      const llmPrompts = template.llmPrompts as unknown as Record<string, string>;
      const completions: LlmCompletion[] = [];
      
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
          } catch (error) {
            logger.warn(`Failed to generate completion for field ${fieldName}:`, error);
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
    } catch (error) {
      logger.error('Error generating LLM completions:', error);
      throw error;
    }
  }

  /**
   * Fill PDF template with form data
   */
  async fillTemplate(
    templateId: string,
    formData: FormData,
    llmCompletions?: LlmCompletion[]
  ): Promise<string> {
    try {
      const template = await prisma.pdfTemplate.findUnique({
        where: { id: templateId },
      });
      
      if (!template) {
        throw new Error('Template not found');
      }
      
      // Load PDF template
      const templatePath = path.join(this.templatesDir, template.filePath);
      const pdfBuffer = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const form = pdfDoc.getForm();
      
      const fieldMappings = template.fieldMappings as unknown as Record<string, FieldMapping>;
      
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
          
          if (field instanceof PDFTextField) {
            field.setText(String(value));
          } else if (field instanceof PDFCheckBox) {
            if (typeof value === 'boolean') {
              if (value) field.check();
              else field.uncheck();
            } else {
              // Handle string values like "true", "false", "yes", "no"
              const boolValue = ['true', 'yes', '1'].includes(String(value).toLowerCase());
              if (boolValue) field.check();
              else field.uncheck();
            }
          } else if (field instanceof PDFDropdown) {
            if (mapping?.options?.includes(String(value))) {
              field.select(String(value));
            }
          }
        } catch (error) {
          logger.warn(`Failed to fill field ${fieldName}:`, error);
        }
      });
      
      // Generate output filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputFilename = `${template.name}-${timestamp}.pdf`;
      const outputPath = path.join(this.outputDir, outputFilename);
      
      // Save filled PDF
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, pdfBytes);
      
      logger.info(`PDF generated: ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error('Error filling PDF template:', error);
      throw error;
    }
  }

  /**
   * Create a new PDF template
   */
  async createTemplate(
    userId: string,
    name: string,
    description: string,
    filePath: string
  ): Promise<string> {
    try {
      // Analyze the template to extract field mappings
      const fieldMappings = await this.analyzeTemplate(filePath);
      
      // Create template record
      const template = await prisma.pdfTemplate.create({
        data: {
          userId,
          name,
          description,
          filePath: path.basename(filePath),
          fieldMappings: fieldMappings.reduce((acc, field) => {
            acc[field.label] = field;
            return acc;
          }, {} as Record<string, FieldMapping>) as any,
          llmPrompts: {},
        },
      });
      
      return template.id;
    } catch (error) {
      logger.error('Error creating PDF template:', error);
      throw error;
    }
  }

  /**
   * Update LLM prompts for template fields
   */
  async updateTemplatePrompts(
    templateId: string,
    prompts: Record<string, string>
  ): Promise<void> {
    try {
      await prisma.pdfTemplate.update({
        where: { id: templateId },
        data: {
          llmPrompts: prompts,
        },
      });
    } catch (error) {
      logger.error('Error updating template prompts:', error);
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<PdfTemplate | null> {
    try {
      const template = await prisma.pdfTemplate.findUnique({
        where: { id: templateId },
      });
      
      if (!template) return null;
      
      return {
        id: template.id,
        name: template.name,
        description: template.description || '',
        filePath: template.filePath,
        fieldMappings: template.fieldMappings as unknown as Record<string, FieldMapping>,
        llmPrompts: template.llmPrompts as unknown as Record<string, string>,
      };
    } catch (error) {
      logger.error('Error getting template:', error);
      throw error;
    }
  }
} 