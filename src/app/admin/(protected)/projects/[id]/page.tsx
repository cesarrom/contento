import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Key, Files, Globe, Lock, Settings } from "lucide-react";
import { ProjectSettingsForm } from "@/components/project-settings-form";
import { DeleteProjectButton } from "@/components/delete-project-button";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
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

  const publicFileUrl = `${process.env.PUBLIC_URL ?? "http://localhost:3000"}/f/${project.slug}/`;

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> All Projects
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-sm font-mono text-gray-400 mt-0.5">{project.slug}</p>
        </div>
        <Badge variant={project.visibility === "public" ? "default" : "secondary"}>
          {project.visibility === "public" ? (
            <Globe className="h-3 w-3 mr-1" />
          ) : (
            <Lock className="h-3 w-3 mr-1" />
          )}
          {project.visibility}
        </Badge>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <Link href={`/admin/projects/${id}/keys`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <Key className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-sm">API Keys</p>
                <p className="text-xs text-gray-500">Manage access tokens</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/admin/projects/${id}/files`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <Files className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-sm">File Browser</p>
                <p className="text-xs text-gray-500">Browse stored files</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Separator className="mb-8" />

      {/* Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" /> Project Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Project ID</span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{project.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Bucket</span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{project.bucketName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">File delivery URL</span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded truncate max-w-48">{publicFileUrl}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Created</span>
            <span>{new Date(project.createdAt!).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Settings form */}
      <ProjectSettingsForm project={project} />

      <Separator className="my-8" />

      {/* Danger zone */}
      <div className="rounded-lg border border-red-200 p-4">
        <h3 className="text-sm font-semibold text-red-700 mb-1">Danger Zone</h3>
        <p className="text-xs text-gray-500 mb-3">
          Deleting a project removes all API keys from the database but does NOT delete the MinIO bucket or its files.
        </p>
        <DeleteProjectButton projectId={project.id} projectName={project.name} />
      </div>
    </div>
  );
}
