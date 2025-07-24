import express from 'express';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// Google OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * Generate JWT tokens
 */
function generateTokens(userId: string) {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
}

/**
 * GET /api/auth/google - Get Google OAuth URL
 */
router.get('/google', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/drive.readonly',
  ];
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
  
  res.json({ authUrl });
});

/**
 * POST /api/auth/google/callback - Handle Google OAuth callback
 */
router.post('/google/callback', asyncHandler(async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }
  
  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    const { id: googleId, email, name, picture } = userInfo.data;
    
    if (!googleId || !email) {
      return res.status(400).json({ error: 'Failed to get user information from Google' });
    }
    
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { googleId },
    });
    
    if (!user) {
      // Create new user
              user = await prisma.user.create({
          data: {
            googleId,
            email,
            name: name || email,
            avatarUrl: picture,
            googleTokens: tokens as any,
            lastLogin: new Date(),
          },
        });
      
      logger.info(`New user created: ${email}`);
    } else {
      // Update existing user
              user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleTokens: tokens as any,
            lastLogin: new Date(),
            avatarUrl: picture,
            name: name || user.name,
          },
        });
      
      logger.info(`User logged in: ${email}`);
    }
    
    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(user.id);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}));

/**
 * POST /api/auth/refresh - Refresh access token
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    
    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Generate new tokens
    const tokens = generateTokens(user.id);
    
    res.json(tokens);
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}));

/**
 * POST /api/auth/logout - Logout user
 */
router.post('/logout', asyncHandler(async (req, res) => {
  // In a more sophisticated setup, you would maintain a blacklist of tokens
  // For now, we'll just respond with success
  res.json({ message: 'Logged out successfully' });
}));

/**
 * GET /api/auth/me - Get current user info
 */
router.get('/me', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (decoded.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        lastLogin: true,
      },
    });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid access token' });
  }
}));

export default router; 