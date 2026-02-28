# ── Full-codec static FFmpeg binary ───────────────────────────────────────────
# mwader/static-ffmpeg is compiled with ALL codecs:
# H.264, H.265, VP8/9, AV1, AAC, MP3, Opus, Vorbis, FLAC, AC3, etc.
# Alpine's default apk ffmpeg omits patent-encumbered codecs — don't use it.
FROM mwader/static-ffmpeg:7 AS ffmpeg

# ── Base ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
COPY --from=ffmpeg /ffmpeg /usr/local/bin/ffmpeg
COPY --from=ffmpeg /ffprobe /usr/local/bin/ffprobe
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# ── Builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ── Runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy drizzle migrations so db:migrate can run at startup
COPY --from=builder /app/drizzle ./drizzle

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
