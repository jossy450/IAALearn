# Build stage for client
FROM node:18-alpine AS client-builder

# Accept Vite build args so we can inject client-side envs at build time
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_DISABLE_STEALTH

WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./

# Provide Vite-compatible envs for the build step
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_DISABLE_STEALTH=${VITE_DISABLE_STEALTH}

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
