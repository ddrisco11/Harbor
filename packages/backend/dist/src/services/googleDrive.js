"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleDriveService = void 0;
const googleapis_1 = require("googleapis");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const index_1 = require("../index");
class GoogleDriveService {
    constructor() {
        this.oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
    }
    /**
     * Create authenticated Drive client for user
     */
    getDriveClient(tokens) {
        this.oauth2Client.setCredentials(tokens);
        return googleapis_1.google.drive({ version: 'v3', auth: this.oauth2Client });
    }
    /**
     * List files from user's Drive with filters
     */
    async listFiles(userId, mimeTypes = ['application/pdf'], folderId) {
        try {
            const user = await index_1.prisma.user.findUnique({ where: { id: userId } });
            if (!user)
                throw new Error('User not found');
            const drive = this.getDriveClient(user.googleTokens);
            // Build query
            let query = `trashed=false`;
            if (mimeTypes.length > 0) {
                const mimeQuery = mimeTypes.map(type => `mimeType='${type}'`).join(' or ');
                query += ` and (${mimeQuery})`;
            }
            if (folderId) {
                query += ` and '${folderId}' in parents`;
            }
            const response = await drive.files.list({
                q: query,
                fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,parents)',
                pageSize: 100,
            });
            return response.data.files?.map(file => ({
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                size: file.size || '0',
                modifiedTime: file.modifiedTime,
                webViewLink: file.webViewLink,
                parents: file.parents ? file.parents : undefined,
            })) || [];
        }
        catch (error) {
            logger_1.logger.error('Error listing Drive files:', error);
            throw error;
        }
    }
    /**
     * Download file from Drive
     */
    async downloadFile(userId, fileId, downloadPath) {
        try {
            const user = await index_1.prisma.user.findUnique({ where: { id: userId } });
            if (!user)
                throw new Error('User not found');
            const drive = this.getDriveClient(user.googleTokens);
            // Ensure download directory exists
            const dir = path_1.default.dirname(downloadPath);
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            const response = await drive.files.get({
                fileId,
                alt: 'media',
            }, { responseType: 'stream' });
            const writeStream = fs_1.default.createWriteStream(downloadPath);
            response.data.pipe(writeStream);
            return new Promise((resolve, reject) => {
                writeStream.on('finish', () => resolve(downloadPath));
                writeStream.on('error', reject);
            });
        }
        catch (error) {
            logger_1.logger.error('Error downloading file:', error);
            throw error;
        }
    }
    /**
     * Get file metadata
     */
    async getFileMetadata(userId, fileId) {
        try {
            const user = await index_1.prisma.user.findUnique({ where: { id: userId } });
            if (!user)
                throw new Error('User not found');
            const drive = this.getDriveClient(user.googleTokens);
            const response = await drive.files.get({
                fileId,
                fields: 'id,name,mimeType,size,modifiedTime,webViewLink,parents',
            });
            const file = response.data;
            return {
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                size: file.size || '0',
                modifiedTime: file.modifiedTime,
                webViewLink: file.webViewLink,
                parents: file.parents ? file.parents : undefined,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting file metadata:', error);
            throw error;
        }
    }
    /**
     * Check if file has been modified since last sync
     */
    async hasFileChanged(userId, fileId, lastModified) {
        try {
            const metadata = await this.getFileMetadata(userId, fileId);
            const driveModified = new Date(metadata.modifiedTime);
            return driveModified > lastModified;
        }
        catch (error) {
            logger_1.logger.error('Error checking file changes:', error);
            return false;
        }
    }
    /**
     * Sync user's Drive files with database
     */
    async syncUserFiles(userId) {
        try {
            logger_1.logger.info(`Starting Drive sync for user ${userId}`);
            const files = await this.listFiles(userId);
            for (const file of files) {
                // Check if file exists in database
                const existingDoc = await index_1.prisma.document.findUnique({
                    where: { googleFileId: file.id }
                });
                if (existingDoc) {
                    // Check if file was modified
                    const driveModified = new Date(file.modifiedTime);
                    if (driveModified > existingDoc.googleModifiedTime) {
                        // Update existing document
                        await index_1.prisma.document.update({
                            where: { id: existingDoc.id },
                            data: {
                                name: file.name,
                                mimeType: file.mimeType,
                                fileSize: BigInt(file.size),
                                googleModifiedTime: driveModified,
                                status: 'PENDING',
                            },
                        });
                        logger_1.logger.info(`Updated document ${file.name}`);
                    }
                }
                else {
                    // Create new document
                    await index_1.prisma.document.create({
                        data: {
                            userId,
                            googleFileId: file.id,
                            name: file.name,
                            mimeType: file.mimeType,
                            fileSize: BigInt(file.size),
                            googleModifiedTime: new Date(file.modifiedTime),
                            status: 'PENDING',
                            metadata: {
                                webViewLink: file.webViewLink,
                                parents: file.parents,
                            },
                        },
                    });
                    logger_1.logger.info(`Added new document ${file.name}`);
                }
            }
            logger_1.logger.info(`Drive sync completed for user ${userId}`);
        }
        catch (error) {
            logger_1.logger.error('Error syncing Drive files:', error);
            throw error;
        }
    }
}
exports.GoogleDriveService = GoogleDriveService;
//# sourceMappingURL=googleDrive.js.map