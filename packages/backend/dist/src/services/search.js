"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const pinecone_1 = require("@pinecone-database/pinecone");
const logger_1 = require("../utils/logger");
const index_1 = require("../index");
const _1 = require("./");
class SearchService {
    constructor() {
        this.pinecone = new pinecone_1.Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
            environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws',
        });
        this.indexName = process.env.PINECONE_INDEX_NAME || 'harbor-documents';
    }
    async initialize() {
        try {
            // Test the connection and ensure index exists
            const indexes = await this.pinecone.listIndexes();
            const indexExists = indexes.some((idx) => idx.name === this.indexName);
            if (!indexExists) {
                logger_1.logger.info(`Creating Pinecone index: ${this.indexName}`);
                await this.pinecone.createIndex({
                    name: this.indexName,
                    dimension: 1536, // OpenAI ada-002 embedding dimension
                    metric: 'cosine',
                });
                // Wait for index to be ready
                await this.waitForIndexReady();
            }
            logger_1.logger.info('Pinecone search service initialized');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Pinecone:', error);
            throw error;
        }
    }
    async waitForIndexReady() {
        const maxAttempts = 30;
        const delayMs = 2000;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const index = this.pinecone.index(this.indexName);
                const stats = await index.describeIndexStats();
                if (stats.totalRecordCount !== undefined) {
                    logger_1.logger.info('Pinecone index is ready');
                    return;
                }
            }
            catch (error) {
                // Index might not be ready yet
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        throw new Error('Timeout waiting for Pinecone index to be ready');
    }
    /**
     * Upsert embeddings to Pinecone
     */
    async upsertEmbeddings(documentId) {
        try {
            logger_1.logger.info(`Upserting embeddings for document ${documentId}`);
            // Get document chunks with embeddings
            const document = await index_1.prisma.document.findUnique({
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
                const embedding = await _1.embeddingService.generateQueryEmbedding(chunk.content);
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
            logger_1.logger.info(`Successfully upserted ${vectors.length} vectors for document ${documentId}`);
        }
        catch (error) {
            logger_1.logger.error('Error upserting embeddings:', error);
            throw error;
        }
    }
    /**
     * Search for similar documents
     */
    async search(query, options = {}) {
        try {
            const { topK = 10, scoreThreshold = 0.7, userId, } = options;
            // Generate embedding for query
            const queryEmbedding = await _1.embeddingService.generateQueryEmbedding(query);
            // Build filter for user's documents
            const filter = {};
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
            const results = searchResponse.matches
                ?.filter(match => match.score && match.score >= scoreThreshold)
                .map(match => ({
                id: match.id,
                content: match.metadata?.content || '',
                score: match.score,
                metadata: {
                    documentId: match.metadata?.documentId,
                    documentName: match.metadata?.documentName,
                    chunkIndex: match.metadata?.chunkIndex,
                    tokenCount: match.metadata?.tokenCount,
                },
            })) || [];
            // Log search query
            if (userId) {
                await index_1.prisma.searchQuery.create({
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
                }).catch((error) => {
                    logger_1.logger.warn('Failed to log search query:', error);
                });
            }
            return results;
        }
        catch (error) {
            logger_1.logger.error('Error searching documents:', error);
            throw error;
        }
    }
    /**
     * Delete embeddings for a document
     */
    async deleteDocumentEmbeddings(documentId) {
        try {
            const chunks = await index_1.prisma.documentChunk.findMany({
                where: { documentId },
            });
            if (chunks.length === 0) {
                return;
            }
            const index = this.pinecone.index(this.indexName);
            const vectorIds = chunks.map((chunk) => chunk.pineconeId);
            await index.deleteMany(vectorIds);
            logger_1.logger.info(`Deleted ${vectorIds.length} vectors for document ${documentId}`);
        }
        catch (error) {
            logger_1.logger.error('Error deleting embeddings:', error);
            throw error;
        }
    }
    /**
     * Get index statistics
     */
    async getIndexStats() {
        try {
            const index = this.pinecone.index(this.indexName);
            return await index.describeIndexStats();
        }
        catch (error) {
            logger_1.logger.error('Error getting index stats:', error);
            throw error;
        }
    }
}
exports.SearchService = SearchService;
//# sourceMappingURL=search.js.map