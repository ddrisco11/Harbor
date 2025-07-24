"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const services_1 = require("../services");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
// Apply auth middleware to all routes
router.use(auth_1.authMiddleware);
/**
 * GET /api/documents - Get user's documents
 */
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { status, search, limit = 20, offset = 0 } = req.query;
    const where = { userId };
    if (status)
        where.status = status;
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
        ];
    }
    const documents = await index_1.prisma.document.findMany({
        where,
        include: {
            _count: {
                select: { chunks: true },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
    });
    const total = await index_1.prisma.document.count({ where });
    res.json({
        documents,
        pagination: {
            total,
            limit: Number(limit),
            offset: Number(offset),
            hasMore: Number(offset) + Number(limit) < total,
        },
    });
}));
/**
 * GET /api/documents/:id - Get document by ID
 */
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const document = await index_1.prisma.document.findFirst({
        where: { id, userId },
        include: {
            chunks: {
                orderBy: { chunkIndex: 'asc' },
            },
        },
    });
    if (!document) {
        return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ document });
}));
/**
 * POST /api/documents/sync - Sync with Google Drive
 */
router.post('/sync', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    try {
        // Create sync job
        const syncJob = await index_1.prisma.syncJob.create({
            data: {
                userId,
                jobType: 'DRIVE_SYNC',
                status: 'RUNNING',
                startedAt: new Date(),
            },
        });
        // Start sync process (this would typically be queued)
        await services_1.googleDriveService.syncUserFiles(userId);
        // Update sync job
        await index_1.prisma.syncJob.update({
            where: { id: syncJob.id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
            },
        });
        res.json({ message: 'Sync completed successfully', jobId: syncJob.id });
    }
    catch (error) {
        logger_1.logger.error('Sync error:', error);
        res.status(500).json({ error: 'Sync failed' });
    }
}));
/**
 * POST /api/documents/:id/process - Process document for embeddings
 */
router.post('/:id/process', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const document = await index_1.prisma.document.findFirst({
        where: { id, userId },
    });
    if (!document) {
        return res.status(404).json({ error: 'Document not found' });
    }
    if (document.status === 'PROCESSING') {
        return res.status(409).json({ error: 'Document is already being processed' });
    }
    // This would typically be queued for background processing
    res.json({ message: 'Document processing started' });
}));
/**
 * DELETE /api/documents/:id - Delete document
 */
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const document = await index_1.prisma.document.findFirst({
        where: { id, userId },
    });
    if (!document) {
        return res.status(404).json({ error: 'Document not found' });
    }
    // Delete document and related chunks (cascade)
    await index_1.prisma.document.delete({
        where: { id },
    });
    res.json({ message: 'Document deleted successfully' });
}));
exports.default = router;
//# sourceMappingURL=documents.js.map