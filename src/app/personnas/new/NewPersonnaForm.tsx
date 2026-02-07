"use client";

import { Box, Container, VStack } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { useEditor } from "@tiptap/react";
import { Markdown } from "@tiptap/markdown";
import Bold from "@tiptap/extension-bold";
import BulletList from "@tiptap/extension-bullet-list";
import Document from "@tiptap/extension-document";
import HeadingExtension from "@tiptap/extension-heading";
import ListItem from "@tiptap/extension-list-item";
import Paragraph from "@tiptap/extension-paragraph";
import TextExtension from "@tiptap/extension-text";
import { toaster } from "@/components/ui/toaster";
import PersonnaForm from "@/app/personnas/components/PersonnaForm";
import PromptReviewSidebar, {
  type CauldronReview,
} from "@/app/personnas/components/PromptReviewSidebar";
import { useAuthUser } from "@/hooks/useAuthUser";
import { withTimeout } from "@/lib/withTimeout";

type NewPersonnaFormProps = {
  templatePrompt: string;
};

export default function NewPersonnaForm({ templatePrompt }: NewPersonnaFormProps) {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthUser();
  const [agentName, setAgentName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(templatePrompt);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [review, setReview] = useState<CauldronReview | null>(null);
  const [reviewedContent, setReviewedContent] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      TextExtension,
      HeadingExtension.configure({ levels: [2] }),
      Bold,
      BulletList,
      ListItem,
      Markdown,
    ],
    content: "",
    contentType: "markdown",
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      const nextMarkdown = currentEditor.getMarkdown();
      setSystemPrompt((current) => (current === nextMarkdown ? current : nextMarkdown));
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
  });

  const isReviewCurrent = Boolean(
    review && reviewedContent.trim() === systemPrompt.trim()
  );

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.push("/login");
    }
  }, [isAuthLoading, router, user]);

  useEffect(() => {
    if (!editor) return;
    const currentMarkdown = editor.getMarkdown();
    if (currentMarkdown !== systemPrompt) {
      editor.commands.setContent(systemPrompt, { contentType: "markdown" });
    }
  }, [editor, systemPrompt]);

  const reviewPrompt = async (content: string) => {
    try {
      setIsReviewing(true);
      setReviewError(null);

      const response = await withTimeout(
        "reviewPrompt",
        fetch("/api/cauldron/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }),
        30000
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        console.error("Error validating prompt:", payload);
        setReviewError("Impossible de valider le prompt pour le moment.");
        return null;
      }

      const payload = (await response.json().catch(() => null)) as CauldronReview | null;
      if (!payload?.status) {
        console.error("Invalid cauldron response:", payload);
        setReviewError("La réponse de validation est invalide.");
        return null;
      }

      setReview(payload);
      setReviewedContent(content);
      return payload;
    } catch (reviewFailure) {
      console.error("Error validating prompt:", reviewFailure);
      setReviewError("Une erreur est survenue lors de la validation.");
      return null;
    } finally {
      setIsReviewing(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.id) {
      router.push("/login");
      return;
    }

    const trimmedName = agentName.trim();
    const trimmedDescription = description.trim();
    const trimmedPrompt = systemPrompt.trim();

    if (!trimmedName) {
      setError("Le nom du personna est requis.");
      return;
    }

    if (!trimmedDescription) {
      setError("La description est requise.");
      return;
    }

    if (!trimmedPrompt) {
      setError("Le prompt système est requis.");
      return;
    }

    try {
      const reviewResult = await reviewPrompt(trimmedPrompt);
      if (!reviewResult) {
        setError("Impossible de valider le prompt.");
        return;
      }
      if (reviewResult.status === "invalid") {
        setError("Le prompt a été refusé par la validation.");
        return;
      }

      setIsSaving(true);
      setError(null);

      const response = await withTimeout(
        "createPersonna",
        fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent_name: trimmedName,
            description: trimmedDescription,
            system_prompt: trimmedPrompt,
            edited_by: user.id,
          }),
        }),
        15000
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        console.error("Error creating personna:", payload);
        setError("Impossible de créer le personna.");
        return;
      }

      const payload = (await response.json().catch(() => null)) as { id?: string } | null;
      if (!payload?.id) {
        setError("Impossible de créer le personna.");
        return;
      }

      toaster.create({
        title: "Personna créé",
        description: "Le prompt a été enregistré et peut être édité.",
        type: "success",
      });
      router.push(`/personnas/${payload.id}/edit`);
    } catch (submitError) {
      console.error("Error creating personna:", submitError);
      setError("Une erreur est survenue lors de la création.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container maxWidth="6xl" py={{ base: 8, md: 12 }} px={{ base: 4, md: 6 }}>
      <VStack gap={6} alignItems="center">
        <Box width="full">
          <PersonnaForm
            title="Créer un nouveau personna"
            subtitle="Renseignez un nom, une description et le prompt système de l'agent."
            error={error}
            agentName={agentName}
            onAgentNameChange={setAgentName}
            description={description}
            onDescriptionChange={setDescription}
            editor={editor}
            onSubmit={handleSubmit}
            submitLabel="Enregistrer"
            isSubmitting={isSaving}
            sidebar={(
              <PromptReviewSidebar
                review={review}
                reviewError={reviewError}
                isReviewing={isReviewing}
                isCurrent={Boolean(isReviewCurrent)}
              />
            )}
          />
        </Box>
      </VStack>
    </Container>
  );
}
