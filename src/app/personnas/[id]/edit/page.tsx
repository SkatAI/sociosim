"use client";

import {
  Box,
  Button,
  Container,
  HStack,
  Menu,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useEditor } from "@tiptap/react";
import { Markdown } from "@tiptap/markdown";
import Bold from "@tiptap/extension-bold";
import BulletList from "@tiptap/extension-bullet-list";
import Document from "@tiptap/extension-document";
import HeadingExtension from "@tiptap/extension-heading";
import ListItem from "@tiptap/extension-list-item";
import Paragraph from "@tiptap/extension-paragraph";
import TextExtension from "@tiptap/extension-text";
import { ChevronDown } from "lucide-react";
import { toaster } from "@/components/ui/toaster";
import PersonnaForm from "@/app/personnas/components/PersonnaForm";
import PromptReviewSidebar, {
  type CauldronReview,
} from "@/app/personnas/components/PromptReviewSidebar";
import { useAuthUser } from "@/hooks/useAuthUser";
import { withTimeout } from "@/lib/withTimeout";

type AgentPromptState = {
  systemPrompt: string;
  version: number;
};

type PromptOption = {
  id: string;
  system_prompt: string;
  version: number;
  last_edited: string;
  published: boolean;
  users?: { name?: string | null } | null;
};

export default function EditAgentPromptPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = typeof params.id === "string" ? params.id : "";
  const { user, isLoading: isAuthLoading } = useAuthUser();
  const [agentName, setAgentName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [promptOptions, setPromptOptions] = useState<PromptOption[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const basePromptRef = useRef("");
  const baseAgentRef = useRef({ agentName: "", description: "" });
  const [promptState, setPromptState] = useState<AgentPromptState>({
    systemPrompt: "",
    version: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setPromptState((current) =>
        current.systemPrompt === nextMarkdown ? current : { ...current, systemPrompt: nextMarkdown }
      );
      setIsDirty(nextMarkdown !== basePromptRef.current);
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
  });

  const isReviewCurrent = Boolean(
    review && reviewedContent.trim() === promptState.systemPrompt.trim()
  );

  const formatPromptLabel = (prompt: PromptOption) => {
    const date = new Date(prompt.last_edited);
    const pad2 = (value: number) => value.toString().padStart(2, "0");
    const formattedDate = Number.isNaN(date.getTime())
      ? "date-inconnue"
      : `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
    const editorName = prompt.users?.name || "Inconnu";
    const shortId = prompt.id.slice(0, 7);
    return `${formattedDate} ${editorName} ${shortId}`;
  };

  const applyPromptList = (prompts: PromptOption[], nextSelectedId?: string) => {
    setPromptOptions(prompts);
    const initialPrompt = nextSelectedId
      ? prompts.find((prompt) => prompt.id === nextSelectedId) || prompts[0]
      : prompts[0];
    if (initialPrompt) {
      setSelectedPromptId(initialPrompt.id);
      basePromptRef.current = initialPrompt.system_prompt;
      setIsDirty(false);
      setPromptState({
        systemPrompt: initialPrompt.system_prompt,
        version: initialPrompt.version,
      });
    } else {
      setSelectedPromptId("");
      basePromptRef.current = "";
      setIsDirty(false);
      setPromptState({
        systemPrompt: "",
        version: 0,
      });
    }
  };

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    if (!agentId) {
      setError("Agent introuvable.");
      setIsLoading(false);
      return;
    }

    const loadAgentPrompt = async () => {
      try {
        const response = await withTimeout(
          "loadAgentPrompts",
          fetch(`/api/agents/${agentId}/prompts`),
          15000
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          console.error("Error fetching agent prompt:", payload);
          setError("Impossible de charger le prompt.");
          setIsLoading(false);
          return;
        }

        const payload = (await response.json().catch(() => null)) as
          | { agent?: { agent_name?: string; description?: string | null }; prompts?: PromptOption[] }
          | null;
        const prompts = (payload?.prompts || []) as PromptOption[];
        const nextAgentName = payload?.agent?.agent_name ?? "";
        const nextDescription = payload?.agent?.description ?? "";
        setAgentName(nextAgentName);
        setDescription(nextDescription);
        baseAgentRef.current = { agentName: nextAgentName, description: nextDescription };
        applyPromptList(prompts);
      } catch (loadError) {
        console.error("Error loading agent prompt:", loadError);
        setError("Une erreur est survenue.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAgentPrompt();
  }, [agentId, isAuthLoading, router, user]);

  useEffect(() => {
    if (!editor) return;
    const currentMarkdown = editor.getMarkdown();
    if (currentMarkdown !== promptState.systemPrompt) {
      editor.commands.setContent(promptState.systemPrompt, { contentType: "markdown" });
    }
  }, [editor, promptState.systemPrompt]);

  const handlePromptSelection = (value: string) => {
    setSelectedPromptId(value);
    const selectedPrompt = promptOptions.find((prompt) => prompt.id === value);
    if (!selectedPrompt) return;
    setReview(null);
    setReviewedContent("");
    setReviewError(null);
    basePromptRef.current = selectedPrompt.system_prompt;
    setIsDirty(false);
    setPromptState({
      systemPrompt: selectedPrompt.system_prompt,
      version: selectedPrompt.version,
    });
  };

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

  const ensurePromptReview = async (content: string) => {
    if (review && isReviewCurrent) {
      return review;
    }
    return await reviewPrompt(content);
  };

  const handlePublish = async () => {
    if (!user?.id) {
      router.push("/login");
      return;
    }

    if (!selectedPromptId) {
      setError("Aucun prompt sélectionné.");
      return;
    }

    try {
      setIsPublishing(true);
      setError(null);

      const trimmedPrompt = promptState.systemPrompt.trim();
      if (!trimmedPrompt) {
        setError("Le prompt ne peut pas être vide.");
        return;
      }

      const reviewResult = await ensurePromptReview(trimmedPrompt);
      if (!reviewResult) {
        setError("Impossible de valider le prompt.");
        return;
      }
      if (reviewResult.status === "invalid") {
        setError("Le prompt a été refusé par la validation.");
        return;
      }

      const response = await withTimeout(
        "publishPrompt",
        fetch(`/api/agents/${agentId}/prompts/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ promptId: selectedPromptId }),
        }),
        15000
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        console.error("Error publishing prompt:", payload);
        setError("Impossible de publier le prompt.");
        return;
      }

      setPromptOptions((current) =>
        current.map((prompt) => ({
          ...prompt,
          published: prompt.id === selectedPromptId,
        }))
      );
      toaster.create({
        title: "Prompt publié",
        description: "Le prompt est maintenant actif pour les entretiens.",
        type: "success",
      });
    } catch (publishError) {
      console.error("Error publishing prompt:", publishError);
      setError("Une erreur est survenue lors de la publication.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      router.push("/login");
      return;
    }

    const trimmedName = agentName.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError("Le nom du personna est requis.");
      return;
    }

    if (!trimmedDescription) {
      setError("La description est requise.");
      return;
    }

    try {
      const trimmedPrompt = promptState.systemPrompt.trim();
      if (isDirty && !trimmedPrompt) {
        setError("Le prompt ne peut pas être vide.");
        return;
      }

      if (isDirty) {
        const reviewResult = await reviewPrompt(trimmedPrompt);
        if (!reviewResult) {
          setError("Impossible de valider le prompt.");
          return;
        }
        if (reviewResult.status === "invalid") {
          setError("Le prompt a été refusé par la validation.");
          return;
        }
      }

      setIsSaving(true);
      setError(null);

      const isAgentDirty =
        trimmedName !== baseAgentRef.current.agentName ||
        trimmedDescription !== baseAgentRef.current.description;
      let didSavePrompt = false;
      let didSaveAgent = false;

      if (isAgentDirty) {
        const updateResponse = await withTimeout(
          "updateAgent",
          fetch(`/api/agents/${agentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              agent_name: trimmedName,
              description: trimmedDescription,
            }),
          }),
          15000
        );

        if (!updateResponse.ok) {
          const payload = await updateResponse.json().catch(() => null);
          console.error("Error updating agent:", payload);
          setError("Impossible de mettre à jour le personna.");
          return;
        }
        baseAgentRef.current = { agentName: trimmedName, description: trimmedDescription };
        didSaveAgent = true;
      }

      if (isDirty) {
        const saveResponse = await withTimeout(
          "savePrompt",
          fetch(`/api/agents/${agentId}/prompts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_prompt: trimmedPrompt,
              edited_by: user.id,
            }),
          }),
          15000
        );

        if (!saveResponse.ok) {
          const payload = await saveResponse.json().catch(() => null);
          console.error("Error saving agent prompt:", payload);
          setError("Impossible d'enregistrer le prompt pour le moment.");
          return;
        }

        const refreshResponse = await withTimeout(
          "refreshPrompts",
          fetch(`/api/agents/${agentId}/prompts`),
          15000
        );

        if (!refreshResponse.ok) {
          const payload = await refreshResponse.json().catch(() => null);
          console.error("Error refreshing prompts:", payload);
          setError("Le prompt est enregistré mais la liste ne peut pas être mise à jour.");
          return;
        }

        const refreshedPayload = (await refreshResponse.json().catch(() => null)) as
          | { prompts?: PromptOption[] }
          | null;
        applyPromptList((refreshedPayload?.prompts || []) as PromptOption[]);
        didSavePrompt = true;
      }

      if (didSavePrompt) {
        toaster.create({
          title: "Prompt enregistré",
          description: "Vos modifications ont été sauvegardées.",
          type: "success",
        });
      } else if (didSaveAgent) {
        toaster.create({
          title: "Personna mis à jour",
          description: "Les informations du personna ont été enregistrées.",
          type: "success",
        });
      }
    } catch (saveError) {
      console.error("Error saving agent prompt:", saveError);
      setError("Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    router.push("/personnas");
  };

  if (isLoading) {
    return (
      <Container maxWidth="4xl" height="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={4}>
          <Spinner size="lg" color="blue.500" />
          <Text color="fg.muted">Chargement du prompt...</Text>
        </VStack>
      </Container>
    );
  }

  const selectedPrompt = promptOptions.find((prompt) => prompt.id === selectedPromptId);
  const isSelectedPublished = selectedPrompt?.published ?? false;
  const isAgentDirty =
    agentName.trim() !== baseAgentRef.current.agentName ||
    description.trim() !== baseAgentRef.current.description;
  const canSave = (isDirty || isAgentDirty) && !isSaving;

  return (
    <Container maxWidth="6xl" py={{ base: 8, md: 12 }} px={{ base: 4, md: 6 }}>
      <VStack gap={6} alignItems="center">
        <Box width="full">
          <PersonnaForm
            title="Modifier le prompt"
            subtitle={agentName || "Agent"}
            error={error}
            agentName={agentName}
            onAgentNameChange={setAgentName}
            description={description}
            onDescriptionChange={setDescription}
            editor={editor}
            onSubmit={(event) => {
              event.preventDefault();
              handleSave();
            }}
            submitLabel="Enregistrer"
            isSubmitting={isSaving}
            showSubmitButton={false}
            sidebar={(
              <PromptReviewSidebar
                review={review}
                reviewError={reviewError}
                isReviewing={isReviewing}
                isCurrent={Boolean(isReviewCurrent)}
              />
            )}
            headerActions={(
              <VStack gap={1} alignItems="flex-end">
                <Menu.Root positioning={{ placement: "bottom-end" }}>
                  <Menu.Trigger asChild>
                    <Button
                      variant="subtle"
                      size="sm"
                      minWidth={{ base: "full", sm: "320px" }}
                      justifyContent="space-between"
                      gap={3}
                      disabled={promptOptions.length === 0}
                    >
                      <Text
                        fontSize="sm"
                        color={selectedPrompt ? "fg.default" : "fg.muted"}
                        truncate
                      >
                        {selectedPrompt ? formatPromptLabel(selectedPrompt) : "Aucun prompt disponible"}
                      </Text>
                      <ChevronDown size={16} />
                    </Button>
                  </Menu.Trigger>
                  <Menu.Positioner>
                    <Menu.Content minWidth={{ base: "full", sm: "320px" }} maxHeight="320px" overflowY="auto">
                      {promptOptions.map((prompt) => (
                        <Menu.Item
                          key={prompt.id}
                          value={prompt.id}
                          onClick={() => handlePromptSelection(prompt.id)}
                          fontWeight={prompt.id === selectedPromptId ? "semibold" : "normal"}
                          color={
                            prompt.published
                              ? { base: "red.600", _dark: "red.300" }
                              : "fg.default"
                          }
                        >
                          {formatPromptLabel(prompt)}
                        </Menu.Item>
                      ))}
                    </Menu.Content>
                  </Menu.Positioner>
                </Menu.Root>
              </VStack>
            )}
            editorToolbarRight={(
              <>
                <Text
                  fontSize="sm"
                  color={
                    isSelectedPublished
                      ? "fg.default"
                      : "fg.muted"
                  }
                  fontWeight={
                    isSelectedPublished
                      ? "semibold"
                      : "normal"
                  }
                >
                  {isSelectedPublished ? "Publié" : "Brouillon"}
                </Text>
                <HStack gap={2} flex="1" justify="flex-end" flexWrap="wrap">
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={handleSave}
                    loading={isSaving}
                    disabled={!canSave}
                    paddingInline={5}
                  >
                    Enregistrer
                  </Button>
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={handlePublish}
                    loading={isPublishing}
                    disabled={
                      !selectedPromptId ||
                      isSelectedPublished ||
                      isReviewing ||
                      review?.status === "invalid"
                    }
                    paddingInline={5}
                  >
                    Publier
                  </Button>
                </HStack>
              </>
            )}
            footer={(
              <HStack justifyContent="flex-end" gap={3}>
                <Button variant="subtle" onClick={handleDiscard} disabled={isSaving} paddingInline={5}>
                  Annuler
                </Button>
                <Button
                  variant="subtle"
                  onClick={handleSave}
                  loading={isSaving}
                  disabled={!canSave}
                  paddingInline={5}
                >
                  Enregistrer
                </Button>
              </HStack>
            )}
          />
        </Box>
      </VStack>
    </Container>
  );
}
