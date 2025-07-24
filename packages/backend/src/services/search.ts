import { Pinecone } from '@pinecone-database/pinecone';
import { logger } from '../utils/logger';
import { prisma } from '../index';
import { embeddingService } from './';

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: {
    documentId: string;
    documentName: string;
    chunkIndex: number;
    tokenCount: number;
  };
}

export interface SearchOptions {
  topK?: number;
  scoreThreshold?: number;
  userId?: string;
}

export class SearchService {
  private pinecone: Pinecone;
  private indexName: string;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
      environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws',
    });
    this.indexName = process.env.PINECONE_INDEX_NAME || 'harbor-documents';
  }

  async initialize(): Promise<void> {
    try {
      // Test the connection and ensure index exists
      const indexes = await this.pinecone.listIndexes();
      const indexExists = indexes.some((idx: any) => idx.name === this.indexName);
      
      if (!indexExists) {
        logger.info(`Creating Pinecone index: ${this.indexName}`);
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: 1536, // OpenAI ada-002 embedding dimension
          metric: 'cosine',
        });
        
        // Wait for index to be ready
        await this.waitForIndexReady();
      }
      
      logger.info('Pinecone search service initialized');
    } catch (error) {
      logger.error('Failed to initialize Pinecone:', error);
      throw error;
    }
  }

  private async waitForIndexReady(): Promise<void> {
    const maxAttempts = 30;
    const delayMs = 2000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const index = this.pinecone.index(this.indexName);
        const stats = await index.describeIndexStats();
        if (stats.totalRecordCount !== undefined) {
          logger.info('Pinecone index is ready');
          return;
        }
      } catch (error) {
        // Index might not be ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    throw new Error('Timeout waiting for Pinecone index to be ready');
  }

  /**
   * Upsert embeddings to Pinecone
   */
  async upsertEmbeddings(documentId: string): Promise<void> {
    try {
      logger.info(`Upserting embeddings for document ${documentId}`);
      
      // Get document chunks with embeddings
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { chunks: true },
      });
      
      if (!document) {
        throw new Error('Document not found');
      }
      
      // Get embeddings for each chunk
      const vectors = [];
      for (const chunk of document.chunks) {
        // Generate embedding for this chunk
        const embedding = await embeddingService.generateQueryEmbedding(chunk.content);
        
        vectors.push({
          id: chunk.pineconeId,
          values: embedding,
          metadata: {
            documentId: document.id,
            documentName: document.name,
            chunkIndex: chunk.chunkIndex,
            tokenCount: chunk.tokenCount,
            userId: document.userId,
            content: chunk.content.substring(0, 1000), // Truncate for metadata
          },
        });
      }
      
      // Upsert to Pinecone in batches
      const index = this.pinecone.index(this.indexName);
      const batchSize = 100;
      
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await index.upsert(batch);
      }
      
      logger.info(`Successfully upserted ${vectors.length} vectors for document ${documentId}`);
    } catch (error) {
      logger.error('Error upserting embeddings:', error);
      throw error;
    }
  }

  /**
   * Search for similar documents
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      const {
        topK = 10,
        scoreThreshold = 0.7,
        userId,
      } = options;
      
      // Generate embedding for query
      const queryEmbedding = await embeddingService.generateQueryEmbedding(query);
      
      // Build filter for user's documents
      const filter: any = {};
      if (userId) {
        filter.userId = userId;
      }
      
      // Search in Pinecone
      const index = this.pinecone.index(this.indexName);
      const searchResponse = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter,
      });
      
      // Process results
      const results: SearchResult[] = searchResponse.matches
        ?.filter(match => match.score && match.score >= scoreThreshold)
        .map(match => ({
          id: match.id,
          content: match.metadata?.content as string || '',
          score: match.score!,
          metadata: {
            documentId: match.metadata?.documentId as string,
            documentName: match.metadata?.documentName as string,
            chunkIndex: match.metadata?.chunkIndex as number,
            tokenCount: match.metadata?.tokenCount as number,
          },
        })) || [];
      
      // Log search query
      if (userId) {
        await prisma.searchQuery.create({
          data: {
            userId,
            query,
            resultCount: results.length,
            maxSimilarityScore: results[0]?.score || null,
            resultsMetadata: {
              topK,
              scoreThreshold,
              totalMatches: searchResponse.matches?.length || 0,
            },
          },
        }).catch((error: any) => {
          logger.warn('Failed to log search query:', error);
        });
      }
      
      return results;
    } catch (error) {
      logger.error('Error searching documents:', error);
      throw error;
    }
  }

  /**
   * Delete embeddings for a document
   */
  async deleteDocumentEmbeddings(documentId: string): Promise<void> {
    try {
      const chunks = await prisma.documentChunk.findMany({
        where: { documentId },
      });
      
      if (chunks.length === 0) {
        return;
      }
      
      const index = this.pinecone.index(this.indexName);
      const vectorIds = chunks.map((chunk: any) => chunk.pineconeId);
      
      await index.deleteMany(vectorIds);
      
      logger.info(`Deleted ${vectorIds.length} vectors for document ${documentId}`);
    } catch (error) {
      logger.error('Error deleting embeddings:', error);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<any> {
    try {
      const index = this.pinecone.index(this.indexName);
      return await index.describeIndexStats();
    } catch (error) {
      logger.error('Error getting index stats:', error);
      throw error;
    }
  }
} 