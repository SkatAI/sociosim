"use client";

import {
  Box,
  Button,
  Dialog,
  Heading,
  HStack,
  IconButton,
  Portal,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ChevronsLeft, FileDown, FileText, Menu } from "lucide-react";
import { marked } from "marked";
import { useEffect, useState } from "react";
import { useBreakpointValue } from "@chakra-ui/react";

type InterviewStats = {
  answeredQuestions: number;
  inputTokens: number;
  outputTokens: number;
};

type InterviewSidebarProps = {
  agentDisplayName?: string;
  userName?: string;
  dateDisplay?: string;
  error?: string | null;
  stats: InterviewStats;
  onExportPdf: () => void;
  onExportGoogleDocs?: () => void;
  isExportingPdf?: boolean;
  isExportingGoogleDocs?: boolean;
  disableExport?: boolean;
};

export function InterviewSidebar({
  agentDisplayName,
  userName,
  dateDisplay,
  error,
  stats,
  onExportPdf,
  onExportGoogleDocs,
  isExportingPdf = false,
  isExportingGoogleDocs = false,
  disableExport = false,
}: InterviewSidebarProps) {
  const [introHtml, setIntroHtml] = useState<string>("");
  const [introPreview, setIntroPreview] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isCompact = useBreakpointValue({ base: true, lg: false }) ?? false;

  useEffect(() => {
    if (isCompact) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
  }, [isCompact]);

  useEffect(() => {
    let isMounted = true;

    async function loadIntro() {
      try {
        const response = await fetch("/docs/guide_entretien_court.md");
        if (!response.ok) {
          throw new Error("Failed to load interview guide");
        }
        const markdown = await response.text();
        if (isMounted) {
          const lines = markdown.split(/\r?\n/);
          const firstLineIndex = lines.findIndex((line) => line.trim().length > 0);
          const previewLine = firstLineIndex >= 0 ? lines[firstLineIndex].trim() : "";
          const remainingLines =
            firstLineIndex >= 0 ? lines.slice(firstLineIndex + 1) : [];
          if (remainingLines[0]?.trim() === "") {
            remainingLines.shift();
          }
          const remainingMarkdown = remainingLines.join("\n");
          const parsed = remainingMarkdown.trim()
            ? await marked.parse(remainingMarkdown)
            : "";
          setIntroPreview(previewLine);
          setIntroHtml(parsed);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[Interview] Failed to load guide:", errorMessage);
        if (isMounted) {
          setIntroPreview("");
          setIntroHtml("");
        }
      }
    }

    loadIntro();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      {isCompact && isCollapsed ? (
        <IconButton
          aria-label="Ouvrir le panneau"
          size="sm"
          variant="ghost"
          onClick={() => setIsCollapsed(false)}
          position="fixed"
          top="5rem"
          left={4}
          borderRadius="full"
          zIndex={30}
          backgroundColor="bg.subtle"
        >
          <Menu size={16} />
        </IconButton>
      ) : null}
      {isCompact && !isCollapsed ? (
        <Box
          position="fixed"
          inset={0}
          backgroundColor="rgba(15, 23, 42, 0.12)"
          zIndex={20}
          onClick={() => setIsCollapsed(true)}
        />
      ) : null}
      <Box
        width={
          isCompact
            ? "min(85vw, 320px)"
            : isCollapsed
              ? "56px"
              : "280px"
        }
        minWidth={
          isCompact
            ? "min(85vw, 320px)"
            : isCollapsed
              ? "56px"
              : "280px"
        }
      borderBottom={{ base: "1px solid", lg: "none" }}
      borderRight={{ base: "none", lg: "1px solid" }}
      borderRightColor={{ base: "transparent", lg: "rgba(15, 23, 42, 0.08)" }}
      backgroundColor="bg.subtle"
      padding={isCompact ? 4 : isCollapsed ? 2 : 4}
      position={isCompact ? "fixed" : "sticky"}
      top={0}
      left={isCompact ? 0 : "auto"}
      height={isCompact ? "100dvh" : "100%"}
      alignSelf={{ base: "stretch", lg: "flex-start" }}
      zIndex={25}
      overflow="hidden"
      transition={isCompact ? "transform 0.2s ease" : "width 0.2s ease, padding 0.2s ease"}
      transform={
        isCompact
          ? isCollapsed
            ? "translateX(-100%)"
            : "translateX(0)"
          : "translateX(0)"
      }
    >
      <IconButton
        aria-label={isCollapsed ? "Ouvrir le panneau" : "Réduire le panneau"}
        size="sm"
        variant="ghost"
        onClick={() => setIsCollapsed((prev) => !prev)}
        position="absolute"
        top={2}
        right={2}
        borderRadius="full"
      >
        {isCollapsed ? <Menu size={16} /> : <ChevronsLeft size={16} />}
      </IconButton>
      {error ? (
        <Heading as="h1" size="lg" color="red.600">
          Erreur: {error}
        </Heading>
      ) : (
        <Stack
          gap={4}
          opacity={isCollapsed ? 0 : 1}
          pointerEvents={isCollapsed ? "none" : "auto"}
          transition="opacity 0.2s ease"
        >
          <Stack gap={1}>
            <Heading as="h2" size="md">
              {agentDisplayName ?? "Chargement de l'entretien..."}
            </Heading>
            {agentDisplayName && userName && dateDisplay ? (
              <>
                <Text fontSize="sm">par {userName}</Text>
                <Text fontSize="sm">le {dateDisplay}</Text>
              </>
            ) : (
              <>
                <Text fontSize="sm">par ...</Text>
                <Text fontSize="sm">le ...</Text>
              </>
            )}
          </Stack>
          <Box
            height="1px"
            backgroundColor={{ base: "rgba(226, 232, 240, 0.6)", _dark: "rgba(31, 41, 55, 0.6)" }}
          />
          <Stack gap={1}>
            <Text fontSize="sm">
              {stats.answeredQuestions} responses
            </Text>
            <Text fontSize="sm">
              Tokens : {stats.inputTokens} → {stats.outputTokens}
            </Text>
          </Stack>
          <Box
            height="1px"
            backgroundColor={{ base: "rgba(226, 232, 240, 0.6)", _dark: "rgba(31, 41, 55, 0.6)" }}
          />
          <Stack gap={2}>
            <Heading as="h3" size="sm">
              Export
            </Heading>
            <Button
              size="sm"
              variant="outline"
              onClick={onExportPdf}
              loading={isExportingPdf}
              disabled={disableExport}
              paddingInline={4}
            >
              <HStack gap={2}>
                <FileDown size={16} />
                <Text as="span">PDF</Text>
              </HStack>
            </Button>
            {onExportGoogleDocs ? (
              <Button
                size="sm"
                variant="outline"
                colorPalette="blue"
                onClick={onExportGoogleDocs}
                loading={isExportingGoogleDocs}
                disabled={disableExport}
                paddingInline={4}
              >
                <HStack gap={2}>
                  <FileText size={16} />
                  <Text as="span">Google Docs</Text>
                </HStack>
              </Button>
            ) : null}
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <Button
                  variant="plain"
                  size="sm"
                  colorPalette="blue"
                  textDecoration="underline"
                >
                  Aide pour l&apos;entretien
                </Button>
              </Dialog.Trigger>
              <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                  <Dialog.Content padding={8}>
                    <Dialog.Header>
                      <Dialog.Title>Guide d&apos;entretien</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body>
                      <VStack align="stretch" gap={3}>
                        {introPreview ? (
                          <Text fontWeight="600">{introPreview}</Text>
                        ) : null}
                        {introHtml ? (
                          <Box
                            css={{
                              "& h2": { marginTop: "1.5rem", fontWeight: "600", color: "fg.default" },
                              "& h3": { marginTop: "1rem", fontWeight: "600", color: "fg.default" },
                              "& ul": { paddingLeft: "1.25rem", marginTop: "0.75rem" },
                              "& li": { marginBottom: "0.5rem" },
                              "& p": { marginBottom: "0.75rem" },
                              "& strong": { color: "fg.default" },
                            }}
                            dangerouslySetInnerHTML={{ __html: introHtml }}
                          />
                        ) : (
                          <Text color="fg.muted">Chargement du guide d&apos;entretien...</Text>
                        )}
                      </VStack>
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
          </Stack>
        </Stack>
      )}
    </Box>
    </>
  );
}
