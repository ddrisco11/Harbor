import express from 'express';
import { prisma } from '../index';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';
import { googleDriveService } from '../services';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/documents - Get user's documents
 */
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { status, search, limit = 20, offset = 0 } = req.query;
  
  const where: any = { userId };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
    ];
  }
  
  const documents = await prisma.document.findMany({
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
  
  const total = await prisma.document.count({ where });
  
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
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  const document = await prisma.document.findFirst({
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
router.post('/sync', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  
  try {
    // Create sync job
    const syncJob = await prisma.syncJob.create({
      data: {
        userId,
        jobType: 'DRIVE_SYNC',
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });
    
    // Start sync process (this would typically be queued)
    await googleDriveService.syncUserFiles(userId);
    
    // Update sync job
    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
    
    res.json({ message: 'Sync completed successfully', jobId: syncJob.id });
  } catch (error) {
    logger.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
}));

/**
 * POST /api/documents/:id/process - Process document for embeddings
 */
router.post('/:id/process', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  const document = await prisma.document.findFirst({
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
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  const document = await prisma.document.findFirst({
    where: { id, userId },
  });
  
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  // Delete document and related chunks (cascade)
  await prisma.document.delete({
    where: { id },
  });
  
  res.json({ message: 'Document deleted successfully' });
}));

export default router; 