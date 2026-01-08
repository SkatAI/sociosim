import { readFile } from "fs/promises";
import path from "path";
import NewPersonnaForm from "./NewPersonnaForm";

export default async function NewPersonnaPage() {
  const templatePath = path.join(
    process.cwd(),
    "docs",
    "prompts",
    "template_agent_system_prompt.md"
  );
  const templatePrompt = await readFile(templatePath, "utf8");

  return <NewPersonnaForm templatePrompt={templatePrompt} />;
}
