# 🖥️ VPS Setup Guide for IAALearn on Hoganhost

## Prerequisites
- Hoganhost VPS plan activated
- SSH access credentials
- Domain mightskytech.com pointed to VPS IP

## Step 1: Connect to Your VPS

```bash
# From your local machine
ssh root@your-vps-ip-address
# Or
ssh username@your-vps-ip-address
```

## Step 2: Update System

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl git wget nano ufw
```

## Step 3: Install Node.js

```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x
npm --version
```

## Step 4: Install PostgreSQL

```bash
# Install PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify PostgreSQL is running
sudo systemctl status postgresql
```

## Step 5: Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run these commands:
```

```sql
-- Create database
CREATE DATABASE iaalearn_db;

-- Create user with password
CREATE USER iaalearn_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE iaalearn_db TO iaalearn_user;

-- Grant schema permissions
\c iaalearn_db
GRANT ALL ON SCHEMA public TO iaalearn_user;

-- Exit PostgreSQL
\q
```

```bash
# Configure PostgreSQL to accept connections
sudo nano /etc/postgresql/15/main/postgresql.conf
# Find and uncomment/edit: listen_addresses = 'localhost'

sudo nano /etc/postgresql/15/main/pg_hba.conf
# Add this line:
# local   all   iaalearn_user   md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Step 6: Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Configure PM2 to start on boot
pm2 startup
# Copy and run the command it outputs
```

## Step 7: Setup Firewall

```bash
# Configure UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Check status
sudo ufw status
```

## Step 8: Install Nginx (Web Server)

```bash
# Install Nginx
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Step 9: Configure Nginx for Your App

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/iaalearn
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name mightskytech.com www.mightskytech.com;

    # Static files (React build)
    location / {
        root /var/www/iaalearn/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API proxy to Node.js
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/iaalearn /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 10: Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d mightskytech.com -d www.mightskytech.com

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (recommended)

# Test auto-renewal
sudo certbot renew --dry-run
```

## Step 11: Deploy Your Application

```bash
# Create application directory
sudo mkdir -p /var/www/iaalearn
sudo chown -R $USER:$USER /var/www/iaalearn

# Clone from GitHub
cd /var/www
git clone https://github.com/jossy450/IAALearn.git iaalearn
cd iaalearn

# Install dependencies
npm install --production

# Build client
cd client
npm install
npm run build
cd ..
```

## Step 12: Create Production Environment File

```bash
# Create .env file
nano .env
```

Paste this configuration:

```env
# Production Configuration
NODE_ENV=production
PORT=3001

# Domain
CLIENT_URL=https://mightskytech.com

# Database (use your actual credentials)
DEMO_MODE=false
DATABASE_URL=postgresql://iaalearn_user:your_secure_password_here@localhost:5432/iaalearn_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iaalearn_db
DB_USER=iaalearn_user
DB_PASSWORD=your_secure_password_here

# Security (generate new secrets)
JWT_SECRET=your_jwt_secret_here

# OAuth - UPDATE AFTER CREATING APPS
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret
GITHUB_CLIENT_ID=Iv1.your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# AI Services
OPENAI_API_KEY=your_openai_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Other settings
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CACHE_TTL_SECONDS=3600
ENABLE_CACHING=true
```

## Step 13: Run Database Migrations

```bash
# Import database schema
psql postgresql://iaalearn_user:your_password@localhost:5432/iaalearn_db < server/database/schema.sql

# Or use the migration script
npm run db:migrate
```

## Step 14: Start Application with PM2

```bash
# Start the application
pm2 start server/index.js --name iaalearn

# Save PM2 process list
pm2 save

# View logs
pm2 logs iaalearn

# Monitor
pm2 monit
```

## Step 15: Verify Everything Works

```bash
# Check if app is running
pm2 status

# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check if Nginx is running
sudo systemctl status nginx

# Test database connection
psql postgresql://iaalearn_user:your_password@localhost:5432/iaalearn_db -c "SELECT version();"

# Check application logs
pm2 logs iaalearn --lines 50
```

## Step 16: Point Domain to VPS

1. Log in to your domain registrar (where you bought mightskytech.com)
2. Update DNS records:
   ```
   Type: A
   Name: @
   Value: your-vps-ip-address
   TTL: 3600

   Type: A
   Name: www
   Value: your-vps-ip-address
   TTL: 3600
   ```
3. Wait for DNS propagation (can take up to 48 hours)

## Useful Commands

```bash
# Restart application
pm2 restart iaalearn

# Stop application
pm2 stop iaalearn

# View real-time logs
pm2 logs iaalearn --lines 100

# Restart Nginx
sudo systemctl restart nginx

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check disk space
df -h

# Check memory usage
free -h

# Update application from GitHub
cd /var/www/iaalearn
git pull
npm install --production
cd client && npm install && npm run build && cd ..
pm2 restart iaalearn
```

## Security Best Practices

1. **Change PostgreSQL password** to something secure
2. **Generate unique JWT_SECRET**: `openssl rand -hex 32`
3. **Don't commit .env** to GitHub (already in .gitignore)
4. **Keep system updated**: `sudo apt update && sudo apt upgrade`
5. **Monitor logs regularly**: `pm2 logs`
6. **Set up automatic backups** for PostgreSQL:

```bash
# Create backup script
sudo nano /usr/local/bin/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump postgresql://iaalearn_user:password@localhost:5432/iaalearn_db > $BACKUP_DIR/iaalearn_$DATE.sql
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-db.sh
```

## Troubleshooting

### Application won't start
```bash
pm2 logs iaalearn --lines 100
# Check for errors in environment variables or database connection
```

### Database connection failed
```bash
# Test connection
psql postgresql://iaalearn_user:password@localhost:5432/iaalearn_db

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Nginx errors
```bash
# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Test configuration
sudo nginx -t
```

### SSL certificate issues
```bash
# Renew certificates manually
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

## Next Steps

1. ✅ Set up VPS following steps above
2. ✅ Configure OAuth apps (see HOGANHOST_DEPLOY.md)
3. ✅ Test application at https://mightskytech.com
4. ✅ Set up monitoring and alerts
5. ✅ Configure automatic backups

---

**Support:**
- Hoganhost Support: Check their support portal
- IAALearn Issues: https://github.com/jossy450/IAALearn/issues
