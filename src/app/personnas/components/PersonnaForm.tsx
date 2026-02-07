"use client";

import { type FormEvent, type ReactNode } from "react";
import {
  Box,
  Button,
  Dialog,
  Field,
  Heading,
  HStack,
  Input,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { type Editor } from "@tiptap/react";
import { RichTextEditor, Control } from "@/components/ui/rich-text-editor";

type PersonnaFormProps = {
  title: string;
  subtitle: string;
  error?: string | null;
  agentName: string;
  onAgentNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  editor: Editor | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  isSubmitting?: boolean;
  showSubmitButton?: boolean;
  headerActions?: ReactNode;
  editorToolbarRight?: ReactNode;
  footer?: ReactNode;
  sidebar?: ReactNode;
};

export default function PersonnaForm({
  title,
  subtitle,
  error,
  agentName,
  onAgentNameChange,
  description,
  onDescriptionChange,
  editor,
  onSubmit,
  submitLabel,
  isSubmitting,
  showSubmitButton = true,
  headerActions,
  editorToolbarRight,
  footer,
  sidebar,
}: PersonnaFormProps) {
  const mainContent = (
    <VStack gap={6} alignItems="stretch">
      <HStack align="flex-start" justify="space-between" gap={6} flexWrap="wrap">
        <Box>
          <Heading size="lg">{title}</Heading>
          <Text color="fg.muted">{subtitle}</Text>
        </Box>
        {headerActions}
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

      <form onSubmit={onSubmit}>
        <VStack gap={4} alignItems="stretch">
          <Field.Root>
            <Field.Label fontSize="lg">Prénom</Field.Label>
            <Input
              value={agentName}
              onChange={(event) => onAgentNameChange(event.target.value)}
              placeholder="Camille, Karim, Zoé, Alexis, Bilel, ..."
              fontSize="sm"
              paddingInlineStart={4}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="lg">Description</Field.Label>
            <Input
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Cursus, personnalité, ..."
              fontSize="sm"
              paddingInlineStart={4}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="lg">Prompt système</Field.Label>
            <HStack gap={2} align="center" flexWrap="wrap">
              <Text color="fg.muted" fontSize="md">
                Ecrire le system prompt du personna.
              </Text>
              <Dialog.Root>
                <Dialog.Trigger asChild>
                  <Button
                    variant="plain"
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
            </HStack>
            <VStack gap={3} alignItems="stretch">
              <RichTextEditor.Root
                editor={editor}
                fontSize="sm"
                borderColor={{ base: "gray.200", _dark: "gray.700" }}
                _focusWithin={{
                  borderColor: "blue.500",
                  boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)",
                }}
                css={{ "--content-min-height": "520px" }}
              >
                <HStack
                  gap={2}
                  align="center"
                  flexWrap="wrap"
                  width="full"
                  paddingX={4}
                  paddingTop={3}
                  paddingBottom={2}
                >
                  <HStack gap={2} flexWrap="wrap" flex="1">
                    <RichTextEditor.ControlGroup>
                      <Control.H2 />
                      <Control.Bold />
                      <Control.BulletList />
                    </RichTextEditor.ControlGroup>
                  </HStack>
                  {editorToolbarRight}
                </HStack>
                <RichTextEditor.Content />
              </RichTextEditor.Root>
              <Text color="fg.muted" fontSize="sm">
                Utilisez les icônes pour ajouter des sections, du gras et des listes sans saisir la syntaxe Markdown.
              </Text>
            </VStack>
          </Field.Root>

          {showSubmitButton && (
            <Button type="submit" variant="subtle" loading={isSubmitting} alignSelf="flex-end" paddingInline={6}>
              {submitLabel}
            </Button>
          )}
          {footer}
        </VStack>
      </form>
    </VStack>
  );

  if (!sidebar) {
    return mainContent;
  }

  return (
    <HStack
      align="flex-start"
      gap={{ base: 6, lg: 10 }}
      flexDirection={{ base: "column", lg: "row" }}
    >
      <Box flex="1" minWidth={0}>
        {mainContent}
      </Box>
      <Box width={{ base: "full", lg: "320px" }}>
        {sidebar}
      </Box>
    </HStack>
  );
}
