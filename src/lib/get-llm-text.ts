import { readFile } from "fs/promises";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getLLMText(page: any): Promise<string> {
  const file = page.file as { absolutePath?: string } | undefined;
  const filePath = file?.absolutePath;

  if (!filePath) {
    return `# ${page.data.title}\n\n${page.data.description ?? ""}`;
  }

  const raw = await readFile(filePath, "utf-8");

  // Strip YAML frontmatter (--- ... ---)
  const stripped = raw.replace(/^---[\s\S]*?---\n?/, "").trim();

  return `# ${page.data.title}\n\n${stripped}`;
}
