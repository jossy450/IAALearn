# Build stage for client
FROM node:18-alpine AS client-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy server files
COPY server/ ./server/
COPY package*.json ./

# Install production dependencies
ENV npm_config_python=/usr/bin/python3
ENV SKIP_CLIENT_INSTALL=true
RUN apk add --no-cache python3 make g++ ffmpeg \
	&& npm install --production \
	&& apk del python3 make g++

# Copy built client files
COPY --from=client-builder /app/client/dist ./client/dist

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Start the application
CMD ["node", "server/index.js"]
