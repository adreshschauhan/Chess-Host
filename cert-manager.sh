#!/bin/bash

# Certificate management helper script
# Usage: ./cert-manager.sh [init|renew|status|update-domain]

set -e

DOMAIN="chessclub.patna.cdac.in"
DOMAIN_ALT="www.chessclub.patna.cdac.in"
EMAIL="admin@patna.cdac.in"
CERT_PATH="./certbot/conf"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

show_help() {
    cat << EOF
${BLUE}Certificate Management Script${NC}

Usage: ./cert-manager.sh [command]

Commands:
  ${GREEN}init${NC}           - Initialize Let's Encrypt certificates
  ${GREEN}renew${NC}          - Manually renew certificates
  ${GREEN}status${NC}         - Check certificate status and expiration
  ${GREEN}update-domain${NC}  - Update domain (interactive)
  ${GREEN}help${NC}           - Show this help message

Examples:
  ./cert-manager.sh init
  ./cert-manager.sh status
  ./cert-manager.sh update-domain

EOF
}

init_certificates() {
    echo -e "${YELLOW}Initializing Let's Encrypt certificates for ${DOMAIN}${NC}"
    
    mkdir -p "${CERT_PATH}/live/${DOMAIN}" "${CERT_PATH}/archive/${DOMAIN}"
    mkdir -p ./certbot/www
    
    # Try to get real certificate
    docker-compose run --rm certbot certonly \
        --webroot \
        -w /var/www/certbot \
        --email "${EMAIL}" \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d "${DOMAIN}" \
        -d "${DOMAIN_ALT}" && \
    echo -e "${GREEN}✓ Certificates initialized successfully!${NC}" || \
    echo -e "${YELLOW}⚠ Certificate initialization had issues. Check the output above.${NC}"
}

renew_certificates() {
    echo -e "${YELLOW}Renewing certificates...${NC}"
    
    docker-compose run --rm certbot renew --quiet && \
    echo -e "${GREEN}✓ Certificates renewed successfully!${NC}" || \
    echo -e "${RED}✗ Certificate renewal failed${NC}"
}

check_status() {
    echo -e "${BLUE}Certificate Status:${NC}"
    
    if [ -f "${CERT_PATH}/live/${DOMAIN}/fullchain.pem" ]; then
        echo -e "${GREEN}✓ Certificate found for ${DOMAIN}${NC}"
        
        # Check expiration date
        if command -v openssl &> /dev/null; then
            EXPIRY=$(openssl x509 -enddate -noout -in "${CERT_PATH}/live/${DOMAIN}/fullchain.pem" | cut -d= -f2)
            echo "  Expires: ${EXPIRY}"
            
            # Calculate days until expiration
            EXPIRY_EPOCH=$(date -d "${EXPIRY}" +%s 2>/dev/null || date -jf "%b %d %T %Z %Y" "${EXPIRY}" +%s)
            NOW_EPOCH=$(date +%s)
            DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))
            
            if [ $DAYS_LEFT -lt 0 ]; then
                echo -e "  ${RED}✗ Certificate EXPIRED${NC}"
            elif [ $DAYS_LEFT -lt 30 ]; then
                echo -e "  ${YELLOW}⚠ Certificate expires in ${DAYS_LEFT} days${NC}"
            else
                echo -e "  ${GREEN}✓ Certificate valid for ${DAYS_LEFT} days${NC}"
            fi
        fi
    else
        echo -e "${RED}✗ No certificate found for ${DOMAIN}${NC}"
        echo "Run './cert-manager.sh init' to create one"
    fi
}

update_domain() {
    echo -e "${BLUE}Update Domain Configuration${NC}"
    read -p "Enter new domain name (current: ${DOMAIN}): " new_domain
    
    if [ -n "$new_domain" ]; then
        echo "Updating domain from ${DOMAIN} to ${new_domain}..."
        local new_alt="www.${new_domain}"
        local old_alt="${DOMAIN_ALT}"
        sed -i "s/${DOMAIN}/${new_domain}/g" nginx/nginx.conf init-letsencrypt.sh cert-manager.sh .env
        sed -i "s/${old_alt}/${new_alt}/g" init-letsencrypt.sh cert-manager.sh
        DOMAIN="${new_domain}"
        DOMAIN_ALT="${new_alt}"
        echo -e "${GREEN}✓ Domain updated to ${DOMAIN}${NC}"
        echo -e "${YELLOW}Run './cert-manager.sh init' to get certificates for the new domain${NC}"
    fi
}

case "${1:-help}" in
    init)
        init_certificates
        ;;
    renew)
        renew_certificates
        ;;
    status)
        check_status
        ;;
    update-domain)
        update_domain
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: ${1}${NC}"
        show_help
        exit 1
        ;;
esac
