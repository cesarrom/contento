#!/usr/bin/env bash
set -euo pipefail

# Contento Docker Entrypoint
# This script orchestrates all services based on configuration

CONFIG_FILE="${CONFIG_FILE:-/etc/contento/config.yaml}"
DATA_DIR="${DATA_DIR:-/data}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[contento]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[contento]${NC} $*"
}

log_error() {
    echo -e "${RED}[contento]${NC} $*"
}

require_cmd() {
    local cmd="$1"
    if ! command -v "$cmd" >/dev/null 2>&1; then
        log_error "Missing required command: $cmd"
        exit 1
    fi
}

# Ensure required commands are available
require_cmd "yq"
require_cmd "openssl"

# Check if config file exists
if [[ ! -f "$CONFIG_FILE" ]]; then
    log_error "Configuration file not found: $CONFIG_FILE"
    log_error "Mount your config file to $CONFIG_FILE"
    exit 1
fi

log_info "Reading configuration from $CONFIG_FILE"

# Function to get config value with env var substitution
# Supports ${VAR} and ${VAR:-default} syntax
get_config() {
    local key="$1"
    local value
    
    # Use yq to get the value from YAML
    value=$(yq -r ".$key" "$CONFIG_FILE" 2>/dev/null || echo "~null")
    
    # If null or empty, return empty
    if [[ "$value" == "~null" || "$value" == "null" || -z "$value" ]]; then
        echo ""
        return
    fi
    
    # Replace ${VAR} and ${VAR:-default} patterns with environment variables
    while [[ "$value" =~ \$\{([^}]+)\} ]]; do
        local pattern="${BASH_REMATCH[0]}"
        local var_part="${BASH_REMATCH[1]}"
        
        if [[ "$var_part" == *:-* ]]; then
            # Has default value: ${VAR:-default}
            local var_name="${var_part%%:-*}"
            local default_value="${var_part#*:-}"
            local env_value="${!var_name:-}"
            if [[ -n "$env_value" ]]; then
                value="${value/$pattern/$env_value}"
            else
                value="${value/$pattern/$default_value}"
            fi
        else
            # No default value: ${VAR}
            local env_value="${!var_part:-}"
            if [[ -n "$env_value" ]]; then
                value="${value/$pattern/$env_value}"
            else
                value="${value/$pattern/}"
            fi
        fi
    done
    
    echo "$value"
}

# Get configuration values
DB_TYPE=$(get_config "database.type")
STORAGE_TYPE=$(get_config "storage.type")
AUTH_TYPE=$(get_config "auth.type")
IMGPROXY_TYPE=$(get_config "imgproxy.type")

log_info "Configuration loaded:"
log_info "  Database: $DB_TYPE"
log_info "  Storage: $STORAGE_TYPE"
log_info "  Auth: $AUTH_TYPE"
log_info "  Imgproxy: $IMGPROXY_TYPE"

# Create data directories
mkdir -p "$DATA_DIR/minio" "$DATA_DIR/postgres" "$DATA_DIR/sqlite"

#############################################
# DATABASE SETUP
#############################################
if [[ "$DB_TYPE" == "external" ]]; then
    DATABASE_URL=$(get_config "database.url")
    export DATABASE_URL
    
    log_info "Using external PostgreSQL database"
    log_info "Waiting for database to be ready..."
    
    # Wait for database to be ready
    local max_attempts=30
    local attempt=1
    while ! pg_isready -h "$(echo "$DATABASE_URL" | sed -E 's|.*@([^:]+):.*|\1|' | sed 's|/.*||')" >/dev/null 2>&1; do
        if [[ $attempt -ge $max_attempts ]]; then
            log_error "Database is not available after $max_attempts attempts"
            exit 1
        fi
        log_info "  Waiting for database... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    log_info "Database is ready"
    
elif [[ "$DB_TYPE" == "sqlite" ]]; then
    log_info "Using embedded SQLite database"
    export DATABASE_URL="file:$DATA_DIR/sqlite/contento.db"
    
    # For SQLite, we need a different approach - using a local connection
    # But drizzle-orm with postgres-js doesn't support SQLite directly
    # This would require changing the DB driver
    log_warn "SQLite support requires code changes to use better-sqlite3"
    log_warn "Falling back to external PostgreSQL mode"
    DB_TYPE="external"
fi

# If not external and not sqlite, default to external with default URL
if [[ "$DB_TYPE" != "external" ]]; then
    log_warn "Unknown database type: $DB_TYPE, defaulting to external"
    DB_TYPE="external"
fi

# Get the final DATABASE_URL
DATABASE_URL=$(get_config "database.url")
export DATABASE_URL

#############################################
# RUN DATABASE MIGRATIONS
#############################################
log_info "Running database migrations..."
pnpm db:migrate
log_info "Migrations completed"

#############################################
# STORAGE SETUP (MinIO)
#############################################
if [[ "$STORAGE_TYPE" == "minio" ]]; then
    log_info "Starting embedded MinIO server..."
    
    MINIO_ROOT_USER=$(get_config "storage.accessKey")
    MINIO_ROOT_PASSWORD=$(get_config "storage.secretKey")
    MINIO_BUCKET=$(get_config "storage.bucket")
    
    export MINIO_ROOT_USER
    export MINIO_ROOT_PASSWORD
    
    # Start MinIO in background
    minio server "$DATA_DIR/minio" --console-address ":9001" \
        --access-key "$MINIO_ROOT_USER" \
        --secret-key "$MINIO_ROOT_PASSWORD" \
        > /var/log/minio.log 2>&1 &
    
    MINIO_PID=$!
    log_info "MinIO started (PID: $MINIO_PID)"
    
    # Wait for MinIO to be ready
    log_info "Waiting for MinIO to be ready..."
    local max_attempts=30
    local attempt=1
    while ! curl -f http://localhost:9000/minio/health/live >/dev/null 2>&1; do
        if ! kill -0 $MINIO_PID 2>/dev/null; then
            log_error "MinIO process died"
            cat /var/log/minio.log
            exit 1
        fi
        if [[ $attempt -ge $max_attempts ]]; then
            log_error "MinIO is not ready after $max_attempts attempts"
            cat /var/log/minio.log
            exit 1
        fi
        log_info "  Waiting for MinIO... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    log_info "MinIO is ready"
    
    # Create bucket if it doesn't exist
    log_info "Ensuring bucket '$MINIO_BUCKET' exists..."
    mc alias set minio http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" 2>/dev/null || true
    mc mb minio/"$MINIO_BUCKET" 2>/dev/null || true
    mc anonymous set download minio/"$MINIO_BUCKET" 2>/dev/null || true
    
    # Set internal endpoint for the app
    export MINIO_ENDPOINT="http://localhost:9000"
    export MINIO_PUBLIC_ENDPOINT=$(get_config "storage.publicEndpoint")
    if [[ -z "$MINIO_PUBLIC_ENDPOINT" ]]; then
        MINIO_PUBLIC_ENDPOINT="http://localhost:9000"
    fi
    
elif [[ "$STORAGE_TYPE" == "external" ]]; then
    log_info "Using external S3-compatible storage"
    
    export MINIO_ENDPOINT=$(get_config "storage.endpoint")
    export MINIO_ROOT_USER=$(get_config "storage.accessKey")
    export MINIO_ROOT_PASSWORD=$(get_config "storage.secretKey")
    export MINIO_PUBLIC_ENDPOINT=$(get_config "storage.publicEndpoint")
    
    # If no public endpoint is set, use the internal endpoint
    if [[ -z "$MINIO_PUBLIC_ENDPOINT" ]]; then
        MINIO_PUBLIC_ENDPOINT="$MINIO_ENDPOINT"
    fi
fi

# Ensure MINIO_ENDPOINT is set
if [[ -z "${MINIO_ENDPOINT:-}" ]]; then
    MINIO_ENDPOINT="http://localhost:9000"
    export MINIO_ENDPOINT
fi

#############################################
# AUTHENTICATION SETUP
#############################################
if [[ "$AUTH_TYPE" == "oidc" ]]; then
    log_info "Using OIDC authentication"
    
    export AUTHENTIK_ISSUER=$(get_config "auth.oidc.issuer")
    export AUTHENTIK_CLIENT_ID=$(get_config "auth.oidc.clientId")
    export AUTHENTIK_CLIENT_SECRET=$(get_config "auth.oidc.clientSecret")
    export DEV_AUTH="0"
    
elif [[ "$AUTH_TYPE" == "dev" ]]; then
    log_info "Using dev authentication (built-in user)"
    
    export DEV_AUTH="1"
    export DEV_AUTH_USERNAME=$(get_config "auth.dev.username")
    export DEV_AUTH_PASSWORD=$(get_config "auth.dev.password")
    export DEV_AUTH_SECRET=$(get_config "auth.dev.secret")
    
    # Validate production settings
    if [[ "${NODE_ENV:-production}" == "production" ]]; then
        if [[ "$DEV_AUTH_SECRET" == "dev-auth-secret-change-in-production" ]]; then
            log_error "DEV_AUTH_SECRET must be changed in production!"
            exit 1
        fi
        if [[ "$DEV_AUTH_USERNAME" == "admin" && "$DEV_AUTH_PASSWORD" == "admin" ]]; then
            log_error "Default admin credentials must be changed in production!"
            exit 1
        fi
    fi
else
    log_error "Unknown auth type: $AUTH_TYPE"
    exit 1
fi

#############################################
# IMGPROXY SETUP
#############################################
if [[ "$IMGPROXY_TYPE" == "embedded" ]]; then
    log_info "Starting embedded imgproxy..."
    
    export IMGPROXY_KEY=$(get_config "imgproxy.key")
    export IMGPROXY_SALT=$(get_config "imgproxy.salt")
    export IMGPROXY_ALLOW_INSECURE=$(get_config "imgproxy.allowInsecure")
    
    # Configure imgproxy to use S3
    export IMGPROXY_USE_S3="true"
    export AWS_ACCESS_KEY_ID="$MINIO_ROOT_USER"
    export AWS_SECRET_ACCESS_KEY="$MINIO_ROOT_PASSWORD"
    export IMGPROXY_S3_ENDPOINT="$MINIO_ENDPOINT"
    export IMGPROXY_S3_REGION="us-east-1"
    export IMGPROXY_S3_FORCE_PATH_STYLE="true"
    export IMGPROXY_ALLOWED_SOURCES="s3://"
    export IMGPROXY_MAX_SRC_RESOLUTION="50"
    export IMGPROXY_JPEG_PROGRESSIVE="true"
    export IMGPROXY_AUTO_ROTATE="true"
    
    # Start imgproxy in background
    imgproxy > /var/log/imgproxy.log 2>&1 &
    IMGPROXY_PID=$!
    log_info "imgproxy started (PID: $IMGPROXY_PID)"
    
    # Wait for imgproxy to be ready
    log_info "Waiting for imgproxy to be ready..."
    local max_attempts=30
    local attempt=1
    while ! curl -f http://localhost:8080/health >/dev/null 2>&1; do
        if ! kill -0 $IMGPROXY_PID 2>/dev/null; then
            log_error "imgproxy process died"
            cat /var/log/imgproxy.log
            exit 1
        fi
        if [[ $attempt -ge $max_attempts ]]; then
            log_error "imgproxy is not ready after $max_attempts attempts"
            cat /var/log/imgproxy.log
            exit 1
        fi
        log_info "  Waiting for imgproxy... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    log_info "imgproxy is ready"
    
    export IMGPROXY_ENDPOINT="http://localhost:8080"
    
elif [[ "$IMGPROXY_TYPE" == "external" ]]; then
    log_info "Using external imgproxy"
    
    export IMGPROXY_ENDPOINT=$(get_config "imgproxy.endpoint")
    export IMGPROXY_KEY=$(get_config "imgproxy.key")
    export IMGPROXY_SALT=$(get_config "imgproxy.salt")
    export IMGPROXY_ALLOW_INSECURE=$(get_config "imgproxy.allowInsecure")
fi

# Ensure IMGPROXY_ENDPOINT is set
if [[ -z "${IMGPROXY_ENDPOINT:-}" ]]; then
    IMGPROXY_ENDPOINT="http://localhost:8080"
    export IMGPROXY_ENDPOINT
fi

#############################################
# APPLICATION SETUP
#############################################
log_info "Configuring application..."

export PUBLIC_URL=$(get_config "app.url")
export NEXTAUTH_URL="$PUBLIC_URL"
export NEXTAUTH_SECRET=$(get_config "app.nextauthSecret")
export CONTENTO_SIGNED_URL_SECRET=$(get_config "app.signedUrlSecret")
export AUTH_TRUST_HOST=$(get_config "app.trustHost")

# Validate required settings
if [[ -z "$NEXTAUTH_SECRET" || "$NEXTAUTH_SECRET" == "changeme_nextauth_secret_32chars" ]]; then
    if [[ "${NODE_ENV:-production}" == "production" ]]; then
        log_error "NEXTAUTH_SECRET must be set to a strong random value in production!"
        exit 1
    else
        log_warn "NEXTAUTH_SECRET is not set, using a default (development only)"
        NEXTAUTH_SECRET="dev-secret-$(openssl rand -hex 16)"
        export NEXTAUTH_SECRET
    fi
fi

#############################################
# START NEXT.JS APPLICATION
#############################################
log_info "Starting Contento application..."
log_info "Public URL: $PUBLIC_URL"

# Execute the original CMD
exec "$@"
