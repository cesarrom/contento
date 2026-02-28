"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (confirm !== projectName) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Project deleted");
      router.push("/admin");
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Project</DialogTitle>
          <DialogDescription>
            This will delete the project and all API keys. The MinIO bucket and
            its files will NOT be deleted. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>
            Type <span className="font-mono font-bold">{projectName}</span> to
            confirm
          </Label>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={projectName}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={confirm !== projectName || loading}
            onClick={handleDelete}
          >
            {loading ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
