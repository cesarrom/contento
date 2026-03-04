import { NextRequest, NextResponse } from "next/server";
import type { Project } from "@/lib/db/schema";
import { normalizeOrigin } from "@/lib/origins";
import { resolveProjectById, resolveProjectBySlug } from "@/lib/projects";

export type ProjectCorsKind = "api" | "raw" | "image" | "audio" | "video";

type RouteContext<TParams> = { params: Promise<TParams> };

type ProjectResolver<TParams> = (
  req: NextRequest,
  context: RouteContext<TParams>
) => Promise<Project | null>;

interface WithProjectCorsOptions<TParams> {
  kind: ProjectCorsKind;
  resolveProject: ProjectResolver<TParams>;
}

interface HandlerArgs<TParams> {
  req: NextRequest;
  context: RouteContext<TParams>;
  project: Project;
}

export type ProjectCorsHandler<TParams> = (
  args: HandlerArgs<TParams>
) => Promise<Response>;

export function withProjectCors<TParams>(
  options: WithProjectCorsOptions<TParams>,
  handler: ProjectCorsHandler<TParams>
) {
  return async function route(req: NextRequest, context: RouteContext<TParams>) {
    const project = await options.resolveProject(req, context);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const corsDecision = evaluateProjectOrigin(req, project);
    if (!corsDecision.allowed) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    if (req.method === "OPTIONS") {
      return buildPreflightResponse(req, corsDecision.origin);
    }

    const response = await handler({ req, context, project });
    return attachCorsHeaders(response, corsDecision.origin);
  };
}

export function withProjectSlugCors<TParams extends { projectSlug: string; path: string[] }>(
  kind: ProjectCorsKind,
  handler: ProjectCorsHandler<TParams>
) {
  return withProjectCors<TParams>(
    {
      kind,
      resolveProject: async (_req, { params }) => {
        const { projectSlug } = await params;
        return resolveProjectBySlug(projectSlug);
      },
    },
    handler
  );
}

export function withProjectIdCors<TParams extends { id: string }>(
  kind: ProjectCorsKind,
  handler: ProjectCorsHandler<TParams>
) {
  return withProjectCors<TParams>(
    {
      kind,
      resolveProject: async (_req, { params }) => {
        const { id } = await params;
        return resolveProjectById(id);
      },
    },
    handler
  );
}

export function createOptionsHandler(allowedMethods = "GET,OPTIONS") {
  return async function OPTIONS(req: NextRequest) {
    const origin = req.headers.get("origin") ?? "*";
    const requestedMethod = req.headers.get("access-control-request-method") ?? allowedMethods;
    const requestedHeaders =
      req.headers.get("access-control-request-headers") ?? "Authorization,Content-Type";

    const res = new NextResponse(null, { status: 204 });
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", requestedMethod);
    res.headers.set("Access-Control-Allow-Headers", requestedHeaders);
    res.headers.set("Access-Control-Max-Age", "86400");
    res.headers.append("Vary", "Origin");
    res.headers.append("Vary", "Access-Control-Request-Headers");
    return res;
  };
}

export const GENERIC_PROJECT_SLUG_OPTIONS = createOptionsHandler();
export const GENERIC_PROJECT_ID_OPTIONS = createOptionsHandler();

function evaluateProjectOrigin(req: NextRequest, project: Project): {
  allowed: boolean;
  origin?: string;
} {
  const headerOrigin = req.headers.get("origin");
  if (!headerOrigin) {
    return { allowed: true };
  }

  const normalizedRequestOrigin = normalizeOrigin(headerOrigin);
  if (!normalizedRequestOrigin) {
    return { allowed: false };
  }

  const requestOrigin = normalizedRequestOrigin;
  const requestHostOrigin = normalizeOrigin(req.nextUrl.origin);
  if (requestHostOrigin && requestHostOrigin === requestOrigin) {
    return { allowed: true, origin: requestOrigin };
  }

  const allowlist = project.allowedOrigins?.map((origin) => origin.toLowerCase()) ?? [];
  if (allowlist.includes(requestOrigin)) {
    return { allowed: true, origin: requestOrigin };
  }

  return { allowed: false };
}

function buildPreflightResponse(req: NextRequest, origin?: string) {
  const res = new NextResponse(null, { status: 204 });
  applyCorsHeaders(res, origin);

  const requestedMethod =
    req.headers.get("access-control-request-method") ??
    "GET,POST,PUT,PATCH,DELETE,OPTIONS";
  const requestedHeaders =
    req.headers.get("access-control-request-headers") ?? "Authorization,Content-Type";

  res.headers.set("Access-Control-Allow-Methods", requestedMethod);
  res.headers.set("Access-Control-Allow-Headers", requestedHeaders);
  res.headers.set("Access-Control-Max-Age", "86400");

  return res;
}

function attachCorsHeaders(response: Response, origin?: string) {
  if (!origin) return response;
  const res = new NextResponse(response.body, response);
  applyCorsHeaders(res, origin);
  return res;
}

function applyCorsHeaders(response: NextResponse, origin?: string) {
  if (!origin) return;
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.append("Vary", "Origin");
}
