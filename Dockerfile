# Multi-stage build: Frontend build stage
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY ring-and-wing-frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY ring-and-wing-frontend/ ./

# Build frontend for production
RUN npm run build


# Main backend stage with frontend
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy backend package files
COPY ring-and-wing-backend/package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy backend source code
COPY ring-and-wing-backend/ ./

# Copy built frontend dist from builder stage
COPY --from=frontend-builder /app/frontend/dist ./public/dist

# Create required directories for file uploads
RUN mkdir -p public/uploads/menu public/uploads/payment-proofs public/uploads/qr-codes

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-5000}/api/health || exit 1

# Expose port (default 5000, can be overridden by PORT env var)
EXPOSE 5000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start backend server
CMD ["node", "--max-old-space-size=512", "--expose-gc", "server.js"]
