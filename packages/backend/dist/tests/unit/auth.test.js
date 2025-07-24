"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../src/routes/auth"));
// Mock Prisma
jest.mock('@prisma/client');
const mockPrisma = {
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
};
// Mock Google APIs
jest.mock('googleapis', () => ({
    google: {
        auth: {
            OAuth2: jest.fn().mockImplementation(() => ({
                generateAuthUrl: jest.fn().mockReturnValue('http://mock-auth-url'),
                getAccessToken: jest.fn().mockResolvedValue({
                    tokens: { access_token: 'mock-token' },
                }),
                setCredentials: jest.fn(),
            })),
        },
        oauth2: jest.fn().mockReturnValue({
            userinfo: {
                get: jest.fn().mockResolvedValue({
                    data: {
                        id: 'google-123',
                        email: 'test@example.com',
                        name: 'Test User',
                        picture: 'http://example.com/avatar.jpg',
                    },
                }),
            },
        }),
    },
}));
describe('Auth Routes', () => {
    let app;
    beforeAll(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/auth', auth_1.default);
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('GET /api/auth/google', () => {
        it('should return Google OAuth URL', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/google')
                .expect(200);
            expect(response.body).toHaveProperty('authUrl');
            expect(response.body.authUrl).toContain('http://mock-auth-url');
        });
    });
    describe('GET /api/auth/google/redirect', () => {
        it('should redirect to Google OAuth URL', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/google/redirect')
                .expect(302);
            expect(response.headers.location).toContain('http://mock-auth-url');
        });
    });
    describe('POST /api/auth/google/callback', () => {
        it('should create new user and return tokens', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                role: 'USER',
                avatarUrl: 'http://example.com/avatar.jpg',
            };
            // Mock user not found initially
            mockPrisma.user.findUnique.mockResolvedValue(null);
            // Mock user creation
            mockPrisma.user.create.mockResolvedValue(mockUser);
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/google/callback')
                .send({ code: 'mock-auth-code' })
                .expect(200);
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('accessToken');
            expect(response.body).toHaveProperty('refreshToken');
            expect(response.body.user.email).toBe('test@example.com');
        });
        it('should return error for missing authorization code', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/google/callback')
                .send({})
                .expect(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Authorization code is required');
        });
    });
    describe('POST /api/auth/refresh', () => {
        it('should return error for missing refresh token', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/refresh')
                .send({})
                .expect(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Refresh token is required');
        });
    });
});
//# sourceMappingURL=auth.test.js.map