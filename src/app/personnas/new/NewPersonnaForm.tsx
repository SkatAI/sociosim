"use client";

import {
  Box,
  Button,
  Container,
  Dialog,
  Field,
  Heading,
  HStack,
  Input,
  Portal,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { supabase } from "@/lib/supabaseClient";

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

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.push("/login");
    }
  }, [isAuthLoading, router, user]);

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
      setIsSaving(true);
      setError(null);

      const { data: agentData, error: agentError } = await supabase
        .from("agents")
        .insert({
          agent_name: trimmedName,
          description: trimmedDescription,
        })
        .select("id")
        .single();

      if (agentError || !agentData) {
        console.error("Error creating agent:", agentError);
        setError("Impossible de créer le personna.");
        return;
      }

      const { error: promptError } = await supabase.from("agent_prompts").insert({
        agent_id: agentData.id,
        system_prompt: trimmedPrompt,
        edited_by: user.id,
        version: 1,
        published: false,
      });

      if (promptError) {
        console.error("Error creating agent prompt:", promptError);
        setError("Le personna est créé, mais le prompt n'a pas pu être enregistré.");
        return;
      }

      router.push(`/personnas/${agentData.id}/edit`);
    } catch (submitError) {
      console.error("Error creating personna:", submitError);
      setError("Une erreur est survenue lors de la création.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container maxWidth="4xl" py={{ base: 8, md: 12 }} px={{ base: 4, md: 6 }}>
      <VStack gap={6} alignItems="stretch">
        <Box>
          <Heading size="lg">Créer un nouveau personna</Heading>
          <Text color="fg.muted">
            Renseignez un nom, une description et le prompt système de l&apos;agent.
          </Text>
        </Box>

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

        <form onSubmit={handleSubmit}>
          <VStack gap={4} alignItems="stretch">
            <Field.Root>
              <Field.Label fontSize="lg">Nom du personna</Field.Label>
              <Input
                value={agentName}
                onChange={(event) => setAgentName(event.target.value)}
                placeholder="Nom de l'agent"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize="lg">Description</Field.Label>
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Courte description de l'agent"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize="lg">Prompt système</Field.Label>
              <HStack gap={2} align="center" flexWrap="wrap">
                <Text color="fg.muted" fontSize="md">
                  Ecrire le system prompt du nouveau personna.
                </Text>
                <Dialog.Root>
                  <Dialog.Trigger asChild>
                    <Button
                      variant="link"
                      size="sm"
                      colorPalette="blue"
                      textDecoration="underline"
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
                              variant="link"
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
    >Nous allons construire un system prompt pour une personna à partir d&apos;une interview sociologique de la personne réélle sur son usage de l&apos;IA.
    <br />Voir fichier pdf de l&apos;interview
    <br />Le but est de générer un fichier markdown suivant le template fourni.
    <br />Il faut renseigner tous les élèments entre acolades {"{"}{"}"}.
    <br />Ce fichier markdown servira de system prompt pour une personna dans une application de simulation d&apos;entretien en sociologie
    <br />Les élèments doivent être assez précis
    <br />Faisons un premier essai
    </Box>
    <br />Vous pouvez ensuite copier coller le resultat généré par l&apos;IA dans le champ ci-dessous.
    <br />Le template en markdown est disponible
                            <Button
                              asChild
                              variant="link"
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
              </HStack>
              <Textarea
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                minH="360px"
              />
            </Field.Root>

            <Button type="submit" colorPalette="blue" loading={isSaving} alignSelf="flex-end">
              Enregistrer
            </Button>
          </VStack>
        </form>
      </VStack>
    </Container>
  );
}
