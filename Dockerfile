# Contento - Self-Hosted Media CMS
# This Dockerfile supports both development and single-container production deployment

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 1: Full-codec FFmpeg (required for video/audio transcoding)
# ─────────────────────────────────────────────────────────────────────────────
# mwader/static-ffmpeg is compiled with ALL codecs:
# H.264, H.265, VP8/9, AV1, AAC, MP3, Opus, Vorbis, FLAC, AC3, etc.
# Alpine's default apk ffmpeg omits patent-encumbered codecs — don't use it.
FROM mwader/static-ffmpeg:latest AS ffmpeg

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 2: Base - Node.js + runtime dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

# Install FFmpeg
COPY --from=ffmpeg /ffmpeg /usr/local/bin/ffmpeg
COPY --from=ffmpeg /ffprobe /usr/local/bin/ffprobe

# Install core package manager
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install additional tools needed for single-container deployment
# - yq: YAML config parsing
# - mc: MinIO client for bucket management
# - curl: Health checks
# - postgresql-client: Database health checks
RUN apk add --no-cache \
    curl \
    postgresql-client \
    yq \
    && curl -s https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc \
    && chmod +x /usr/local/bin/mc

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 3: Dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 4: Builder
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 5: Runner (for docker-compose / development)
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 6: Full (single-container deployment with all services)
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS full

# Install imgproxy
RUN apk add --no-cache imgproxy

# Create directories
RUN mkdir -p /data/minio /data/postgres /data/sqlite /var/log /etc/contento

# Copy the Next.js standalone build
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy the entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create log files
RUN touch /var/log/minio.log /var/log/imgproxy.log

# Environment
ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV CONFIG_FILE=/etc/contento/config.yaml

# Expose ports
# 3000: Next.js app
# 9000: MinIO API
# 9001: MinIO Console
# 8080: imgproxy
EXPOSE 3000 9000 9001 8080

# Use non-root user
USER nextjs

# Health checks
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
