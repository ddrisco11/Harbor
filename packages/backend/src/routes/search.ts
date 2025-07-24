import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';
import { searchService } from '../services';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * POST /api/search - Search documents
 */
router.post('/', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { query, topK = 10, scoreThreshold = 0.7 } = req.body;
  
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  try {
    const results = await searchService.search(query.trim(), {
      topK: Number(topK),
      scoreThreshold: Number(scoreThreshold),
      userId,
    });
    
    res.json({
      query: query.trim(),
      results,
      metadata: {
        totalResults: results.length,
        topK: Number(topK),
        scoreThreshold: Number(scoreThreshold),
      },
    });
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
}));

/**
 * GET /api/search/suggestions - Get search suggestions
 */
router.get('/suggestions', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { q } = req.query;
  
  if (!q || typeof q !== 'string') {
    return res.json({ suggestions: [] });
  }
  
  // For now, return empty suggestions
  // In a full implementation, you might use recent searches or common queries
  res.json({ suggestions: [] });
}));

export default router; 