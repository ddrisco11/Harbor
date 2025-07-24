import express from 'express';
import { prisma } from '../index';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * GET /api/dashboard/test-stats - Test stats endpoint with mock data (no auth required)
 */
router.get('/test-stats', asyncHandler(async (req, res) => {
  const mockStats = {
    totalDocuments: 42,
    totalTemplates: 5,
    recentSearches: 18,
    templatesUsedThisWeek: 3,
    documentsIndexedToday: 7,
    lastSyncTime: new Date().toISOString()
  };
  res.json(mockStats);
}));

/**
 * GET /api/dashboard/test-activity - Test activity endpoint with mock data (no auth required)
 */
router.get('/test-activity', asyncHandler(async (req, res) => {
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
  res.json(mockActivity);
}));

// Apply auth middleware to all authenticated routes
router.use(authMiddleware);

/**
 * GET /api/dashboard/stats - Get dashboard statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  
  try {
    // Get total documents count
    const totalDocuments = await prisma.document.count({
      where: { userId }
    });
    
    // Get total templates count
    const totalTemplates = await prisma.pdfTemplate.count({
      where: { userId }
    });
    
    // Get recent searches count (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentSearches = await prisma.searchQuery.count({
      where: {
        userId,
        createdAt: {
          gte: oneWeekAgo
        }
      }
    });
    
    // Get templates used this week
    const templatesUsedThisWeek = await prisma.pdfGeneration.count({
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
    
    const documentsIndexedToday = await prisma.document.count({
      where: {
        userId,
        processedAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });
    
    // Get last sync time
    const lastSync = await prisma.syncJob.findFirst({
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
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
}));

/**
 * GET /api/dashboard/activity - Get recent activity
 */
router.get('/activity', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  
  try {
    const activities: Array<{
      id: string;
      type: 'search' | 'template_fill' | 'document_upload' | 'sync';
      title: string;
      description: string;
      timestamp: string;
      metadata?: Record<string, any>;
    }> = [];
    
    // Get recent searches
    const recentSearches = await prisma.searchQuery.findMany({
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
        type: 'search' as const,
        title: `Searched for "${search.query}"`,
        description: `Found ${search.resultCount} results`,
        timestamp: search.createdAt.toISOString(),
        metadata: { query: search.query, resultCount: search.resultCount }
      });
    });
    
    // Get recent template fills
    const recentFills = await prisma.pdfGeneration.findMany({
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
        type: 'template_fill' as const,
        title: `Filled template "${fill.template.name}"`,
        description: fill.status === 'COMPLETED' ? 
          `Generated PDF document` : 
          `Status: ${fill.status}`,
        timestamp: fill.createdAt.toISOString(),
        metadata: { templateName: fill.template.name, status: fill.status }
      });
    });
    
    // Get recent document uploads/syncs
    const recentDocuments = await prisma.document.findMany({
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
        type: 'document_upload' as const,
        title: `Document synced from Drive`,
        description: doc.name,
        timestamp: doc.createdAt.toISOString(),
        metadata: { documentName: doc.name, processed: !!doc.processedAt, status: doc.status }
      });
    });
    
    // Get recent sync jobs
    const recentSyncs = await prisma.syncJob.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: Math.ceil(limit / 4)
    });
    
    recentSyncs.forEach(sync => {
      activities.push({
        id: `sync_${sync.id}`,
        type: 'sync' as const,
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
  } catch (error) {
    logger.error('Dashboard activity error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard activity' });
  }
}));

export default router; 