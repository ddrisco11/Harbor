import express from 'express';
import { prisma } from '../index';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/users/profile - Get current user profile
 */
router.get('/profile', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      lastLogin: true,
      _count: {
        select: {
          documents: true,
          pdfTemplates: true,
          searchQueries: true,
        },
      },
    },
  });
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({ user });
}));

/**
 * PUT /api/users/profile - Update user profile
 */
router.put('/profile', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { name } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { name: name.trim() },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
    },
  });
  
  res.json({ user: updatedUser });
}));

/**
 * GET /api/users - Get all users (admin only)
 */
router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      lastLogin: true,
      _count: {
        select: {
          documents: true,
          pdfTemplates: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: Number(limit),
    skip: (Number(page) - 1) * Number(limit),
  });
  
  const total = await prisma.user.count();
  
  res.json({
    users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}));

export default router; 