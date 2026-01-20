# Interview Answer Assistant - Deployment Guide

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Database migrations run successfully
- [ ] Frontend built and tested
- [ ] API endpoints tested
- [ ] SSL certificates obtained
- [ ] Domain configured
- [ ] Monitoring set up

### Environment Variables

#### Production Environment

```env
# Server
PORT=3001
NODE_ENV=production

# Database (Use connection pooling)
DATABASE_URL=postgresql://user:password@host:5432/dbname?ssl=true
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=interview_assistant_prod
DB_USER=app_user
DB_PASSWORD=strong_password_here

# AI Services
OPENAI_API_KEY=sk-prod-key-here
PERPLEXITY_API_KEY=pplx-prod-key-here

# Security
JWT_SECRET=complex-secret-minimum-32-characters-production
ENCRYPTION_KEY=32-character-encryption-key-prod

# Application
CLIENT_URL=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cache
CACHE_TTL_SECONDS=3600
ENABLE_CACHING=true
```

### Database Setup

#### 1. Create Production Database

```sql
-- Create database
CREATE DATABASE interview_assistant_prod;

-- Create app user
CREATE USER app_user WITH ENCRYPTED PASSWORD 'strong_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE interview_assistant_prod TO app_user;

-- Connect to database
\c interview_assistant_prod

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

#### 2. Run Migrations

```bash
NODE_ENV=production npm run db:migrate
```

#### 3. Database Backups

Set up automatic backups:

```bash
# Cron job for daily backups
0 2 * * * pg_dump -U app_user interview_assistant_prod > /backup/db_$(date +\%Y\%m\%d).sql
```

### Build Process

#### 1. Build Frontend

```bash
cd client
npm run build
cd ..
```

#### 2. Optimize Assets

The build process automatically:
- Minifies JavaScript and CSS
- Optimizes images
- Generates service worker for PWA
- Creates manifest.json

### Deployment Options

## Option 1: Traditional Server (VPS)

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start server/index.js --name "interview-assistant"

# Setup auto-restart
pm2 startup
pm2 save

# Monitor
pm2 monit
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        root /var/www/interview-assistant/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Option 2: Docker Deployment

### Production Dockerfile

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY client/package*.json ./client/
RUN npm ci && cd client && npm ci

# Copy source
COPY . .

# Build frontend
RUN cd client && npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3001

CMD ["node", "server/index.js"]
```

### Docker Compose Production

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    restart: always
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    restart: always
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      PERPLEXITY_API_KEY: ${PERPLEXITY_API_KEY}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  postgres_data:
```

Deploy:

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Option 3: Cloud Platforms

### Heroku

```bash
# Login
heroku login

# Create app
heroku create interview-assistant-prod

# Add PostgreSQL
heroku addons:create heroku-postgresql:standard-0

# Set environment variables
heroku config:set OPENAI_API_KEY=your-key
heroku config:set PERPLEXITY_API_KEY=your-key
heroku config:set JWT_SECRET=your-secret
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Run migrations
heroku run npm run db:migrate

# Open app
heroku open
```

### AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init

# Create environment
eb create interview-assistant-prod

# Deploy
eb deploy

# Set environment variables
eb setenv OPENAI_API_KEY=your-key JWT_SECRET=your-secret
```

### DigitalOcean App Platform

1. Connect GitHub repository
2. Configure build settings:
   - Build Command: `npm run build`
   - Run Command: `npm start`
3. Add PostgreSQL database
4. Configure environment variables
5. Deploy

## Monitoring & Logging

### PM2 Monitoring

```bash
# Install PM2 Plus
pm2 plus

# Link to dashboard
pm2 link <secret> <public>
```

### Log Management

```javascript
// server/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

### Health Checks

```javascript
// Already implemented in server/index.js
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});
```

### Uptime Monitoring

Use services like:
- UptimeRobot
- Pingdom
- StatusCake

## Performance Optimization

### 1. Enable Gzip Compression

Already implemented via `compression` middleware.

### 2. CDN for Static Assets

Use Cloudflare or AWS CloudFront:

```javascript
// In production, serve static files from CDN
const STATIC_URL = process.env.CDN_URL || '/';
```

### 3. Database Connection Pooling

Already configured in `server/database/connection.js`.

### 4. Redis Caching (Optional)

For high-traffic scenarios:

```bash
npm install redis
```

```javascript
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL
});
```

## Security Hardening

### 1. Rate Limiting

Already implemented. Adjust as needed:

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

### 2. CORS Configuration

```javascript
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  optionsSuccessStatus: 200
}));
```

### 3. Security Headers

Already implemented via `helmet` middleware.

### 4. Input Validation

Add validation middleware:

```bash
npm install joi
```

## Backup Strategy

### Database Backups

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="interview_assistant_prod"

pg_dump -U app_user $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

### Automated Backups

```bash
# Crontab
0 2 * * * /path/to/backup.sh
```

## Rollback Plan

### Version Control

```bash
# Tag releases
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Rollback if needed
git checkout v1.0.0
```

### Database Rollback

Keep migration scripts versioned and reversible.

## Post-Deployment

### 1. Smoke Tests

- [ ] Login works
- [ ] Session creation works
- [ ] Audio transcription works
- [ ] Answer generation works
- [ ] Analytics load correctly
- [ ] PWA installs successfully

### 2. Performance Testing

```bash
# Using Apache Bench
ab -n 1000 -c 10 https://yourdomain.com/api/health
```

### 3. Monitor Error Rates

Check logs for:
- 5xx errors
- Database connection issues
- API failures
- Authentication problems

## Maintenance

### Regular Tasks

- [ ] Weekly: Check error logs
- [ ] Weekly: Review performance metrics
- [ ] Monthly: Update dependencies
- [ ] Monthly: Review database size and optimize
- [ ] Quarterly: Security audit
- [ ] Quarterly: Load testing

### Scaling Considerations

When traffic increases:

1. **Horizontal Scaling**: Add more app instances
2. **Database**: Upgrade to larger instance or read replicas
3. **Caching**: Add Redis layer
4. **CDN**: Serve static assets from CDN
5. **Load Balancer**: Distribute traffic

## Support

For deployment issues:
- Check logs: `pm2 logs` or `docker-compose logs`
- Review health endpoint: `curl https://yourdomain.com/health`
- Database connection: `psql -U app_user -h host -d dbname`

---

Last updated: January 2026
