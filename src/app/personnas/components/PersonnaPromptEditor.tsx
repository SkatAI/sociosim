"use client";

import { Box, Field, Heading, HStack, Text, VStack } from "@chakra-ui/react";
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
    <VStack align="stretch" gap={4} height="100%" minHeight={0} flex="1">
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
      <Field.Root display="flex" flexDirection="column" flex="1" minHeight={0} height="100%">
        <Heading size="md">Prompt du personna</Heading>
        <RichTextEditor.Root
          editor={editor}
          fontSize="sm"
          borderColor={{ base: "gray.200", _dark: "gray.700" }}
          _focusWithin={{
            borderColor: "blue.500",
            boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)",
          }}
          display="grid"
          gridTemplateRows="auto 1fr"
          flex="1"
          minHeight={0}
          height="100%"
          overflow="hidden"
          css={{
            "--content-min-height": "0px",
            "& .ProseMirror": {
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
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
            position="sticky"
            top={0}
            zIndex={1}
            backgroundColor="bg.surface"
            borderBottomWidth="1px"
            borderBottomColor="border.muted"
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
          <RichTextEditor.Content
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              overflow: "hidden",
            }}
          />
        </RichTextEditor.Root>
      </Field.Root>
    </VStack>
  );
}
