"use client";

import { Box, Field, HStack, Text, VStack } from "@chakra-ui/react";
import type { ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { RichTextEditor, Control } from "@/components/ui/rich-text-editor";

type PersonnaPromptEditorProps = {
  editor: Editor | null;
  editorToolbarRight?: ReactNode;
  error?: string | null;
};

export default function PersonnaPromptEditor({
  editor,
  editorToolbarRight,
  error,
}: PersonnaPromptEditorProps) {
  return (
    <VStack align="stretch" gap={4} height="100%" minHeight={0}>
      {error ? (
        <Box
          backgroundColor={{ base: "red.50", _dark: "red.900" }}
          borderRadius="md"
          padding={4}
          borderLeft="4px solid"
          borderLeftColor="red.500"
        >
          <Text color={{ base: "red.700", _dark: "red.200" }}>{error}</Text>
        </Box>
      ) : null}
      <Field.Root display="flex" flexDirection="column" flex="1" minHeight={0}>
        <Field.Label fontSize="lg">Prompt système</Field.Label>
        <HStack gap={2} align="center" flexWrap="wrap">
          <Text color="fg.muted" fontSize="md">
            Ecrire le system prompt du personna.
          </Text>
        </HStack>
        <VStack gap={3} alignItems="stretch" flex="1" minHeight={0}>
          <RichTextEditor.Root
            editor={editor}
            fontSize="sm"
            borderColor={{ base: "gray.200", _dark: "gray.700" }}
            _focusWithin={{
              borderColor: "blue.500",
              boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)",
            }}
            display="flex"
            flexDirection="column"
            flex="1"
            minHeight={0}
            height="100%"
            css={{
              "--content-min-height": "0px",
              "& .ProseMirror": {
                flex: "1",
                minHeight: "0",
                height: "100%",
                maxHeight: "100%",
                overflowY: "auto",
              },
            }}
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
    </VStack>
  );
}
