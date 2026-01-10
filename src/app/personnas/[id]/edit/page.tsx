"use client";

import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Menu,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
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
  const [promptOptions, setPromptOptions] = useState<PromptOption[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const basePromptRef = useRef("");
  const [promptState, setPromptState] = useState<AgentPromptState>({
    systemPrompt: "",
    version: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
          | { agent?: { agent_name?: string }; prompts?: PromptOption[] }
          | null;
        const prompts = (payload?.prompts || []) as PromptOption[];
        setAgentName(payload?.agent?.agent_name ?? "");
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
    basePromptRef.current = selectedPrompt.system_prompt;
    setIsDirty(false);
    setPromptState({
      systemPrompt: selectedPrompt.system_prompt,
      version: selectedPrompt.version,
    });
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

    if (!promptState.systemPrompt.trim()) {
      setError("Le prompt ne peut pas être vide.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const saveResponse = await withTimeout(
        "savePrompt",
        fetch(`/api/agents/${agentId}/prompts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_prompt: promptState.systemPrompt,
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
      toaster.create({
        title: "Prompt enregistré",
        description: "Vos modifications ont été sauvegardées.",
        type: "success",
      });
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

  return (
    <Container maxWidth="5xl" py={{ base: 8, md: 12 }} px={{ base: 4, md: 6 }}>
      <VStack gap={6} alignItems="stretch">
        <HStack align="flex-start" justify="space-between" gap={6} flexWrap="wrap">
          <Box>
            <Heading size="lg">Modifier le prompt</Heading>
            <Text color="fg.muted">{agentName || "Agent"}</Text>
          </Box>
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
        </HStack>

        {error && (
          <Box
            backgroundColor={{ base: "red.50", _dark: "red.900" }}
            borderRadius="md"
            padding={4}
            borderLeft="4px solid"
            borderLeftColor="red.500"
          >
            <Text color={{ base: "red.700", _dark: "red.200" }}>{error}</Text>
          </Box>
        )}

        <VStack gap={3} alignItems="stretch">
          <HStack gap={2} align="center" flexWrap="wrap" width="full">
            <HStack gap={2} flexWrap="wrap" flex="1">
            <Button
              size="sm"
              variant={editor?.isActive("heading", { level: 2 }) ? "solid" : "outline"}
              colorPalette="blue"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              disabled={!editor}
            >
              Section
            </Button>
            <Button
              size="sm"
              variant={editor?.isActive("bold") ? "solid" : "outline"}
              colorPalette="blue"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              disabled={!editor}
            >
              Gras
            </Button>
            <Button
              size="sm"
              variant={editor?.isActive("bulletList") ? "solid" : "outline"}
              colorPalette="blue"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              disabled={!editor}
            >
              Liste
            </Button>
            </HStack>
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
                disabled={!isDirty || isSaving}
                paddingInline={5}
              >
                Enregistrer
              </Button>
              <Button
                size="sm"
                variant="subtle"
                onClick={handlePublish}
                loading={isPublishing}
                disabled={!selectedPromptId || isSelectedPublished}
                paddingInline={5}
              >
                Publier
              </Button>
            </HStack>
          </HStack>
          <Box
            borderWidth="1px"
            borderColor={{ base: "gray.200", _dark: "gray.700" }}
            borderRadius="md"
            padding={4}
            minH="520px"
            fontSize="sm"
            _focusWithin={{ borderColor: "blue.500", boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)" }}
          >
            <EditorContent editor={editor} />
          </Box>
          <Text color="fg.muted" fontSize="sm">
            Utilisez les boutons pour ajouter des sections, du gras et des listes sans saisir la syntaxe Markdown.
          </Text>
        </VStack>

        <HStack justifyContent="flex-end" gap={3}>
          <Button variant="subtle" onClick={handleDiscard} disabled={isSaving} paddingInline={5}>
            Annuler
          </Button>
          <Button
            variant="subtle"
            onClick={handleSave}
            loading={isSaving}
            disabled={!isDirty || isSaving}
            paddingInline={5}
          >
            Enregistrer
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
}
