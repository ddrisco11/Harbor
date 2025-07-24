FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for pdf processing
RUN apk add --no-cache \
    curl \
    bash \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S harbor -u 1001

# Create directories for storage and logs
RUN mkdir -p /app/storage/templates /app/storage/generated /app/logs && \
    chown -R harbor:nodejs /app/storage /app/logs

# Switch to non-root user
USER harbor

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "start"] 