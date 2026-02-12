"use client";

import {
  Box,
  Button,
  Collapsible,
  Field,
  HStack,
  Input,
  Menu,
  Textarea,
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
import { ChevronDown, ChevronUp } from "lucide-react";
import { toaster } from "@/components/ui/toaster";
import PersonnaLayout from "@/app/personnas/components/PersonnaLayout";
import PersonnaLeftSidebar from "@/app/personnas/components/PersonnaLeftSidebar";
import PersonnaPromptEditor from "@/app/personnas/components/PersonnaPromptEditor";
import PersonnaRightSidebar from "@/app/personnas/components/PersonnaRightSidebar";
import PromptReviewSidebar, {
  type CauldronReview,
} from "@/app/personnas/components/PromptReviewSidebar";
import NewInterviewButton from "@/app/components/NewInterviewButton";
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
  const [isSavingAgent, setIsSavingAgent] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<CauldronReview | null>(null);
  const [reviewedContent, setReviewedContent] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
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
      ? "date inconnue"
      : `${date.toLocaleDateString("fr-FR", { month: "short", day: "numeric" })} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
    const editorName = prompt.users?.name || "Inconnu";
    const prefix = prompt.published ? "[publié] " : "";
    return `${prefix}${formattedDate} - ${editorName}`;
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

  useEffect(() => {
    document.body.classList.add("personna-layout");
    return () => {
      document.body.classList.remove("personna-layout");
    };
  }, []);

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

  const handleNewInterview = async () => {
    if (!user?.id) {
      router.push("/login");
      return;
    }
    try {
      setIsCreatingSession(true);
      const response = await withTimeout(
        "createSession",
        fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, agent_id: agentId }),
        }),
        15000
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Impossible de créer une nouvelle session");
        return;
      }
      const data = await response.json();
      router.push(
        `/interview?interviewId=${data.interviewId}&sessionId=${data.sessionId}&adkSessionId=${data.adkSessionId}`
      );
    } catch (err) {
      console.error("Error creating session:", err);
      setError("Une erreur est survenue lors de la création de la session");
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleSaveAgent = async () => {
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
      setIsSavingAgent(true);
      setError(null);

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
      toaster.create({
        title: "Personna mis à jour",
        description: "Les informations du personna ont été enregistrées.",
        type: "success",
      });
    } catch (saveError) {
      console.error("Error saving agent:", saveError);
      setError("Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSavingAgent(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!user?.id) {
      router.push("/login");
      return;
    }

    const trimmedPrompt = promptState.systemPrompt.trim();
    if (!trimmedPrompt) {
      setError("Le prompt ne peut pas être vide.");
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

      setIsSavingPrompt(true);
      setError(null);

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
      toaster.create({
        title: "Prompt enregistré",
        description: "Vos modifications ont été sauvegardées.",
        type: "success",
      });
    } catch (saveError) {
      console.error("Error saving agent prompt:", saveError);
      setError("Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSavingPrompt(false);
    }
  };

  if (isLoading) {
    return (
      <Box maxWidth="4xl" height="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={4}>
          <Spinner size="lg" color="blue.500" />
          <Text color="fg.muted">Chargement du prompt...</Text>
        </VStack>
      </Box>
    );
  }

  const selectedPrompt = promptOptions.find((prompt) => prompt.id === selectedPromptId);
  const isSelectedPublished = selectedPrompt?.published ?? false;
  const isAgentDirty =
    agentName.trim() !== baseAgentRef.current.agentName ||
    description.trim() !== baseAgentRef.current.description;

  return (
    <Box width="full" height="100%">
        <PersonnaLayout
          left={(
            <PersonnaLeftSidebar
              title={agentName || "Agent"}
              titleColor="blue.600"
              titleRight={(
                <NewInterviewButton
                  onClick={handleNewInterview}
                  loading={isCreatingSession}
                  disabled={isCreatingSession}
                />
              )}
            >
              <VStack align="stretch" gap={4}>
                <Field.Root>
                  <Field.Label fontSize="sm">Prénom</Field.Label>
                  <Input
                    size="xs"
                    value={agentName}
                    onChange={(event) => setAgentName(event.target.value)}
                    placeholder="Camille, Karim, Zoé, Alexis, Bilel, ..."
                    paddingInlineStart={4}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label fontSize="sm">Description</Field.Label>
                  <Textarea
                    size="xs"
                    rows={2}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Étudiant curieux, négociateur expérimenté..."
                    paddingInlineStart={4}
                    resize="none"
                  />
                </Field.Root>

                <Button
                  size="sm"
                  variant="subtle"
                  onClick={handleSaveAgent}
                  loading={isSavingAgent}
                  disabled={!isAgentDirty || isSavingAgent}
                  alignSelf="flex-end"
                  paddingInline={5}
                >
                  Modifier
                </Button>

                <Collapsible.Root open={helpOpen} onOpenChange={({ open }) => setHelpOpen(open)}>
                  <Collapsible.Trigger asChild>
                    <Button
                      variant="plain"
                      size="xs"
                      alignSelf="flex-start"
                      paddingInline={0}
                      color="fg.muted"
                    >
                      <Text fontSize="xs">Comment générer un system prompt ?</Text>
                      {helpOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </Button>
                  </Collapsible.Trigger>
                  <Collapsible.Content>
                    <VStack align="stretch" gap={2} paddingTop={2}>
                      <Text fontSize="xs" color="fg.muted">
                        Le plus simple est de fournir à un chatbot (Claude, chatGPT, etc):
                        <br />- un pdf de l&apos;interview
                        <br />- un fichier de{" "}
                        <Button
                          asChild
                          variant="plain"
                          size="xs"
                          colorPalette="blue"
                          textDecoration="underline"
                        >
                          <a
                            href="/docs/template_agent_system_prompt.md"
                            target="_blank"
                            rel="noreferrer"
                          >
                            template au format markdown
                          </a>
                        </Button>
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        Le prompt suivant donne de bons résultats avec Claude.
                      </Text>
                      <Box
                        fontFamily="mono"
                        fontSize="2xs"
                        color="fg.muted"
                        paddingLeft={3}
                      >
                        Nous allons construire un system prompt pour une personna à partir d&apos;une interview
                        sociologique de la personne réélle sur son usage de l&apos;IA.
                        <br />
                        Voir fichier pdf de l&apos;interview
                        <br />
                        Le but est de générer un fichier markdown suivant le template fourni.
                        <br />
                        Il faut renseigner tous les élèments entre acolades {"{"}{"}"}.
                        <br />
                        Ce fichier markdown servira de system prompt pour une personna dans une application de
                        simulation d&apos;entretien en sociologie
                        <br />
                        Les élèments doivent être assez précis
                        <br />
                        Faisons un premier essai
                      </Box>
                      <Text fontSize="xs" color="fg.muted">
                        Vous pouvez ensuite copier coller le resultat généré par l&apos;IA dans le champ ci-dessous.
                        Le template en markdown est disponible{" "}
                        <Button
                          asChild
                          variant="plain"
                          size="xs"
                          colorPalette="blue"
                          textDecoration="underline"
                        >
                          <a
                            href="/docs/template_agent_system_prompt.md"
                            target="_blank"
                            rel="noreferrer"
                          >
                            ici
                          </a>
                        </Button>
                      </Text>
                    </VStack>
                  </Collapsible.Content>
                </Collapsible.Root>

              </VStack>
            </PersonnaLeftSidebar>
          )}
          center={(
            <Box
              height="100%"
              maxWidth="720px"
              marginX="auto"
              paddingX={{ base: 4, lg: 6 }}
              paddingTop={{ base: 4, lg: 5 }}
              overflow="hidden"
              minHeight={0}
              display="flex"
              flexDirection="column"
            >
              <Box flex="1" minHeight={0} display="flex">
                <PersonnaPromptEditor
                  editor={editor}
                  error={error}
                  headingRight={(
                    <Menu.Root positioning={{ placement: "bottom-end" }}>
                      <Menu.Trigger asChild>
                        <Button
                          variant="subtle"
                          size="xs"
                          justifyContent="space-between"
                          gap={2}
                          disabled={promptOptions.length === 0}
                        >
                          <Text
                            fontSize="xs"
                            color={selectedPrompt ? "fg.default" : "fg.muted"}
                            truncate
                          >
                            {selectedPrompt ? formatPromptLabel(selectedPrompt) : "Aucun prompt disponible"}
                          </Text>
                          <ChevronDown size={14} />
                        </Button>
                      </Menu.Trigger>
                      <Menu.Positioner>
                        <Menu.Content maxHeight="320px" overflowY="auto" paddingX={2}>
                          {promptOptions.map((prompt) => (
                            <Menu.Item
                              key={prompt.id}
                              value={prompt.id}
                              onClick={() => handlePromptSelection(prompt.id)}
                              fontSize="xs"
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
                  )}
                  editorToolbarRight={(
                    <>
                      <Text
                        fontSize="sm"
                        color={isSelectedPublished ? "fg.default" : "fg.muted"}
                        fontWeight={isSelectedPublished ? "semibold" : "normal"}
                      >
                        {isSelectedPublished ? "Publié" : "Brouillon"}
                      </Text>
                      <HStack gap={2} flex="1" justify="flex-end" flexWrap="wrap">
                        <Button
                          size="sm"
                          variant="subtle"
                          onClick={handleSavePrompt}
                          loading={isSavingPrompt}
                          disabled={!isDirty || isSavingPrompt}
                          paddingInline={5}
                        >
                          Enregistrer
                        </Button>
                        <Button
                          size="sm"
                          colorPalette="blue"
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
                />
              </Box>
            </Box>
          )}
          right={(
            <PersonnaRightSidebar>
              <PromptReviewSidebar
                review={review}
                reviewError={reviewError}
                isReviewing={isReviewing}
                isCurrent={Boolean(isReviewCurrent)}
              />
            </PersonnaRightSidebar>
          )}
        />
    </Box>
  );
}
