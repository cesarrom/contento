# Contento Docker Deployment

This directory contains files for deploying Contento as a self-contained Docker container, publishable to Docker Hub.

## Quick Start

### 1. Using Pre-built Image (Recommended)

```bash
# Pull the image from Docker Hub
docker pull contentocms/contento:latest

# Run with external PostgreSQL and S3
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/contento" \
  -e S3_ENDPOINT="https://s3.amazonaws.com" \
  -e S3_ACCESS_KEY="your-key" \
  -e S3_SECRET_KEY="your-secret" \
  -e S3_BUCKET="contento" \
  -e OIDC_ISSUER="https://your-oidc.com" \
  -e OIDC_CLIENT_ID="contento" \
  -e OIDC_CLIENT_SECRET="secret" \
  -e NEXTAUTH_SECRET="your-secret" \
  -e PUBLIC_URL="https://your-domain.com" \
  contentocms/contento:latest
```

### 2. Building from Source

```bash
# Clone and build
docker build -t contentocms/contento:latest .

# Run
docker run -d -p 3000:3000 contentocms/contento:latest
```

## Configuration

Contento uses a YAML configuration file combined with environment variables for flexibility.

### Configuration File

Mount your config file to `/etc/contento/config.yaml`:

```bash
docker run -v ./config.yaml:/etc/contento/config.yaml:ro ...
```

### Environment Variables

All config values can be overridden with environment variables using the `${VAR}` syntax in the YAML file, or by setting them directly.

### Sample Configurations

See the sample configuration files:

- [`config.minimal.yaml`](config.minimal.yaml) - Development with embedded MinIO
- [`config.production.external.yaml`](config.production.external.yaml) - Production with external services
- [`config.production.aws.yaml`](config.production.aws.yaml) - Production with AWS S3

## Storage Options

### Using Embedded MinIO

```yaml
storage:
  type: "minio"
  accessKey: "minioadmin"
  secretKey: "changeme_minio"
  bucket: "contento"
```

This starts MinIO inside the container. Access the console at port 9001.

### Using External S3 (AWS S3, DigitalOcean Spaces, Backblaze B2, etc.)

```yaml
storage:
  type: "external"
  endpoint: "https://s3.amazonaws.com"
  region: "us-east-1"
  accessKey: "${AWS_ACCESS_KEY_ID}"
  secretKey: "${AWS_SECRET_ACCESS_KEY}"
  bucket: "my-contento-bucket"
  forcePathStyle: false  # Set to true for MinIO/compatible services
```

### Supported S3-Compatible Providers

| Provider | Endpoint | Notes |
|----------|----------|-------|
| AWS S3 | `https://s3.amazonaws.com` | Use `forcePathStyle: false` |
| DigitalOcean Spaces | `https://nyc3.digitaloceanspaces.com` | |
| Backblaze B2 | `https://s3.us-west-000.backblazeb2.com` | |
| Wasabi | `https://s3.wasabisys.com` | |
| MinIO (external) | `https://your-minio.example.com` | |
| Cloudflare R2 | `https://your-account.r2.cloudflarestorage.com` | |

## Authentication Options

### Using OIDC (Authentik, Keycloak, Auth0, Okta, Google, etc.)

```yaml
auth:
  type: "oidc"
  oidc:
    issuer: "${OIDC_ISSUER}"
    clientId: "${OIDC_CLIENT_ID}"
    clientSecret: "${OIDC_CLIENT_SECRET}"
```

Environment variables:
- `OIDC_ISSUER` - The OIDC provider URL
- `OIDC_CLIENT_ID` - Your OAuth client ID
- `OIDC_CLIENT_SECRET` - Your OAuth client secret

#### Provider Examples

**Authentik:**
```
OIDC_ISSUER=https://authentik.example.com/application/o/contento/
```

**Keycloak:**
```
OIDC_ISSUER=https://keycloak.example.com/realms/master
```

**Auth0:**
```
OIDC_ISSUER=https://your-tenant.auth0.com/
```

**Okta:**
```
OIDC_ISSUER=https://your-domain.okta.com/oauth2/default
```

**Google:**
```
OIDC_ISSUER=https://accounts.google.com
```

### Using Dev Auth (Development Only)

```yaml
auth:
  type: "dev"
  dev:
    username: "admin"
    password: "admin"
    secret: "change-this-in-production"
```

⚠️ **Warning**: Dev auth should never be used in production unless you change the credentials and secret!

## Database Options

### Using External PostgreSQL

```yaml
database:
  type: "external"
  url: "${DATABASE_URL}"
```

Example: `postgresql://user:password@host:5432/contento?sslmode=require`

## Image Proxy Options

### Embedded imgproxy (Default)

```yaml
imgproxy:
  type: "embedded"
  key: "your-64-char-hex-key"
  salt: "your-64-char-hex-salt"
```

Generate keys:
```bash
xxd -g 2 -l 64 -p /dev/urandom | tr -d '\n'
```

### External imgproxy

```yaml
imgproxy:
  type: "external"
  endpoint: "https://imgproxy.example.com"
```

## Complete Production Example

```bash
docker run -d \
  --name contento \
  -p 3000:3000 \
  -p 9001:9001 \
  -v ./contento-data:/data \
  -v ./config.yaml:/etc/contento/config.yaml:ro \
  -e DATABASE_URL="postgresql://prod_user:secure_pass@db.example.com:5432/contento?sslmode=require" \
  -e NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  -e PUBLIC_URL="https://contento.example.com" \
  -e NODE_ENV=production \
  contentocms/contento:latest
```

With `config.yaml`:

```yaml
storage:
  type: "external"
  endpoint: "https://nyc3.digitaloceanspaces.com"
  region: "nyc3"
  accessKey: "${DO_ACCESS_KEY}"
  secretKey: "${DO_SECRET_KEY}"
  bucket: "contento-media"
  publicEndpoint: "https://cdn.example.com"
  forcePathStyle: false

auth:
  type: "oidc"
  oidc:
    issuer: "https://keycloak.example.com/realms/production"
    clientId: "contento"
    clientSecret: "${OIDC_CLIENT_SECRET}"

imgproxy:
  type: "embedded"
  key: "${IMGPROXY_KEY}"
  salt: "${IMGPROXY_SALT}"
  allowInsecure: "0"

app:
  url: "https://contento.example.com"
  nextauthSecret: "${NEXTAUTH_SECRET}"
  trustHost: "1"
```

## Ports

When running the container, these ports may be exposed:

| Port | Service | Description |
|------|---------|-------------|
| 3000 | Next.js | Main application |
| 9000 | MinIO API | S3 API (if using embedded MinIO) |
| 9001 | MinIO Console | MinIO web console (if using embedded MinIO) |
| 8080 | imgproxy | Image transformation (if using embedded imgproxy) |

## Volumes

| Path | Description |
|------|-------------|
| `/etc/contento/config.yaml` | Configuration file (read-only) |
| `/data` | Data directory (MinIO data, SQLite DB if used) |

## Health Check

The container includes a health check at `/api/health`. Docker uses this to determine container health.

## Troubleshooting

### Check logs
```bash
docker logs contento
```

### Check what's running inside
```bash
docker exec contento ps aux
```

### Access container shell
```bash
docker exec -it contento sh
```

### Test MinIO directly
```bash
docker exec contento mc alias set local http://localhost:9000 minioadmin changeme_minio
docker exec contento mc ls local/contento
```

### Check environment
```bash
docker exec contento env | sort
```

## Building for Docker Hub

```bash
# Build the image
docker build -t contentocms/contento:latest .

# Test locally
docker run -p 3000:3000 contentocms/contento:latest

# Tag for Docker Hub
docker tag contentocms/contento:latest contentocms/contento:v0.1.0

# Push to Docker Hub
docker push contentocms/contento:latest
docker push contentocms/contento:v0.1.0
```
