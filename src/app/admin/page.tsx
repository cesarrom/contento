import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen, Globe, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const all = await db.select().from(projects).orderBy(projects.createdAt);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your file storage projects</p>
        </div>
        <Link href="/admin/projects/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {all.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No projects yet</p>
          <p className="text-sm mt-1">Create your first project to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {all.map((project) => (
            <Link key={project.id} href={`/admin/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <Badge variant={project.visibility === "public" ? "default" : "secondary"}>
                      {project.visibility === "public" ? (
                        <Globe className="h-3 w-3 mr-1" />
                      ) : (
                        <Lock className="h-3 w-3 mr-1" />
                      )}
                      {project.visibility}
                    </Badge>
                  </div>
                  <CardDescription className="font-mono text-xs">{project.slug}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-400">
                    Bucket: <span className="font-mono">{project.bucketName}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Created {new Date(project.createdAt!).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
