import express from 'express';
import multer from 'multer';
import path from 'path';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';
import { pdfService, searchService } from '../services';
import { logger } from '../utils/logger';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/pdf/templates - Get user's PDF templates
 */
router.get('/templates', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  
  // This would query the database for templates
  res.json({ templates: [] });
}));

/**
 * POST /api/pdf/templates - Upload new PDF template
 */
router.post('/templates', upload.single('template'), asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { name, description } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ error: 'PDF template file is required' });
  }
  
  if (!name) {
    return res.status(400).json({ error: 'Template name is required' });
  }
  
  try {
    const templateId = await pdfService.createTemplate(
      userId,
      name,
      description || '',
      req.file.path
    );
    
    res.json({ templateId, message: 'Template uploaded successfully' });
  } catch (error) {
    logger.error('Template upload error:', error);
    res.status(500).json({ error: 'Template upload failed' });
  }
}));

/**
 * POST /api/pdf/fill - Fill PDF template
 */
router.post('/fill', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { templateId, formData, searchQuery, useAI = false } = req.body;
  
  if (!templateId) {
    return res.status(400).json({ error: 'Template ID is required' });
  }
  
  try {
    let llmCompletions;
    
    if (useAI && searchQuery) {
      // Search for relevant documents
      const searchResults = await searchService.search(searchQuery, {
        userId,
        topK: 5,
      });
      
      // Generate AI completions
      llmCompletions = await pdfService.generateCompletions(
        templateId,
        formData || {},
        searchResults
      );
    }
    
    // Fill the PDF template
    const filledPdfPath = await pdfService.fillTemplate(
      templateId,
      formData || {},
      llmCompletions
    );
    
    // Return the file for download
    res.download(filledPdfPath, (err) => {
      if (err) {
        logger.error('File download error:', err);
        res.status(500).json({ error: 'File download failed' });
      }
    });
  } catch (error) {
    logger.error('PDF fill error:', error);
    res.status(500).json({ error: 'PDF filling failed' });
  }
}));

/**
 * GET /api/pdf/templates/:id - Get template details
 */
router.get('/templates/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const template = await pdfService.getTemplate(id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({ template });
  } catch (error) {
    logger.error('Template fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
}));

export default router; 