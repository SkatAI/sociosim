"use client";

import {
  Box,
  Button,
  Dialog,
  Field,
  Input,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
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
import PersonnaLayout from "@/app/personnas/components/PersonnaLayout";
import PersonnaLeftSidebar from "@/app/personnas/components/PersonnaLeftSidebar";
import PersonnaRightSidebar from "@/app/personnas/components/PersonnaRightSidebar";
import PersonnaPromptEditor from "@/app/personnas/components/PersonnaPromptEditor";
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
    document.body.classList.add("personna-layout");
    return () => {
      document.body.classList.remove("personna-layout");
    };
  }, []);

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
    <Box width="full" height="100%">
      <form onSubmit={handleSubmit} style={{ height: "100%" }}>
        <PersonnaLayout
          left={(
            <PersonnaLeftSidebar
              title="Créer un nouveau personna"
              subtitle="Renseignez un nom et une description."
            >
              <VStack align="stretch" gap={4}>
                <Field.Root>
                  <Field.Label fontSize="lg">Prénom</Field.Label>
                  <Input
                    value={agentName}
                    onChange={(event) => setAgentName(event.target.value)}
                    placeholder="Camille, Karim, Zoé, Alexis, Bilel, ..."
                    fontSize="sm"
                    paddingInlineStart={4}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label fontSize="lg">Description</Field.Label>
                  <Input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Étudiant curieux, négociateur expérimenté..."
                    fontSize="sm"
                    paddingInlineStart={4}
                  />
                </Field.Root>

                <Dialog.Root>
                  <Dialog.Trigger asChild>
                    <Button
                      variant="plain"
                      size="sm"
                      colorPalette="blue"
                      textDecoration="underline"
                      alignSelf="flex-start"
                    >
                      Comment générer un system prompt à partir d&apos;un entretien ?
                    </Button>
                  </Dialog.Trigger>
                  <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                      <Dialog.Content padding={8}>
                        <Dialog.Header>
                          <Dialog.Title>Aide</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                          <Text>
                            Le plus simple est de fournir à un chatbot (Claude, chatGPT, etc):
                            <br />- un pdf de l&apos;interview
                            <br />- un fichier de
                            <Button
                              asChild
                              variant="plain"
                              size="sm"
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
                            <br /> <br />
                            Le prompt suivant donne de bons résultats avec Claude.
                            <Box
                              as="span"
                              display="block"
                              marginTop={2}
                              paddingLeft={8}
                              fontFamily="mono"
                              fontSize="sm"
                              color="fg.muted"
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
                            <br />
                            Vous pouvez ensuite copier coller le resultat généré par l&apos;IA dans le champ ci-dessous.
                            <br />
                            Le template en markdown est disponible
                            <Button
                              asChild
                              variant="plain"
                              size="sm"
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
                        </Dialog.Body>
                        <Dialog.Footer>
                          <Dialog.ActionTrigger asChild>
                            <Button variant="outline">Fermer</Button>
                          </Dialog.ActionTrigger>
                        </Dialog.Footer>
                      </Dialog.Content>
                    </Dialog.Positioner>
                  </Portal>
                </Dialog.Root>
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
                  editorToolbarRight={(
                    <Button
                      type="submit"
                      size="sm"
                      variant="subtle"
                      loading={isSaving}
                      paddingInline={5}
                    >
                      Enregistrer
                    </Button>
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
      </form>
    </Box>
  );
}
