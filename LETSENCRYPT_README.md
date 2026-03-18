# Chess Arena - Complete Deployment Guide

Comprehensive guide for deploying Chess Arena with Docker, NGINX reverse proxy, and Let's Encrypt SSL certificates.

## 📚 Table of Contents

- [Quick Start](#quick-start)
- [Project Architecture](#project-architecture)
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Let's Encrypt SSL Setup](#lets-encrypt-ssl-setup)
- [Deployment](#deployment)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)
- [File Structure](#file-structure)

---

## 🚀 Quick Start

```bash
# 1. Clone and navigate to project
cd Chess-Host

# 2. Create environment file
cp .env.example .env
# Edit .env with your settings

# 3. Make scripts executable
chmod +x init-letsencrypt.sh cert-manager.sh

# 4. Initialize SSL certificates
bash init-letsencrypt.sh

# 5. Start services
docker-compose up -d

# 6. Verify setup
docker-compose ps
curl https://yourdomain.com
```

---

## 🏗️ Project Architecture

```
┌─────────────────────────────────────────────┐
│             Internet (HTTPS)                 │
└────────────────┬────────────────────────────┘
                 │
        ┌────────▼─────────┐
        │   NGINX (443)    │ ◄── SSL Certificates from Let's Encrypt
        │    Reverse       │     (Auto-renewed every 12h)
        │    Proxy         │
        └────────┬─────────┘
                 │
      ┌──────────┼──────────┐
      │          │          │
 ┌────▼──┐ ┌────▼──┐ ┌────▼──┐
 │Backend │ │Frontend│ │  DB   │
 │ (3001) │ │  (80)  │ │(3306) │
 └────────┘ └────────┘ └───────┘

Services:
- NGINX:   Reverse proxy & SSL termination
- Backend: Express.js API (Node.js)
- Frontend: React SPA (Vite)
- DB:      MySQL 8.0
- Certbot: Automatic certificate renewal
```

### Service Communication

- **Clients → NGINX (443):** HTTPS connections
- **NGINX → Backend (3001):** Internal API proxy
- **NGINX → Frontend (80):** Internal SPA proxy
- **Backend ↔ DB (3306):** Database queries
- **Certbot → Let's Encrypt:** Certificate management

---

## 📋 Prerequisites

### System Requirements

- **Docker** (20.10+): Container runtime
- **Docker Compose** (1.29+): Multi-container orchestration
- **Linux, macOS, or Windows (WSL2)**: Operating system
- **4GB RAM minimum**: For running all services
- **2GB disk space**: For base images and data

### Network Requirements

- **Domain name** pointing to your server
- **Port 80 (HTTP)**: For Let's Encrypt ACME challenges
- **Port 443 (HTTPS)**: For secure connections
- **Public DNS**: Domain must resolve from internet

### Installed Tools (Optional)

```bash
# Verify installations
docker --version          # Docker 20.10+
docker-compose --version  # 1.29+
curl --version           # For testing
openssl version          # For certificate inspection
dig                      # For DNS testing
```

---

## 🔧 Initial Setup

### Step 1: Environment Configuration

Create `.env` file in project root:

```bash
# Database Configuration
MYSQL_DATABASE=chess_db
MYSQL_USER=chess_user
MYSQL_PASSWORD=your_secure_password_here
MYSQL_ROOT_PASSWORD=root_secure_password_here
MYSQL_HOST_PORT=3306

# Backend Configuration
BACKEND_PORT=3001
DATABASE_URL=mysql://chess_user:your_secure_password_here@db:3306/chess_db
ADMIN_TOKEN=your_admin_secret_token_here

# Frontend Configuration
FRONTEND_PORT=3000
BACKEND_URL=http://backend:3001
PUBLIC_URL=https://yourdomain.com
```

**Security tips:**
- Use strong, random passwords (20+ chars with mixed case, numbers, symbols)
- Never commit `.env` file to git
- Generate token: `openssl rand -base64 32`

### Step 2: Verify Directory Structure

```bash
ls -la Chess-Host/
```

Expected directories:
```
├── backend/           # Express API server
├── frontend/          # React SPA application
├── nginx/             # NGINX configuration
├── certbot/           # SSL certificates (auto-created)
├── docker-compose.yml # Docker services definition
├── init-letsencrypt.sh# Certificate initialization
├── cert-manager.sh    # Certificate management utility
├── SSL_SETUP.md       # Detailed SSL documentation
└── README.md          # This file
```

### Step 3: Update Domain Configuration

Edit domain in files:

**nginx/nginx.conf:**
```nginx
server_name yourdomain.com www.yourdomain.com;
```

**init-letsencrypt.sh:**
```bash
DOMAIN="yourdomain.com"
DOMAIN_ALT="www.yourdomain.com"
EMAIL="admin@yourdomain.com"
```

**cert-manager.sh:**
```bash
DOMAIN="yourdomain.com"
DOMAIN_ALT="www.yourdomain.com"
EMAIL="admin@yourdomain.com"
```

Or use the automated script:
```bash
bash cert-manager.sh update-domain
```

---

## 🔒 Let's Encrypt SSL Setup

### Overview

Let's Encrypt provides **free SSL certificates** with automatic renewal:

- **Free**: No cost for certificates
- **Automatic**: Renews 30 days before expiration
- **Secure**: Modern TLS 1.2+ protocols
- **Standardized**: Widely trusted by all browsers

### Full SSL Setup Process

#### Phase 1: Pre-Setup Verification (5 minutes)

```bash
# 1. Verify domain DNS
nslookup yourdomain.com
# Expected: Shows your server's IP address

# 2. Check port accessibility
netstat -tuln | grep -E ':(80|443)'
# Ports should be available or you need to:
sudo systemctl stop apache2  # or other conflicting service

# 3. Ensure firewall allows ports
# AWS/Cloud Provider: Add security group rules for 80, 443
# Self-hosted: Run these commands
sudo ufw allow 80/tcp         # HTTP - ACME challenges
sudo ufw allow 443/tcp        # HTTPS - Secure connections
```

#### Phase 2: Initial Certificate Acquisition (2 minutes)

```bash
# Make scripts executable (one time)
cd Chess-Host
chmod +x init-letsencrypt.sh cert-manager.sh

# Initialize certificates - this runs certbot
bash init-letsencrypt.sh

# Expected output:
# ✓ Creating certificate directories
# ✓ Obtaining certificates from Let's Encrypt
# ✓ ACME challenge completed
# ✓ Certificate successfully installed
```

**What happens internally:**

1. **Request**: Certbot requests certificate from Let's Encrypt API
2. **Challenge**: Let's Encrypt issues ACME HTTP-01 challenge
3. **Verification**: Challenge file placed at `/.well-known/acme-challenge/`
4. **Validation**: Let's Encrypt verifies file accessibility
5. **Issuance**: Certificate issued and stored in `certbot/conf/`

#### Phase 3: Docker Services Start (1 minute)

```bash
# Start all services
docker-compose up -d

# Monitor startup
docker-compose logs -f

# Wait for all services to be healthy
sleep 10
docker-compose ps

# Expected status:
# - db: healthy
# - backend: running
# - frontend: running
# - nginx: running
# - certbot: running
```

#### Phase 4: Verification (1 minute)

```bash
# Test HTTPS connection
curl -I https://yourdomain.com
# Expected: HTTP/1.1 200 OK with SSL certificate details

# Check certificate details
openssl s_client -connect yourdomain.com:443
# Verify:
# - Subject: CN = yourdomain.com
# - Valid from/until dates
# - Issuer: Let's Encrypt

# View certificate expiration locally
bash cert-manager.sh status
# Expected: ✓ Certificate valid for XXX days
```

### Certificate Lifecycle

```
Day 0                 Day 30-60              Day 60               Day 90
├─────────────────────┼────────────────────└─────────────▶ EXPIRY
      ISSUED          AUTO-RENEWAL            VALID        (INVALID)
                      (12h intervals)
                      (30 days notice)
```

**Renewal Process (Automatic):**

1. **Certbot Service**: Runs every 12 hours
2. **Check Expiry**: Looks for certs expiring in < 30 days
3. **Renew**: Requests new certificate from Let's Encrypt
4. **Validate**: Uses HTTP-01 challenge again (port 80)
5. **Update**: Replaces old cert with new one
6. **Reload**: NGINX automatically uses new cert

### Manual Certificate Operations

```bash
# Check certificate status
bash cert-manager.sh status
# Shows: Expiration date, days remaining, validity

# Manually renew certificate
bash cert-manager.sh renew
# Use only if auto-renewal fails

# Inspect certificate file
openssl x509 -in certbot/conf/live/yourdomain.com/fullchain.pem -text -noout

# Check certificate chain
openssl x509 -in certbot/conf/live/yourdomain.com/fullchain.pem
openssl x509 -in certbot/conf/live/yourdomain.com/chain.pem

# Extract key information
# Issuer
openssl x509 -in certbot/conf/live/yourdomain.com/fullchain.pem -noout -issuer

# Validity dates
openssl x509 -in certbot/conf/live/yourdomain.com/fullchain.pem -noout -dates

# Subject
openssl x509 -in certbot/conf/live/yourdomain.com/fullchain.pem -noout -subject
```

### Certificate Renewal During Operation

**Non-Disruptive Renewal:**

1. Certbot renews certificate in background
2. NGINX receives SIGHUP signal
3. NGINX reloads config with new cert
4. **Zero downtime** - existing connections unaffected
5. New connections use renewed certificate

**Process verification:**

```bash
# Before renewal
bash cert-manager.sh status
# Output: Valid for 45 days

# Wait 30 days...and renewal happens automatically

# After renewal
bash cert-manager.sh status
# Output: Valid for 89 days
```

---

## 🚀 Deployment

### Production Deployment Checklist

```bash
# 1. Environment variables configured
cat .env | grep -E 'MYSQL_|BACKEND_|ADMIN_TOKEN'

# 2. Domain DNS updated
nslookup yourdomain.com

# 3. Ports open
sudo netstat -tuln | grep -E ':(80|443)'

# 4. Firewall configured
sudo ufw status | grep -E '(80|443)'

# 5. Certificates initialized
ls -la certbot/conf/live/yourdomain.com/
# Should show: fullchain.pem, privkey.pem

# 6. Docker images built
docker-compose build

# 7. Services started
docker-compose up -d

# 8. Health check
curl -I https://yourdomain.com
```

### Start Services

```bash
# Start in background
docker-compose up -d

# Start with logging
docker-compose up

# Perform health check
docker-compose ps

# View service logs
docker-compose logs -f
```

### Verify Installation

```bash
# Check all services running
docker-compose ps

# Test API endpoint
curl https://yourdomain.com/api/health
# Expected: {"ok":true}

# Test HTTPS redirect
curl -I http://yourdomain.com
# Expected: 301 redirect to https://yourdomain.com

# Check certificate validity
curl -vI https://yourdomain.com 2>&1 | grep -E 'SSL|TLS|subject'

# View specific service logs
docker-compose logs nginx     # Reverse proxy
docker-compose logs backend   # API server
docker-compose logs frontend  # SPA app
docker-compose logs certbot   # Certificate renewal
docker-compose logs db        # Database
```

### Access Application

- **Frontend**: https://yourdomain.com
- **API**: https://yourdomain.com/api/
- **Admin**: https://yourdomain.com/admin

---

## 🛠️ Maintenance

### Daily Operations

```bash
# View service status
docker-compose ps

# Check logs for errors
docker-compose logs --tail=100

# Monitor resource usage
docker stats

# View network connectivity
docker network inspect chess-network
```

### Weekly Tasks

```bash
# Check certificate expiration
bash cert-manager.sh status

# Review error logs
docker-compose logs | grep ERROR

# Backup critical data
docker-compose exec db mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" chess_db > backup.sql
```

### Monthly Tasks

```bash
# Update Docker images
docker-compose pull
docker-compose build --pull
docker-compose up -d

# Review Let's Encrypt logs
docker-compose logs certbot | tail -50

# Test certificate renewal
# (Certbot auto-renews, but verify in logs)
docker-compose logs certbot | grep -i renew
```

### Update Backend

```bash
# Source files
cd backend
npm install              # Install new dependencies
npm run build           # Build if needed
cd ..

# Rebuild Docker image
docker-compose build backend

# Restart service
docker-compose up -d backend
```

### Update Frontend

```bash
# Source files
cd frontend
npm install
npm run build
cd ..

# Rebuild Docker image
docker-compose build frontend

# Restart service
docker-compose up -d frontend
```

---

## 🔧 Troubleshooting

### Certificate Issues

#### Problem: "Certificate not found"

```bash
# Solution: Reinitialize certificates
bash init-letsencrypt.sh

# Check certificate directory
ls -la certbot/conf/live/yourdomain.com/
```

#### Problem: "ACME challenge failed"

**Causes:**
- Port 80 not accessible
- DNS not resolving
- Firewall blocking traffic

**Solutions:**
```bash
# Verify port 80 is accessible externally
curl -I http://yourdomain.com/.well-known/acme-challenge/test

# Check DNS resolution
dig yourdomain.com @8.8.8.8
# Should return your server IP

# Check firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# Retry certificate initialization
bash init-letsencrypt.sh
```

#### Problem: "Certificate expired"

```bash
# Should not happen with auto-renewal, but if it does:
bash cert-manager.sh renew

# Or force renewal
docker-compose run --rm certbot renew --force-renewal
```

#### Problem: Browser shows SSL warning

**Check certificate validity:**
```bash
openssl s_client -connect yourdomain.com:443 -showcerts
# Verify dates and issuer
```

**Force certificate renewal:**
```bash
docker-compose exec certbot certbot renew --force-renewal
docker-compose exec nginx nginx -s reload
```

### NGINX Issues

#### Problem: "NGINX fails to start"

```bash
# Check configuration
docker-compose exec nginx nginx -t
# Review error message

# Check logs
docker-compose logs nginx

# Verify certificate paths
ls -la certbot/conf/live/yourdomain.com/fullchain.pem
```

#### Problem: "Port 80/443 already in use"

```bash
# Find process using port
sudo lsof -i :80
sudo lsof -i :443

# Stop conflicting service
sudo systemctl stop apache2  # or other service
# or change port in docker-compose.yml
```

#### Problem: "Cannot connect to backend API"

```bash
# Check backend is running
docker-compose ps backend

# Check backend logs
docker-compose logs backend

# Test backend directly
docker-compose exec nginx curl http://backend:3001/api/health

# Verify network connectivity
docker network inspect chess-network
```

### Database Issues

#### Problem: "Database connection refused"

```bash
# Check database is running
docker-compose ps db

# Check database logs
docker-compose logs db

# Verify database is healthy
docker-compose exec db mysqladmin ping -u root -p"$MYSQL_ROOT_PASSWORD"
```

#### Problem: "Database corruption"

```bash
# Backup current data
docker-compose exec db mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" chess_db > backup.sql

# Restart database
docker-compose restart db
```

### Port Conflicts

```bash
# List all listening ports
sudo netstat -tuln

# Kill process on specific port
sudo kill -9 $(lsof -t -i :8080)

# Or change port in docker-compose.yml and rebuild
docker-compose up -d --build
```

### Docker Issues

#### Problem: "Out of disk space"

```bash
# Clean up Docker
docker system prune -a       # Remove unused images/containers
docker volume prune          # Remove unused volumes

# Check disk usage
du -sh /var/lib/docker/
```

#### Problem: "Cannot connect to Docker daemon"

```bash
# Restart Docker
sudo systemctl restart docker

# Check Docker status
sudo systemctl status docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Logs and Debugging

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs for specific service
docker-compose logs nginx -f --tail=100

# Export logs to file
docker-compose logs > application.log 2>&1

# View system journal for Docker
journalctl -u docker -n 50

# Inspect container
docker-compose exec nginx bash
# Inside container:
cat /etc/nginx/nginx.conf
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text
```

---

## 📁 File Structure

```
Chess-Host/
├── docker-compose.yml          # Docker services composition
├── .env                         # Environment configuration (not in git)
├── .gitignore                   # Git ignore rules (includes certbot/ paths)
├── README.md                    # This file
├── SSL_SETUP.md                 # Detailed SSL documentation
│
├── init-letsencrypt.sh         # Certificate initialization script
├── cert-manager.sh             # Certificate management utility
│
├── nginx/
│   ├── nginx.conf              # NGINX reverse proxy configuration
│   └── conf.d/                 # Additional NGINX configs (optional)
│
├── certbot/                    # Let's Encrypt certificates (auto-created)
│   ├── conf/                   # Certificate storage
│   │   └── live/yourdomain.com/
│   │       ├── fullchain.pem   # Full certificate chain
│   │       ├── privkey.pem     # Private key
│   │       └── ...
│   └── www/                    # ACME challenge validation
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── src/
│   │   ├── index.ts           # Express app entry
│   │   ├── env.ts             # Environment validation
│   │   ├── prisma.ts          # Database client
│   │   ├── routes/            # API endpoints
│   │   │   ├── index.ts
│   │   │   ├── health.ts
│   │   │   ├── players.ts
│   │   │   ├── tournaments.ts
│   │   │   └── stats.ts
│   │   ├── services/          # Business logic
│   │   │   ├── elo.ts
│   │   │   ├── stats.ts
│   │   │   └── swiss.ts
│   │   └── middleware/        # Express middleware
│   │       ├── admin.ts
│   │       └── error.ts
│   └── prisma/
│       ├── schema.prisma      # Database schema
│       └── migrations/        # Database migrations
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts         # Vite configuration with proxy
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── nginx.conf             # Frontend NGINX config
│   ├── index.html
│   └── src/
│       ├── main.tsx           # React entry point
│       ├── App.tsx            # Main component
│       ├── api.ts             # API client
│       ├── runtimeConfig.ts   # Runtime configuration
│       ├── pages/             # Page components
│       └── components/        # Reusable components
│
└── README.md                   # Project documentation
```

---

## 🔐 Security Considerations

### HTTPS/SSL

- ✅ **HTTPS Only**: All HTTP traffic redirects to HTTPS
- ✅ **TLS 1.2+**: Modern protocols only
- ✅ **Strong Ciphers**: HIGH ciphers, no weak algorithms
- ✅ **HSTS**: Browsers remember to use HTTPS (1 year)

### Security Headers

```nginx
Strict-Transport-Security: max-age=31536000    # HSTS
X-Frame-Options: SAMEORIGIN                   # Clickjacking protection
X-Content-Type-Options: nosniff                # MIME sniffing protection
X-XSS-Protection: 1; mode=block                # XSS protection
Referrer-Policy: no-referrer-when-downgrade   # Privacy
```

### Secrets Management

- `.env` file contains sensitive data - **never commit to git**
- `.gitignore` already excludes `.env`
- Use `.env.example` for documentation

```bash
# Create from example
cp .env.example .env

# Edit with secure values
nano .env

# Never commit
git add .env  # ← This will fail due to .gitignore
```

### Regular Updates

```bash
# Update Docker images monthly
docker-compose pull
docker-compose build --pull
docker-compose up -d

# Monitor Docker Hub for security updates
# Visit: hub.docker.com/r/library/nginx
#        hub.docker.com/r/library/node
#        hub.docker.com/r/_/mysql
```

---

## 📞 Support and Resources

### Official Documentation

- [Docker Compose](https://docs.docker.com/compose/)
- [Docker Reference](https://docs.docker.com/reference/)
- [NGINX Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://certbot.eff.org/docs/)

### Useful Commands Reference

```bash
# Docker Compose
docker-compose up -d              # Start services
docker-compose down               # Stop services
docker-compose restart            # Restart all
docker-compose logs -f            # View logs
docker-compose ps                 # List services
docker-compose exec SERVICE bash  # Shell into service

# Certificate Management
bash init-letsencrypt.sh          # Initialize certs
bash cert-manager.sh status       # Check status
bash cert-manager.sh renew        # Renew certs

# System
curl -I https://yourdomain.com    # Test HTTPS
openssl x509 -in path/to/cert     # Inspect certificate
dig yourdomain.com                # Check DNS
sudo ufw allow 80/tcp             # Firewall rule
```

### Monitoring Checklist

Daily:
- [ ] Services running (`docker-compose ps`)
- [ ] No error logs (`docker-compose logs | grep ERROR`)

Weekly:
- [ ] Certificate expiration (`bash cert-manager.sh status`)
- [ ] API responding (`curl https://yourdomain.com/api/health`)

Monthly:
- [ ] Docker images updated (`docker-compose pull`)
- [ ] Backup created (`mysqldump`)
- [ ] Certificate renewal logs checked

---

## 📝 License and Disclaimer

This setup guide is provided as-is. Always test in a staging environment before production deployment.

**Security Recommendations:**
1. Use strong, unique passwords
2. Keep Docker images updated
3. Monitor certificate expiration
4. Backup data regularly
5. Use secure DNS (e.g., Cloudflare)
6. Enable logging and monitoring
7. Review logs weekly

---

**Last Updated**: March 17, 2026  
**Current Domain**: cpatchessarena.in  
**SSL Provider**: Let's Encrypt  
**Maintained By**: Chess Arena Team
