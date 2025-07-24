import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import { logger } from '../utils/logger';
import { prisma } from '../index';

export interface EmbeddingChunk {
  content: string;
  embedding: number[];
  metadata: {
    documentId: string;
    chunkIndex: number;
    tokenCount: number;
  };
}

export interface TextChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
}

export class EmbeddingService {
  private openai: OpenAI;
  private readonly CHUNK_SIZE = 1000; // tokens
  private readonly CHUNK_OVERLAP = 200; // tokens

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async initialize(): Promise<void> {
    try {
      // Test the API connection
      await this.openai.models.list();
      logger.info('OpenAI API connection established');
    } catch (error) {
      logger.error('Failed to connect to OpenAI API:', error);
      throw error;
    }
  }

  /**
   * Extract text from PDF file
   */
  async extractTextFromPdf(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      logger.error('Error extracting text from PDF:', error);
      throw error;
    }
  }

  /**
   * Split text into chunks with overlap
   */
  splitTextIntoChunks(text: string): TextChunk[] {
    const words = text.split(/\s+/);
    const chunks: TextChunk[] = [];
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
  async generateEmbeddings(chunks: TextChunk[]): Promise<EmbeddingChunk[]> {
    const embeddingChunks: EmbeddingChunk[] = [];
    
    try {
      // Process chunks in batches to respect rate limits
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        const embeddings = await Promise.all(
          batch.map(async (chunk) => {
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
          })
        );
        
        embeddingChunks.push(...embeddings);
        
        // Rate limiting delay
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return embeddingChunks;
    } catch (error) {
      logger.error('Error generating embeddings:', error);
      throw error;
    }
  }

  /**
   * Process document and generate embeddings
   */
  async processDocument(documentId: string): Promise<void> {
    try {
      logger.info(`Processing document ${documentId}`);
      
      // Get document from database
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });
      
      if (!document) {
        throw new Error('Document not found');
      }
      
      if (!document.filePath) {
        throw new Error('Document file path not found');
      }
      
      // Update status to processing
      await prisma.document.update({
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
      await prisma.$transaction(async (tx: any) => {
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
      
      logger.info(`Document ${documentId} processed successfully with ${embeddingChunks.length} chunks`);
    } catch (error) {
      logger.error(`Error processing document ${documentId}:`, error);
      
      // Update status to failed
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED' },
      }).catch(() => {}); // Ignore errors in error handler
      
      throw error;
    }
  }

  /**
   * Generate embedding for search query
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: query,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      logger.error('Error generating query embedding:', error);
      throw error;
    }
  }
} 