# Use Node.js LTS Alpine image
FROM node:22-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Install tsx globally for TypeScript execution
RUN npm install -g tsx

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Development dependencies stage
FROM base AS dev-dependencies
RUN npm ci --silent

# Production dependencies stage
FROM base AS prod-dependencies
RUN npm ci --only=production --silent && npm cache clean --force

# Development stage
FROM dev-dependencies AS development
COPY . .
USER node
EXPOSE 8080
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production

# Copy production dependencies
COPY --from=prod-dependencies /app/node_modules ./node_modules

# Copy source code
COPY --chown=node:node . .

# Switch to non-root user
USER node

# Expose port (will be overridden by environment variable)
EXPOSE 8080

# Add health check with dynamic port
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${API_PORT:-8080}/health || exit 1

# Use dumb-init and start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
