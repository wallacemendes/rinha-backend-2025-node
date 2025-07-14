# Use Node.js LTS Alpine image
FROM node:22-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

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
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production

# Copy production dependencies
COPY --from=prod-dependencies /app/node_modules ./node_modules

# Copy source code
COPY --chown=node:node . .

# Create non-root user and switch to it
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init and start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
