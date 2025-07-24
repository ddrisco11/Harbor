"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Apply auth middleware to all routes
router.use(auth_1.authMiddleware);
/**
 * GET /api/users/profile - Get current user profile
 */
router.get('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const user = await index_1.prisma.user.findUnique({
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
router.put('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name is required' });
    }
    const updatedUser = await index_1.prisma.user.update({
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
router.get('/', auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const users = await index_1.prisma.user.findMany({
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
    const total = await index_1.prisma.user.count();
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
exports.default = router;
//# sourceMappingURL=users.js.map