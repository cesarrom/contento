import { db } from "@/lib/db/client";
import { projects, apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ApiKeyCreateForm } from "@/components/api-key-create-form";
import { ApiKeyList } from "@/components/api-key-list";

export const dynamic = "force-dynamic";

export default async function ProjectKeysPage({
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

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.projectId, id))
    .orderBy(apiKeys.createdAt);

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <Link
        href={`/admin/projects/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> {project.name}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
          <Badge variant="secondary">{keys.length}</Badge>
        </div>

      </div>

      <ApiKeyCreateForm projectId={id} />

      <Separator className="my-6" />

      <ApiKeyList projectId={id} initialKeys={keys} />
    </div>
  );
}
