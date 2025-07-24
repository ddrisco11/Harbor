"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const services_1 = require("../services");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
// Apply auth middleware to all routes
router.use(auth_1.authMiddleware);
/**
 * POST /api/search - Search documents
 */
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { query, topK = 10, scoreThreshold = 0.7 } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({ error: 'Query is required' });
    }
    try {
        const results = await services_1.searchService.search(query.trim(), {
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
    }
    catch (error) {
        logger_1.logger.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
}));
/**
 * GET /api/search/suggestions - Get search suggestions
 */
router.get('/suggestions', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        return res.json({ suggestions: [] });
    }
    // For now, return empty suggestions
    // In a full implementation, you might use recent searches or common queries
    res.json({ suggestions: [] });
}));
exports.default = router;
//# sourceMappingURL=search.js.map