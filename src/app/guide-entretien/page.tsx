import { Box, Container } from "@chakra-ui/react";
import { readFile } from "fs/promises";
import path from "path";
import { marked } from "marked";

export default async function GuideEntretienPage() {
  const filePath = path.join(process.cwd(), "public/docs/guide_entretien.md");
  const markdown = await readFile(filePath, "utf8");
  const html = marked.parse(markdown);

  return (
    <Container maxW="4xl" py={12}>
      <Box
        className="markdown-content"
        css={{
          "& h1": { fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" },
          "& h2": { fontSize: "1.5rem", fontWeight: "semibold", marginTop: "2rem", marginBottom: "0.75rem" },
          "& h3": { fontSize: "1.25rem", fontWeight: "semibold", marginTop: "1.5rem", marginBottom: "0.5rem" },
          "& p": { marginBottom: "0.75rem", color: "var(--chakra-colors-fg-default)" },
          "& ul, & ol": { paddingLeft: "1.25rem", marginBottom: "0.75rem" },
          "& li": { marginBottom: "0.35rem" },
          "& blockquote": {
            borderLeft: "4px solid",
            borderColor: "var(--chakra-colors-border-muted)",
            paddingLeft: "1rem",
            marginY: "1rem",
            color: "var(--chakra-colors-fg-muted)",
          },
          "& table": {
            width: "100%",
            borderCollapse: "collapse",
            marginY: "1rem",
          },
          "& th, & td": {
            border: "1px solid",
            borderColor: "var(--chakra-colors-border-muted)",
            padding: "0.5rem",
            textAlign: "left",
            verticalAlign: "top",
          },
          "& hr": { borderColor: "var(--chakra-colors-border-muted)", marginY: "1.5rem" },
          "& strong": { fontWeight: "semibold" },
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </Container>
  );
}
