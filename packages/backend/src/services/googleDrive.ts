import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { prisma } from '../index';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  modifiedTime: string;
  webViewLink: string;
  parents?: string[];
}

export class GoogleDriveService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Create authenticated Drive client for user
   */
  private getDriveClient(tokens: any): drive_v3.Drive {
    this.oauth2Client.setCredentials(tokens);
    return google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * List files from user's Drive with filters
   */
  async listFiles(
    userId: string,
    mimeTypes: string[] = ['application/pdf'],
    folderId?: string
  ): Promise<DriveFile[]> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');

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
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: file.size || '0',
        modifiedTime: file.modifiedTime!,
        webViewLink: file.webViewLink!,
        parents: file.parents ? file.parents : undefined,
      })) || [];
    } catch (error) {
      logger.error('Error listing Drive files:', error);
      throw error;
    }
  }

  /**
   * Download file from Drive
   */
  async downloadFile(userId: string, fileId: string, downloadPath: string): Promise<string> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');

      const drive = this.getDriveClient(user.googleTokens);
      
      // Ensure download directory exists
      const dir = path.dirname(downloadPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const response = await drive.files.get({
        fileId,
        alt: 'media',
      }, { responseType: 'stream' });

      const writeStream = fs.createWriteStream(downloadPath);
      response.data.pipe(writeStream);

      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => resolve(downloadPath));
        writeStream.on('error', reject);
      });
    } catch (error) {
      logger.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(userId: string, fileId: string): Promise<DriveFile> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');

      const drive = this.getDriveClient(user.googleTokens);
      
      const response = await drive.files.get({
        fileId,
        fields: 'id,name,mimeType,size,modifiedTime,webViewLink,parents',
      });

      const file = response.data;
      return {
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: file.size || '0',
        modifiedTime: file.modifiedTime!,
        webViewLink: file.webViewLink!,
        parents: file.parents ? file.parents : undefined,
      };
    } catch (error) {
      logger.error('Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Check if file has been modified since last sync
   */
  async hasFileChanged(userId: string, fileId: string, lastModified: Date): Promise<boolean> {
    try {
      const metadata = await this.getFileMetadata(userId, fileId);
      const driveModified = new Date(metadata.modifiedTime);
      return driveModified > lastModified;
    } catch (error) {
      logger.error('Error checking file changes:', error);
      return false;
    }
  }

  /**
   * Sync user's Drive files with database
   */
  async syncUserFiles(userId: string): Promise<void> {
    try {
      logger.info(`Starting Drive sync for user ${userId}`);
      
      const files = await this.listFiles(userId);
      
      for (const file of files) {
        // Check if file exists in database
        const existingDoc = await prisma.document.findUnique({
          where: { googleFileId: file.id }
        });

        if (existingDoc) {
          // Check if file was modified
          const driveModified = new Date(file.modifiedTime);
          if (driveModified > existingDoc.googleModifiedTime) {
            // Update existing document
            await prisma.document.update({
              where: { id: existingDoc.id },
              data: {
                name: file.name,
                mimeType: file.mimeType,
                fileSize: BigInt(file.size),
                googleModifiedTime: driveModified,
                status: 'PENDING',
              },
            });
            logger.info(`Updated document ${file.name}`);
          }
        } else {
          // Create new document
          await prisma.document.create({
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
          logger.info(`Added new document ${file.name}`);
        }
      }
      
      logger.info(`Drive sync completed for user ${userId}`);
    } catch (error) {
      logger.error('Error syncing Drive files:', error);
      throw error;
    }
  }
} 