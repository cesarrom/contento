import { db } from "@/lib/db/client";
import { projects, type Project } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function resolveProjectBySlug(slug: string): Promise<Project | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);
  return project ?? null;
}

export async function resolveProjectById(id: string): Promise<Project | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return project ?? null;
}
