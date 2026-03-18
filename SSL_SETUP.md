# SSL/TLS Setup with Let's Encrypt

This guide provides setup instructions for SSL certificates using Let's Encrypt and Certbot with your Chess Arena application.

## Overview

Your application now uses:
- **NGINX** as a reverse proxy with SSL/TLS support
- **Let's Encrypt** for free SSL certificates
- **Certbot** for automatic certificate renewal
- **Domain**: cpatchessarena.in

## Prerequisites

- Docker and Docker Compose installed
- Domain name pointing to your server (DNS configured)
- Port 80 and 443 open on your firewall
- Email address for Let's Encrypt notifications

## Initial Setup

### Step 1: Update Your Domain

If your domain is not `cpatchessarena.in`, update it:

```bash
bash cert-manager.sh update-domain
```

Or manually edit these files:
- `nginx/nginx.conf` - Update `server_name` directives
- `init-letsencrypt.sh` - Update `DOMAIN` and `EMAIL` variables
- `cert-manager.sh` - Update `DOMAIN` and `EMAIL` variables

### Step 2: Ensure DNS is Configured

Your domain must point to your server's IP address:

```bash
# Test DNS resolution
dig cpatchessarena.in
nslookup cpatchessarena.in
```

### Step 3: Make Scripts Executable

```bash
chmod +x init-letsencrypt.sh cert-manager.sh
```

### Step 4: Initialize Certificates

```bash
# Initialize Let's Encrypt certificates
bash init-letsencrypt.sh
```

This script will:
- Create necessary directories
- Obtain SSL certificates from Let's Encrypt
- Handle the ACME challenge validation

### Step 5: Start Services

```bash
docker-compose up -d
```

Verify NGINX is running:
```bash
curl https://cpatchessarena.in
```

## Certificate Management

### Check Certificate Status

```bash
bash cert-manager.sh status
```

Shows:
- Certificate validity
- Expiration date
- Days remaining

### Manually Renew Certificates

```bash
bash cert-manager.sh renew
```

**Note**: Automatic renewal happens every 12 hours via the Certbot service.

## How It Works

### NGINX Configuration

The NGINX setup includes:

```nginx
# HTTP → HTTPS Redirect
listen 80;  # Redirects all HTTP to HTTPS

# HTTPS Server
listen 443 ssl http2;  # Secure connection with HTTP/2
ssl_certificate /etc/letsencrypt/live/cpatchessarena.in/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/cpatchessarena.in/privkey.pem;

# Security Headers
Strict-Transport-Security (HSTS)
X-Frame-Options
X-Content-Type-Options
X-XSS-Protection
```

### Certbot Service

The Certbot service:
- Runs continuously in the background
- Checks for expiring certificates every 12 hours
- Automatically renews certificates 30 days before expiration
- Validates renewals using HTTP-01 challenge (port 80)

### Certificate Validation Flow

1. Certbot requests certificate from Let's Encrypt
2. Let's Encrypt challenges with ACME HTTP-01
3. Challenge validation file placed in `/var/www/certbot`
4. NGINX routes `/.well-known/acme-challenge/` to that directory
5. Let's Encrypt validates and issues certificate
6. Certificate stored in `/etc/letsencrypt/live/cpatchessarena.in/`

## Docker Volumes

Certificate storage:

```
./certbot/conf/          # Contains all certificates and configs
./certbot/www/           # ACME challenge validation files
```

These directories are mounted in both NGINX and Certbot containers.

## Troubleshooting

### Certificate Not Found

```bash
# Check if certificates exist
ls -la ./certbot/conf/live/cpatchessarena.in/

# Reinitialize
bash init-letsencrypt.sh
```

### DNS Resolution Issues

```bash
# Verify DNS is set up correctly
dig cpatchessarena.in @8.8.8.8
nslookup cpatchessarena.in
```

### Port 80/443 Already in Use

```bash
# Check what's using the ports
lsof -i :80
lsof -i :443

# Stop conflicting services
sudo systemctl stop apache2  # or other service
```

### NGINX Configuration Errors

```bash
# Test NGINX config inside container
docker-compose exec nginx nginx -t

# View NGINX logs
docker-compose logs nginx
```

### Certificate Renewal Failed

```bash
# Check logs
docker-compose logs certbot

# Manually renew with verbose output
docker-compose run --rm certbot renew --verbose
```

## Security Best Practices

✅ Implemented in your setup:

- **HTTPS Only**: All HTTP traffic redirects to HTTPS
- **TLS 1.2+**: Modern TLS protocols only
- **Strong Ciphers**: HIGH ciphers, medium security level
- **HSTS**: Browser remembers to use HTTPS for 1 year
- **Security Headers**: Protecting against common attacks
- **Automatic Renewal**: 30-day notice before expiration

## Renewal and Maintenance

### Automatic Renewal

The Certbot service handles this automatically:
- Checks every 12 hours
- Renews 30 days before expiration
- Restarts NGINX to apply new certificates

### Manual Checks

```bash
# View certificate expiration
bash cert-manager.sh status

# View renewal history
docker-compose exec certbot cat /var/log/letsencrypt/letsencrypt.log
```

## Firewall Configuration

Ensure these ports are open on your firewall:

```bash
# HTTP (for ACME challenge)
sudo ufw allow 80/tcp

# HTTPS (for secure connections)
sudo ufw allow 443/tcp

# Optional: SSH
sudo ufw allow 22/tcp
```

## Let's Encrypt Rate Limits

Be aware of Let's Encrypt rate limits:

- **50 certificates per domain per week**
- **5 duplicate certificates per week**

For testing, use `--staging` flag:

```bash
certbot certonly --staging --webroot ...
```

## Certificate Pinning (Advanced)

If implementing certificate pinning, backup these files:

```bash
cp ./certbot/conf/live/cpatchessarena.in/fullchain.pem backup/
cp ./certbot/conf/live/cpatchessarena.in/privkey.pem backup/
```

## Backup and Restore

### Backup Certificates

```bash
tar -czf certificates-backup.tar.gz ./certbot/
```

### Restore Certificates

```bash
tar -xzf certificates-backup.tar.gz
docker-compose restart nginx
```

## Monitoring

### Check Services Health

```bash
docker-compose ps
```

Expected output:
```
nginx    healthy
certbot  running
backend  running
frontend running
db       running
```

### View Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs nginx
docker-compose logs certbot

# Follow logs in real-time
docker-compose logs -f nginx
```

## Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://certbot.eff.org/docs/)
- [NGINX SSL Configuration](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)

---

**Last Updated**: March 17, 2026
**Configured Domain**: cpatchessarena.in
