"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
/**
 * GET /api/dashboard/test - Test endpoint with mock data (no auth required)
 */
router.get('/test', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Return mock data to test the frontend
    const mockStats = {
        totalDocuments: 42,
        totalTemplates: 5,
        recentSearches: 18,
        templatesUsedThisWeek: 3,
        documentsIndexedToday: 7,
        lastSyncTime: new Date().toISOString()
    };
    const mockActivity = [
        {
            id: 'test_1',
            type: 'search',
            title: 'Searched for "quarterly reports"',
            description: 'Found 12 results',
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
            metadata: { query: 'quarterly reports', resultCount: 12 }
        },
        {
            id: 'test_2',
            type: 'template_fill',
            title: 'Filled template "Invoice Template"',
            description: 'Generated PDF document',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
            metadata: { templateName: 'Invoice Template', status: 'COMPLETED' }
        },
        {
            id: 'test_3',
            type: 'document_upload',
            title: 'Document synced from Drive',
            description: 'Annual Report 2023.pdf',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
            metadata: { documentName: 'Annual Report 2023.pdf', processed: true }
        }
    ];
    if (req.path.includes('/stats')) {
        res.json(mockStats);
    }
    else {
        res.json(mockActivity);
    }
}));
// Apply auth middleware to all authenticated routes
router.use(auth_1.authMiddleware);
/**
 * GET /api/dashboard/stats - Get dashboard statistics
 */
router.get('/stats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    try {
        // Get total documents count
        const totalDocuments = await index_1.prisma.document.count({
            where: { userId }
        });
        // Get total templates count
        const totalTemplates = await index_1.prisma.pdfTemplate.count({
            where: { userId }
        });
        // Get recent searches count (last 7 days)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const recentSearches = await index_1.prisma.searchQuery.count({
            where: {
                userId,
                createdAt: {
                    gte: oneWeekAgo
                }
            }
        });
        // Get templates used this week
        const templatesUsedThisWeek = await index_1.prisma.pdfGeneration.count({
            where: {
                userId,
                createdAt: {
                    gte: oneWeekAgo
                }
            }
        });
        // Get documents indexed today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const documentsIndexedToday = await index_1.prisma.document.count({
            where: {
                userId,
                processedAt: {
                    gte: today,
                    lt: tomorrow
                }
            }
        });
        // Get last sync time
        const lastSync = await index_1.prisma.syncJob.findFirst({
            where: {
                userId,
                status: 'COMPLETED'
            },
            orderBy: {
                completedAt: 'desc'
            }
        });
        const stats = {
            totalDocuments,
            totalTemplates,
            recentSearches,
            templatesUsedThisWeek,
            documentsIndexedToday,
            lastSyncTime: lastSync?.completedAt?.toISOString() || new Date().toISOString()
        };
        res.json(stats);
    }
    catch (error) {
        logger_1.logger.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
}));
/**
 * GET /api/dashboard/activity - Get recent activity
 */
router.get('/activity', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    try {
        const activities = [];
        // Get recent searches
        const recentSearches = await index_1.prisma.searchQuery.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: Math.ceil(limit / 4), // Take a portion of the limit
            select: {
                id: true,
                query: true,
                createdAt: true,
                resultCount: true
            }
        });
        recentSearches.forEach(search => {
            activities.push({
                id: `search_${search.id}`,
                type: 'search',
                title: `Searched for "${search.query}"`,
                description: `Found ${search.resultCount} results`,
                timestamp: search.createdAt.toISOString(),
                metadata: { query: search.query, resultCount: search.resultCount }
            });
        });
        // Get recent template fills
        const recentFills = await index_1.prisma.pdfGeneration.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: Math.ceil(limit / 4),
            include: {
                template: {
                    select: { name: true }
                }
            }
        });
        recentFills.forEach(fill => {
            activities.push({
                id: `fill_${fill.id}`,
                type: 'template_fill',
                title: `Filled template "${fill.template.name}"`,
                description: fill.status === 'COMPLETED' ?
                    `Generated PDF document` :
                    `Status: ${fill.status}`,
                timestamp: fill.createdAt.toISOString(),
                metadata: { templateName: fill.template.name, status: fill.status }
            });
        });
        // Get recent document uploads/syncs
        const recentDocuments = await index_1.prisma.document.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: Math.ceil(limit / 4),
            select: {
                id: true,
                name: true,
                createdAt: true,
                processedAt: true,
                status: true
            }
        });
        recentDocuments.forEach(doc => {
            activities.push({
                id: `doc_${doc.id}`,
                type: 'document_upload',
                title: `Document synced from Drive`,
                description: doc.name,
                timestamp: doc.createdAt.toISOString(),
                metadata: { documentName: doc.name, processed: !!doc.processedAt, status: doc.status }
            });
        });
        // Get recent sync jobs
        const recentSyncs = await index_1.prisma.syncJob.findMany({
            where: { userId },
            orderBy: { startedAt: 'desc' },
            take: Math.ceil(limit / 4)
        });
        recentSyncs.forEach(sync => {
            activities.push({
                id: `sync_${sync.id}`,
                type: 'sync',
                title: 'Google Drive sync',
                description: sync.status === 'COMPLETED' ?
                    'Sync completed successfully' :
                    `Sync ${sync.status.toLowerCase()}`,
                timestamp: (sync.startedAt || sync.completedAt || new Date()).toISOString(),
                metadata: { status: sync.status, jobType: sync.jobType }
            });
        });
        // Sort all activities by timestamp and limit
        const sortedActivities = activities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);
        res.json(sortedActivities);
    }
    catch (error) {
        logger_1.logger.error('Dashboard activity error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard activity' });
    }
}));
exports.default = router;
//# sourceMappingURL=dashboard.js.map