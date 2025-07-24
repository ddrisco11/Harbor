"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingService = void 0;
const openai_1 = __importDefault(require("openai"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("../utils/logger");
const index_1 = require("../index");
class EmbeddingService {
    constructor() {
        this.CHUNK_SIZE = 1000; // tokens
        this.CHUNK_OVERLAP = 200; // tokens
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    async initialize() {
        try {
            // Test the API connection
            await this.openai.models.list();
            logger_1.logger.info('OpenAI API connection established');
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to OpenAI API:', error);
            throw error;
        }
    }
    /**
     * Extract text from PDF file
     */
    async extractTextFromPdf(filePath) {
        try {
            const dataBuffer = fs_1.default.readFileSync(filePath);
            const data = await (0, pdf_parse_1.default)(dataBuffer);
            return data.text;
        }
        catch (error) {
            logger_1.logger.error('Error extracting text from PDF:', error);
            throw error;
        }
    }
    /**
     * Split text into chunks with overlap
     */
    splitTextIntoChunks(text) {
        const words = text.split(/\s+/);
        const chunks = [];
        let chunkIndex = 0;
        for (let i = 0; i < words.length; i += this.CHUNK_SIZE - this.CHUNK_OVERLAP) {
            const chunkWords = words.slice(i, i + this.CHUNK_SIZE);
            const content = chunkWords.join(' ');
            chunks.push({
                content,
                chunkIndex,
                tokenCount: chunkWords.length, // Approximate token count
            });
            chunkIndex++;
        }
        return chunks;
    }
    /**
     * Generate embeddings for text chunks
     */
    async generateEmbeddings(chunks) {
        const embeddingChunks = [];
        try {
            // Process chunks in batches to respect rate limits
            const batchSize = 10;
            for (let i = 0; i < chunks.length; i += batchSize) {
                const batch = chunks.slice(i, i + batchSize);
                const embeddings = await Promise.all(batch.map(async (chunk) => {
                    const response = await this.openai.embeddings.create({
                        model: 'text-embedding-ada-002',
                        input: chunk.content,
                    });
                    return {
                        content: chunk.content,
                        embedding: response.data[0].embedding,
                        metadata: {
                            documentId: '', // Will be set by caller
                            chunkIndex: chunk.chunkIndex,
                            tokenCount: chunk.tokenCount,
                        },
                    };
                }));
                embeddingChunks.push(...embeddings);
                // Rate limiting delay
                if (i + batchSize < chunks.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            return embeddingChunks;
        }
        catch (error) {
            logger_1.logger.error('Error generating embeddings:', error);
            throw error;
        }
    }
    /**
     * Process document and generate embeddings
     */
    async processDocument(documentId) {
        try {
            logger_1.logger.info(`Processing document ${documentId}`);
            // Get document from database
            const document = await index_1.prisma.document.findUnique({
                where: { id: documentId },
            });
            if (!document) {
                throw new Error('Document not found');
            }
            if (!document.filePath) {
                throw new Error('Document file path not found');
            }
            // Update status to processing
            await index_1.prisma.document.update({
                where: { id: documentId },
                data: { status: 'PROCESSING' },
            });
            // Extract text from PDF
            const text = await this.extractTextFromPdf(document.filePath);
            // Split into chunks
            const textChunks = this.splitTextIntoChunks(text);
            // Generate embeddings
            const embeddingChunks = await this.generateEmbeddings(textChunks);
            // Save chunks to database and get Pinecone IDs ready
            const documentChunks = embeddingChunks.map((chunk, index) => ({
                id: `${documentId}-chunk-${index}`,
                documentId,
                pineconeId: `${documentId}-chunk-${index}`,
                content: chunk.content,
                chunkIndex: chunk.metadata.chunkIndex,
                tokenCount: chunk.metadata.tokenCount,
                metadata: {
                    ...chunk.metadata,
                    documentId,
                },
            }));
            // Save chunks to database
            await index_1.prisma.$transaction(async (tx) => {
                // Delete existing chunks
                await tx.documentChunk.deleteMany({
                    where: { documentId },
                });
                // Create new chunks
                await tx.documentChunk.createMany({
                    data: documentChunks,
                });
                // Update document status
                await tx.document.update({
                    where: { id: documentId },
                    data: {
                        status: 'COMPLETED',
                        processedAt: new Date(),
                    },
                });
            });
            logger_1.logger.info(`Document ${documentId} processed successfully with ${embeddingChunks.length} chunks`);
        }
        catch (error) {
            logger_1.logger.error(`Error processing document ${documentId}:`, error);
            // Update status to failed
            await index_1.prisma.document.update({
                where: { id: documentId },
                data: { status: 'FAILED' },
            }).catch(() => { }); // Ignore errors in error handler
            throw error;
        }
    }
    /**
     * Generate embedding for search query
     */
    async generateQueryEmbedding(query) {
        try {
            const response = await this.openai.embeddings.create({
                model: 'text-embedding-ada-002',
                input: query,
            });
            return response.data[0].embedding;
        }
        catch (error) {
            logger_1.logger.error('Error generating query embedding:', error);
            throw error;
        }
    }
}
exports.EmbeddingService = EmbeddingService;
//# sourceMappingURL=embedding.js.map