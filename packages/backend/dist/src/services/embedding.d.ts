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
export declare class EmbeddingService {
    private openai;
    private readonly CHUNK_SIZE;
    private readonly CHUNK_OVERLAP;
    constructor();
    initialize(): Promise<void>;
    /**
     * Extract text from PDF file
     */
    extractTextFromPdf(filePath: string): Promise<string>;
    /**
     * Split text into chunks with overlap
     */
    splitTextIntoChunks(text: string): TextChunk[];
    /**
     * Generate embeddings for text chunks
     */
    generateEmbeddings(chunks: TextChunk[]): Promise<EmbeddingChunk[]>;
    /**
     * Process document and generate embeddings
     */
    processDocument(documentId: string): Promise<void>;
    /**
     * Generate embedding for search query
     */
    generateQueryEmbedding(query: string): Promise<number[]>;
}
//# sourceMappingURL=embedding.d.ts.map