#!/bin/sh
set -eu

# Runtime-config for the SPA (allows changing values at deploy time without rebuilding).
# This is served as /config.js and loaded by index.html before the app bundle.

PUBLIC_URL_VALUE="${PUBLIC_URL:-}"

# Minimal JS (avoid json tooling). If PUBLIC_URL is empty, frontend falls back to window.location.origin.
cat > /usr/share/nginx/html/config.js <<EOF
window.__APP_CONFIG__ = {
  publicUrl: "${PUBLIC_URL_VALUE}"
};
EOF
