export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    size: string;
    modifiedTime: string;
    webViewLink: string;
    parents?: string[];
}
export declare class GoogleDriveService {
    private oauth2Client;
    constructor();
    /**
     * Create authenticated Drive client for user
     */
    private getDriveClient;
    /**
     * List files from user's Drive with filters
     */
    listFiles(userId: string, mimeTypes?: string[], folderId?: string): Promise<DriveFile[]>;
    /**
     * Download file from Drive
     */
    downloadFile(userId: string, fileId: string, downloadPath: string): Promise<string>;
    /**
     * Get file metadata
     */
    getFileMetadata(userId: string, fileId: string): Promise<DriveFile>;
    /**
     * Check if file has been modified since last sync
     */
    hasFileChanged(userId: string, fileId: string, lastModified: Date): Promise<boolean>;
    /**
     * Sync user's Drive files with database
     */
    syncUserFiles(userId: string): Promise<void>;
}
//# sourceMappingURL=googleDrive.d.ts.map