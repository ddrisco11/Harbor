"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const googleapis_1 = require("googleapis");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
// Google OAuth2 configuration
const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
/**
 * Generate JWT tokens
 */
function generateTokens(userId) {
    const accessToken = jsonwebtoken_1.default.sign({ userId, type: 'access' }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jsonwebtoken_1.default.sign({ userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
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
 * GET /api/auth/google/redirect - Direct redirect to Google OAuth (server-side)
 * Alternative approach: use this for simple <a href="/api/auth/google/redirect">
 */
router.get('/google/redirect', (req, res) => {
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
    res.redirect(authUrl);
});
/**
 * POST /api/auth/google/callback - Handle Google OAuth callback
 */
router.post('/google/callback', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
    }
    try {
        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        // Get user info from Google
        const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const { id: googleId, email, name, picture } = userInfo.data;
        if (!googleId || !email) {
            return res.status(400).json({ error: 'Failed to get user information from Google' });
        }
        // Find or create user
        let user = await index_1.prisma.user.findUnique({
            where: { googleId },
        });
        if (!user) {
            // Create new user
            user = await index_1.prisma.user.create({
                data: {
                    googleId,
                    email,
                    name: name || email,
                    avatarUrl: picture,
                    googleTokens: tokens,
                    lastLogin: new Date(),
                },
            });
            logger_1.logger.info(`New user created: ${email}`);
        }
        else {
            // Update existing user
            user = await index_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    googleTokens: tokens,
                    lastLogin: new Date(),
                    avatarUrl: picture,
                    name: name || user.name,
                },
            });
            logger_1.logger.info(`User logged in: ${email}`);
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
    }
    catch (error) {
        logger_1.logger.error('OAuth callback error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}));
/**
 * POST /api/auth/refresh - Refresh access token
 */
router.post('/refresh', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        if (decoded.type !== 'refresh') {
            return res.status(401).json({ error: 'Invalid token type' });
        }
        // Verify user still exists
        const user = await index_1.prisma.user.findUnique({
            where: { id: decoded.userId },
        });
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        // Generate new tokens
        const tokens = generateTokens(user.id);
        res.json(tokens);
    }
    catch (error) {
        logger_1.logger.error('Token refresh error:', error);
        res.status(401).json({ error: 'Invalid refresh token' });
    }
}));
/**
 * POST /api/auth/logout - Logout user
 */
router.post('/logout', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // In a more sophisticated setup, you would maintain a blacklist of tokens
    // For now, we'll just respond with success
    res.json({ message: 'Logged out successfully' });
}));
/**
 * GET /api/auth/me - Get current user info
 */
router.get('/me', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access token required' });
    }
    const token = authHeader.substring(7);
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'access') {
            return res.status(401).json({ error: 'Invalid token type' });
        }
        const user = await index_1.prisma.user.findUnique({
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
    }
    catch (error) {
        logger_1.logger.error('Token verification error:', error);
        res.status(401).json({ error: 'Invalid access token' });
    }
}));
exports.default = router;
//# sourceMappingURL=auth.js.map