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
export declare class SearchService {
    private pinecone;
    private indexName;
    private isAvailable;
    constructor();
    initialize(): Promise<void>;
    private waitForIndexReady;
    /**
     * Upsert embeddings to Pinecone
     */
    upsertEmbeddings(documentId: string): Promise<void>;
    /**
     * Search for similar documents
     */
    search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
    /**
     * Delete embeddings for a document
     */
    deleteDocumentEmbeddings(documentId: string): Promise<void>;
    /**
     * Get index statistics
     */
    getIndexStats(): Promise<any>;
}
//# sourceMappingURL=search.d.ts.map