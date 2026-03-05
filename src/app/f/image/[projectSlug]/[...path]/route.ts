import { getObjectResponse } from "@/lib/minio";
import { buildImgproxyUrl, ImgproxyOptions } from "@/lib/imgproxy";
import { requireReadAccess, requireSignedToken, unauthorized } from "@/lib/f-proxy";
import { GENERIC_PROJECT_SLUG_OPTIONS, withProjectSlugCors } from "@/lib/project-cors";

export const dynamic = "force-dynamic";

function parseTransformParams(searchParams: URLSearchParams): ImgproxyOptions {
  const opts: ImgproxyOptions = {};
  const format = searchParams.get("format");
  if (format) opts.format = format;
  const w = searchParams.get("w");
  if (w) opts.width = parseInt(w, 10);
  const h = searchParams.get("h");
  if (h) opts.height = parseInt(h, 10);
  const q = searchParams.get("q");
  if (q) opts.quality = parseInt(q, 10);
  const blur = searchParams.get("blur");
  if (blur) opts.blur = parseFloat(blur);
  const fit = searchParams.get("fit");
  if (fit) {
    const normalized = fit.toLowerCase();
    if (normalized === "cover") opts.resizingType = "fill";
    else if (normalized === "contain") opts.resizingType = "fit";
    else if (normalized === "fit" || normalized === "fill" || normalized === "auto") {
      opts.resizingType = normalized as ImgproxyOptions["resizingType"];
    }
  }
  return opts;
}

export const GET = withProjectSlugCors<{ projectSlug: string; path: string[] }>(
  "image",
  async ({ req, context, project }) => {
    const { projectSlug, path: pathSegments } = await context.params;
    const filePath = pathSegments.join("/");
    const { searchParams } = new URL(req.url);

    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

    const hasTransform =
      searchParams.get("format") ||
      searchParams.get("w") ||
      searchParams.get("h") ||
      searchParams.get("q") ||
      searchParams.get("blur") ||
      searchParams.get("fit");

    const allowedQueryKeys = ["format", "w", "h", "q", "blur", "fit"];

    if (project.visibility === "private") {
      
      const okKey = await requireReadAccess(req, project.id);
      
      if (!okKey) {        
        const okToken = await requireSignedToken(req, {
          kind: "image",
          projectSlug,
          projectId: project.id,
          path: filePath,
          allowedQueryKeys,
        });
        
        
        if (!okToken) {
          return unauthorized();
        }
      }
    } else {
      console.log('[image] Public project, no auth required');
    }

    if (hasTransform) {
      const opts = parseTransformParams(searchParams);
      const source = `s3://${project.bucketName}/${filePath}`;
      const imgproxyUrl = buildImgproxyUrl(source, opts);

      let upstream: Response;
      try {
        upstream = await fetch(imgproxyUrl, {
          headers: {
            "User-Agent": "contento-backend-proxy",
          },
        });
      } catch {
        return Response.json(
          { error: "Upstream imgproxy unavailable" },
          { status: 502 }
        );
      }

      if (!upstream.ok) {
        let bodyText: string | null = null;
        try {
          bodyText = await upstream.text();
        } catch {
          // ignore
        }
        return Response.json(
          {
            error: "Imgproxy request failed",
            status: upstream.status,
            body: bodyText ? bodyText.slice(0, 500) : null,
          },
          { status: upstream.status }
        );
      }

      const headers = new Headers();
      const ct = upstream.headers.get("content-type");
      if (ct) headers.set("Content-Type", ct);
      const cl = upstream.headers.get("content-length");
      if (cl) headers.set("Content-Length", cl);
      const cc = upstream.headers.get("cache-control");
      if (cc) headers.set("Cache-Control", cc);

      if (!headers.has("Cache-Control") && project.deliveryCacheEnabled) {
        const ttl = Math.max(0, Math.floor(project.deliveryCacheTtlSeconds ?? 0));
        if (ttl > 0) {
          const hasAuthHeader = Boolean(req.headers.get("authorization"));
          headers.set(
            "Cache-Control",
            `${hasAuthHeader ? "private" : "public"}, max-age=${ttl}`
          );
        }
      }

      return new Response(upstream.body, {
        status: upstream.status,
        headers,
      });
    }

    const range = req.headers.get("range") ?? undefined;
    const obj = await getObjectResponse(project.bucketName, filePath, range);

    const headers = new Headers();
    headers.set("Accept-Ranges", "bytes");
    headers.set("Connection", "keep-alive");
    headers.set("Keep-Alive", "timeout=60, max=1000");
    if (obj.contentType) headers.set("Content-Type", obj.contentType);
    if (obj.contentLength != null) headers.set("Content-Length", String(obj.contentLength));
    if (obj.contentRange) headers.set("Content-Range", obj.contentRange);

    return new Response(obj.body as unknown as BodyInit, {
      status: range ? 206 : 200,
      headers,
    });
  }
);

export const OPTIONS = GENERIC_PROJECT_SLUG_OPTIONS;
