import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listObjects } from "@/lib/minio";
import { FileBrowser } from "@/components/file-browser";

export const dynamic = "force-dynamic";

export default async function ProjectFilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (!project) notFound();

  const objects = await listObjects(project.bucketName).catch(() => []);
  const files = objects.map((obj) => ({
    key: obj.Key ?? "",
    size: obj.Size ?? 0,
    lastModified: obj.LastModified?.toISOString() ?? null,
  }));

  const publicBaseUrl = `${process.env.PUBLIC_URL ?? "http://localhost:3000"}/f/${project.slug}`;

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <Link
        href={`/admin/projects/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> {project.name}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Files</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse and manage uploaded files</p>
        </div>
        <span className="text-sm text-muted-foreground font-mono">{project.bucketName}</span>
      </div>

      <FileBrowser
        projectId={id}
        initialFiles={files}
        publicBaseUrl={publicBaseUrl}
        isPublic={project.visibility === "public"}
      />
    </div>
  );
}
