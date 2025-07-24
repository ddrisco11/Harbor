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
    options?: string[];
    llmPrompt?: string;
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
export declare class PdfService {
    private openai;
    private templatesDir;
    private outputDir;
    constructor();
    private ensureDirectories;
    /**
     * Extract form fields from PDF template
     */
    analyzeTemplate(templatePath: string): Promise<FieldMapping[]>;
    /**
     * Generate LLM completions for form fields
     */
    generateCompletions(templateId: string, contextData: Record<string, any>, searchResults?: any[]): Promise<LlmCompletion[]>;
    /**
     * Fill PDF template with form data
     */
    fillTemplate(templateId: string, formData: FormData, llmCompletions?: LlmCompletion[]): Promise<string>;
    /**
     * Create a new PDF template
     */
    createTemplate(userId: string, name: string, description: string, filePath: string): Promise<string>;
    /**
     * Update LLM prompts for template fields
     */
    updateTemplatePrompts(templateId: string, prompts: Record<string, string>): Promise<void>;
    /**
     * Get template by ID
     */
    getTemplate(templateId: string): Promise<PdfTemplate | null>;
}
//# sourceMappingURL=pdf.d.ts.map