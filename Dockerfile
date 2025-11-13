# Multi-stage build: Frontend build stage
FROM node:18-alpine AS frontend-builder

WORKDIR /frontend-build

# Copy frontend package files
COPY ring-and-wing-frontend/package*.json ./

# Install dependencies (including dev for build)
RUN npm ci

# Copy frontend source
COPY ring-and-wing-frontend/ ./

# Build frontend for production
RUN npm run build

# Verify dist was created
RUN ls -la dist/


# Main backend stage with frontend
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Copy backend package files
COPY ring-and-wing-backend/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy backend source code
COPY ring-and-wing-backend/ ./

# Create required directories for file uploads
RUN mkdir -p public/uploads/menu public/uploads/payment-proofs public/uploads/qr-codes public/dist

# Copy built frontend dist from builder stage
COPY --from=frontend-builder /frontend-build/dist ./public/dist

# Verify dist was copied
RUN ls -la public/dist/ && echo "=== DIST COPIED ===" && ls -la public/

# Health check using curl instead of wget
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/api/health || exit 1

# Expose port (default 5000, can be overridden by PORT env var)
EXPOSE 5000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start backend server
CMD ["node", "--max-old-space-size=512", "--expose-gc", "server.js"]
