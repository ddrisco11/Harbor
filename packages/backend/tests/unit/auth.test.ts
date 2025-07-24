import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import authRoutes from '../../src/routes/auth';

// Mock Prisma
jest.mock('@prisma/client');
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

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
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/auth/google', () => {
    it('should return Google OAuth URL', async () => {
      const response = await request(app)
        .get('/api/auth/google')
        .expect(200);

      expect(response.body).toHaveProperty('authUrl');
      expect(response.body.authUrl).toContain('http://mock-auth-url');
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
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      // Mock user creation
      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/google/callback')
        .send({ code: 'mock-auth-code' })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return error for missing authorization code', async () => {
      const response = await request(app)
        .post('/api/auth/google/callback')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Authorization code is required');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return error for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Refresh token is required');
    });
  });
}); 