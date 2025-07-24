"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const services_1 = require("../services");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});
// Apply auth middleware to all routes
router.use(auth_1.authMiddleware);
/**
 * GET /api/pdf/templates - Get user's PDF templates
 */
router.get('/templates', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    // This would query the database for templates
    res.json({ templates: [] });
}));
/**
 * POST /api/pdf/templates - Upload new PDF template
 */
router.post('/templates', upload.single('template'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { name, description } = req.body;
    if (!req.file) {
        return res.status(400).json({ error: 'PDF template file is required' });
    }
    if (!name) {
        return res.status(400).json({ error: 'Template name is required' });
    }
    try {
        const templateId = await services_1.pdfService.createTemplate(userId, name, description || '', req.file.path);
        res.json({ templateId, message: 'Template uploaded successfully' });
    }
    catch (error) {
        logger_1.logger.error('Template upload error:', error);
        res.status(500).json({ error: 'Template upload failed' });
    }
}));
/**
 * POST /api/pdf/fill - Fill PDF template
 */
router.post('/fill', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { templateId, formData, searchQuery, useAI = false } = req.body;
    if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' });
    }
    try {
        let llmCompletions;
        if (useAI && searchQuery) {
            // Search for relevant documents
            const searchResults = await services_1.searchService.search(searchQuery, {
                userId,
                topK: 5,
            });
            // Generate AI completions
            llmCompletions = await services_1.pdfService.generateCompletions(templateId, formData || {}, searchResults);
        }
        // Fill the PDF template
        const filledPdfPath = await services_1.pdfService.fillTemplate(templateId, formData || {}, llmCompletions);
        // Return the file for download
        res.download(filledPdfPath, (err) => {
            if (err) {
                logger_1.logger.error('File download error:', err);
                res.status(500).json({ error: 'File download failed' });
            }
        });
    }
    catch (error) {
        logger_1.logger.error('PDF fill error:', error);
        res.status(500).json({ error: 'PDF filling failed' });
    }
}));
/**
 * GET /api/pdf/templates/:id - Get template details
 */
router.get('/templates/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    try {
        const template = await services_1.pdfService.getTemplate(id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        res.json({ template });
    }
    catch (error) {
        logger_1.logger.error('Template fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
}));
exports.default = router;
//# sourceMappingURL=pdf.js.map