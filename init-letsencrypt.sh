
#!/bin/bash

# Set your domain and email here
DOMAIN="cpatchessarena.in"
DOMAIN_ALT="www.cpatchessarena.in"
EMAIL="admin@cpatchessarena.in"
CERT_PATH="./certbot/conf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up Let's Encrypt SSL certificates for $DOMAIN${NC}"

# Create necessary directories
mkdir -p "$CERT_PATH/live/$DOMAIN"
mkdir -p ./certbot/www
mkdir -p ./nginx/conf.d

# Check if certificate already exists
if [ -d "$CERT_PATH/live/$DOMAIN" ] && [ -f "$CERT_PATH/live/$DOMAIN/fullchain.pem" ]; then
    echo -e "${GREEN}Certificate already exists for $DOMAIN${NC}"
else
    echo -e "${YELLOW}Creating dummy certificate...${NC}"
    
    # Create a temporary self-signed cert to start NGINX
    docker run --rm \
        -v "$PWD/$CERT_PATH:/etc/letsencrypt" \
        -v "$PWD/./certbot/www:/var/www/certbot" \
        certbot/certbot certonly \
        --standalone \
        --preferred-challenges http \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --domains "$DOMAIN,$DOMAIN_ALT" \
        --dry-run || \
    mkdir -p "$CERT_PATH/live/$DOMAIN" "$CERT_PATH/archive/$DOMAIN"
    
    # If dry-run fails, create self-signed cert for bootstrapping
    if [ ! -f "$CERT_PATH/live/$DOMAIN/fullchain.pem" ]; then
        echo -e "${YELLOW}Creating self-signed certificate for bootstrapping...${NC}"
        docker run --rm \
            -v "$PWD/$CERT_PATH:/etc/letsencrypt" \
            certbot/certbot certonly \
            --register-unsafely-without-email \
            --agree-tos \
            --self-signed \
            --domains "$DOMAIN,$DOMAIN_ALT" \
            --force-renewal 2>/dev/null || true
    fi
fi

echo -e "${GREEN}Certificate setup complete!${NC}"
echo -e "${YELLOW}Run 'docker-compose up' to start the services${NC}"
