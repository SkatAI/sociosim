import { readFile } from "fs/promises";
import path from "path";
import { marked } from "marked";

export async function renderMarkdownFromPublic(relativePath: string) {
  const filePath = path.join(process.cwd(), "public", relativePath);
  const markdown = await readFile(filePath, "utf8");
  return marked.parse(markdown);
}
