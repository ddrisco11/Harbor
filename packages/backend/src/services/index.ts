import { logger } from '../utils/logger';
import { GoogleDriveService } from './googleDrive';
import { EmbeddingService } from './embedding';
import { SearchService } from './search';
import { PdfService } from './pdf';

export let googleDriveService: GoogleDriveService;
export let embeddingService: EmbeddingService;
export let searchService: SearchService;
export let pdfService: PdfService;

export async function initializeServices(): Promise<void> {
  try {
    logger.info('Initializing services...');

    // Initialize Google Drive service
    googleDriveService = new GoogleDriveService();
    
    // Initialize embedding service
    embeddingService = new EmbeddingService();
    await embeddingService.initialize();
    
    // Initialize search service
    searchService = new SearchService();
    await searchService.initialize();
    
    // Initialize PDF service
    pdfService = new PdfService();
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
} 