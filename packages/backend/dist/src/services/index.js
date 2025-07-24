"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfService = exports.searchService = exports.embeddingService = exports.googleDriveService = void 0;
exports.initializeServices = initializeServices;
const logger_1 = require("../utils/logger");
const googleDrive_1 = require("./googleDrive");
const embedding_1 = require("./embedding");
const search_1 = require("./search");
const pdf_1 = require("./pdf");
async function initializeServices() {
    try {
        logger_1.logger.info('Initializing services...');
        // Initialize Google Drive service
        exports.googleDriveService = new googleDrive_1.GoogleDriveService();
        // Initialize embedding service
        exports.embeddingService = new embedding_1.EmbeddingService();
        await exports.embeddingService.initialize();
        // Initialize search service
        exports.searchService = new search_1.SearchService();
        await exports.searchService.initialize();
        // Initialize PDF service
        exports.pdfService = new pdf_1.PdfService();
        logger_1.logger.info('All services initialized successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize services:', error);
        throw error;
    }
}
//# sourceMappingURL=index.js.map