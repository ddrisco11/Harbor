# Harbor

A production-ready document management and PDF filling application that integrates with Google Drive, provides AI-powered document search, and enables intelligent PDF form completion.

## 🚀 Features

### Authentication & Drive Integration
- **Google OAuth2** authentication with automatic token refresh
- **Google Drive sync** with selective file download and change detection
- **Background monitoring** for new and updated documents

### Document Processing & Search
- **PDF text extraction** using advanced parsing libraries
- **OpenAI embeddings** generation for semantic search
- **Pinecone vector database** for high-performance similarity search
- **Natural language queries** with relevance scoring

### AI-Powered PDF Filling
- **PDF template management** with automatic field detection
- **LLM-powered form completion** using document context
- **Dynamic field mapping** and validation
- **Real-time preview** and download functionality

### Enterprise Features
- **JWT authentication** with role-based access control
- **Rate limiting** and security middleware
- **Comprehensive logging** and error handling
- **Docker containerization** for easy deployment
- **Background job processing** with Redis queues

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React SPA     │    │   Express API    │    │  Background     │
│  (Frontend)     │◄──►│   (Backend)      │◄──►│   Workers       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌────────▼────────┐             │
         │              │   PostgreSQL    │             │
         │              │   (Database)    │             │
         │              └─────────────────┘             │
         │                       │                       │
    ┌────▼─────┐        ┌────────▼────────┐    ┌────────▼────────┐
    │ Google   │        │    Pinecone     │    │     Redis       │
    │ Drive    │        │ (Vector Search) │    │  (Job Queue)    │
    │   API    │        └─────────────────┘    └─────────────────┘
    └──────────┘                 │
                        ┌────────▼────────┐
                        │     OpenAI      │
                        │  (Embeddings)   │
                        └─────────────────┘
```

## 📁 Project Structure

```
Harbor/
├── package.json                 # Root workspace configuration
├── docker-compose.yml          # Multi-service Docker setup
├── README.md                   # This file
├── .github/
│   └── workflows/              # GitHub Actions CI/CD
├── packages/
│   ├── backend/                # Node.js + TypeScript API
│   │   ├── src/
│   │   │   ├── controllers/    # Request handlers
│   │   │   ├── services/       # Business logic
│   │   │   │   ├── googleDrive.ts    # Google Drive integration
│   │   │   │   ├── embedding.ts      # OpenAI embeddings
│   │   │   │   ├── search.ts         # Pinecone search
│   │   │   │   ├── pdf.ts            # PDF processing
│   │   │   │   └── index.ts          # Service initialization
│   │   │   ├── middleware/     # Auth, error handling
│   │   │   │   ├── auth.ts           # JWT authentication
│   │   │   │   └── errorHandler.ts   # Global error handling
│   │   │   ├── routes/         # API endpoints
│   │   │   │   ├── auth.ts           # Authentication routes
│   │   │   │   ├── documents.ts      # Document management
│   │   │   │   ├── search.ts         # Search endpoints
│   │   │   │   ├── pdf.ts            # PDF operations
│   │   │   │   └── users.ts          # User management
│   │   │   ├── utils/          # Utilities
│   │   │   │   └── logger.ts         # Winston logging
│   │   │   ├── workers/        # Background jobs
│   │   │   └── index.ts        # Express server
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Database schema
│   │   ├── tests/              # Test suites
│   │   ├── package.json        # Backend dependencies
│   │   ├── tsconfig.json       # TypeScript config
│   │   ├── Dockerfile          # Container configuration
│   │   └── env.example         # Environment variables
│   └── frontend/               # React + TypeScript SPA
│       ├── src/
│       │   ├── components/     # React components
│       │   ├── pages/          # Route components
│       │   ├── hooks/          # Custom React hooks
│       │   ├── services/       # API clients
│       │   └── types/          # TypeScript definitions
│       ├── tests/              # Frontend tests
│       ├── package.json        # Frontend dependencies
│       └── vite.config.ts      # Build configuration
└── docker/                     # Docker configurations
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with helmet, CORS, rate limiting
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Google OAuth2
- **Vector Search**: Pinecone with OpenAI embeddings
- **PDF Processing**: pdf-lib and pdf-parse
- **Background Jobs**: Bull with Redis
- **Logging**: Winston with structured logging

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with hot module replacement
- **Styling**: Tailwind CSS with design tokens
- **State Management**: React Query for server state
- **Testing**: React Testing Library with MSW

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Health checks and structured logging

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 15+
- Redis 7+
- Docker and Docker Compose (optional)

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Harbor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp packages/backend/env.example packages/backend/.env
   # Edit .env with your API keys and configuration
   ```

4. **Set up the database**
   ```bash
   cd packages/backend
   npx prisma migrate dev
   npx prisma generate
   ```

### Development Mode

**Option 1: Local Development**
```bash
npm run dev
```

**Option 2: Docker Development**
```bash
npm run docker:up
```

This starts:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Database: localhost:5432
- Redis: localhost:6379

### Required API Keys

Create accounts and obtain API keys for:

1. **Google Cloud Console**
   - Enable Google Drive API and OAuth2
   - Create OAuth2 credentials
   - Set redirect URI: `http://localhost:3001/api/auth/google/callback`

2. **OpenAI Platform**
   - Create API key with GPT-4 and embeddings access

3. **Pinecone**
   - Create project and get API key
   - Note your environment (e.g., us-east-1-aws)

## 📚 API Documentation

### Authentication Endpoints

```typescript
POST /api/auth/google/callback    # Complete OAuth flow
POST /api/auth/refresh           # Refresh access token
GET  /api/auth/me               # Get current user
POST /api/auth/logout           # Logout user
```

### Document Management

```typescript
GET    /api/documents           # List user documents
GET    /api/documents/:id       # Get document details
POST   /api/documents/sync      # Sync with Google Drive
POST   /api/documents/:id/process # Process for embeddings
DELETE /api/documents/:id       # Delete document
```

### Search & Discovery

```typescript
POST /api/search                # Semantic document search
GET  /api/search/suggestions    # Get search suggestions
```

### PDF Operations

```typescript
GET  /api/pdf/templates         # List PDF templates
POST /api/pdf/templates         # Upload new template
POST /api/pdf/fill             # Fill PDF with AI assistance
GET  /api/pdf/templates/:id     # Get template details
```

## 🧪 Testing

### Backend Tests
```bash
cd packages/backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Frontend Tests
```bash
cd packages/frontend
npm test                    # Run component tests
npm run test:e2e           # End-to-end tests
```

## 🚀 Deployment

### Docker Production

1. **Build and deploy**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Database migration**
   ```bash
   docker exec harbor-backend npx prisma migrate deploy
   ```

### AWS Deployment

The application is designed for deployment on:
- **ECS/Fargate** for container orchestration
- **RDS PostgreSQL** for managed database
- **ElastiCache Redis** for job queuing
- **Application Load Balancer** for traffic distribution
- **CloudFront** for static asset delivery

## 🔒 Security Features

- **JWT authentication** with refresh token rotation
- **Rate limiting** per IP and user
- **CORS protection** with configurable origins
- **Input validation** with Joi schemas
- **SQL injection prevention** with Prisma
- **XSS protection** with helmet middleware
- **File upload validation** and size limits

## 📊 Monitoring & Observability

- **Health check endpoints** for container orchestration
- **Structured JSON logging** with correlation IDs
- **Error tracking** with stack traces and context
- **Performance metrics** for API endpoints
- **Database query monitoring** with Prisma

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with tests
4. Run the test suite: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the [documentation](docs/) for detailed guides
- Review the [FAQ](docs/FAQ.md) for common questions

---

**Harbor** - Intelligent document management and PDF filling powered by AI 🚢
