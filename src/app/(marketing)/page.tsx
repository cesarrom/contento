import Link from "next/link";
import { ArrowRight, Upload, Key, Zap, Shield, Globe, FileVideo } from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Projects",
    description:
      "Isolated namespaces with their own S3 buckets, visibility controls, and API keys.",
  },
  {
    icon: Key,
    title: "API Keys",
    description:
      "Scoped keys (read / write / admin) with optional expiry. Issue one per integration.",
  },
  {
    icon: Zap,
    title: "Image transforms",
    description:
      "Resize, crop, convert format (WebP, AVIF, JPEG, PNG), adjust quality — all via URL params.",
  },
  {
    icon: FileVideo,
    title: "Video & Audio",
    description:
      "Convert between formats on demand. FFmpeg runs inline; result is cached for instant replay.",
  },
  {
    icon: Upload,
    title: "Signed URLs",
    description:
      "Generate presigned upload and read URLs. Clients upload directly to storage — no proxying.",
  },
  {
    icon: Shield,
    title: "SSO",
    description:
      "Admin UI protected by Authentik OIDC. No separate user management needed.",
  },
];

const steps = [
  {
    step: "1",
    title: "Upload",
    description: "Request a presigned PUT URL and upload directly from the client to MinIO.",
    code: `POST /api/v1/projects/:id/sign/upload
{ "path": "/audio/track.wav", "contentType": "audio/wav" }`,
  },
  {
    step: "2",
    title: "Sign a read URL",
    description: "Ask for a signed read URL, optionally with a format conversion.",
    code: `POST /api/v1/projects/:id/sign/read
{ "path": "/audio/track.wav", "transform": { "format": "mp3" } }`,
  },
  {
    step: "3",
    title: "Deliver",
    description: "Drop the URL into an <audio> tag. FFmpeg streams the conversion in real time.",
    code: `<audio src="https://your-domain.com/f/project/audio/track.wav?format=mp3" controls />`,
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground mb-8">
          Self-hosted · Open source · API-first
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight font-[family-name:var(--font-display)]">
          File management,
          <br />
          <span className="text-muted-foreground">without the SaaS tax.</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Contento is a self-hosted file platform inspired by Bytescale. Upload, transform, and
          deliver images, video, and audio — via a clean REST API and admin UI you control.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/docs/quick-start"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Get started <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-muted-foreground font-medium hover:bg-muted hover:text-foreground transition-colors"
          >
            Read the docs
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-muted-foreground font-medium hover:bg-muted hover:text-foreground transition-colors"
          >
            SSO Login
          </Link>
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="p-6 rounded-xl border border-border bg-card"
            >
              <Icon className="w-5 h-5 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-bold text-foreground mb-3 font-[family-name:var(--font-display)]">
            How it works
          </h2>
          <p className="text-muted-foreground mb-12 text-lg">
            Three API calls from upload to transformed delivery.
          </p>
          <div className="grid lg:grid-cols-3 gap-8">
            {steps.map(({ step, title, description, code }) => (
              <div key={step} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">
                    {step}
                  </span>
                  <h3 className="font-semibold text-foreground">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
                <pre className="text-xs bg-foreground text-background rounded-lg p-4 overflow-x-auto leading-relaxed max-w-full">
                  <code className="whitespace-pre-wrap break-words">{code}</code>
                </pre>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Self-hosting CTA */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="rounded-2xl border border-border bg-card p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2 font-[family-name:var(--font-display)]">
              One command to run it yourself
            </h2>
            <p className="text-muted-foreground">
              MinIO, imgproxy, and the Next.js app — all wired up with Docker Compose.
            </p>
            <pre className="mt-4 text-sm bg-foreground text-background rounded-lg px-4 py-3 inline-block">
              <code>docker compose up -d</code>
            </pre>
          </div>
          <Link
            href="/docs/self-hosting/docker-compose"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-muted-foreground font-medium hover:bg-muted hover:text-foreground transition-colors"
          >
            Self-hosting guide <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
