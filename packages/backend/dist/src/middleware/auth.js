"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const errorHandler_1 = require("./errorHandler");
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new errorHandler_1.AppError('Access token required', 401);
        }
        const token = authHeader.substring(7);
        // Verify JWT token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'access') {
            throw new errorHandler_1.AppError('Invalid token type', 401);
        }
        // Get user from database
        const user = await index_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });
        if (!user) {
            throw new errorHandler_1.AppError('User not found', 401);
        }
        // Attach user to request
        req.user = user;
        next();
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError) {
            next(error);
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new errorHandler_1.AppError('Invalid token', 401));
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next(new errorHandler_1.AppError('Token expired', 401));
        }
        else {
            next(new errorHandler_1.AppError('Authentication failed', 401));
        }
    }
};
exports.authMiddleware = authMiddleware;
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        next(new errorHandler_1.AppError('Authentication required', 401));
        return;
    }
    if (req.user.role !== 'ADMIN') {
        next(new errorHandler_1.AppError('Admin access required', 403));
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
//# sourceMappingURL=auth.js.map