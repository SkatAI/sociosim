"use client";

import { Box, Button, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import { FileDown, FileText } from "lucide-react";
import type { ReactNode } from "react";

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
  helpSlot?: ReactNode;
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
  helpSlot,
}: InterviewSidebarProps) {
  return (
    <Box
      width={{ base: "100%", lg: "280px" }}
      borderBottom={{ base: "1px solid", lg: "none" }}
      borderRight={{ base: "none", lg: "1px solid" }}
      borderColor={{ base: "rgba(226, 232, 240, 0.6)", _dark: "rgba(31, 41, 55, 0.6)" }}
      backgroundColor="bg.subtle"
      padding={4}
      position={{ base: "static", lg: "sticky" }}
      top={0}
      height={{ base: "auto", lg: "100vh" }}
      alignSelf={{ base: "stretch", lg: "flex-start" }}
      zIndex={5}
    >
      {error ? (
        <Heading as="h1" size="lg" color="red.600">
          Erreur: {error}
        </Heading>
      ) : (
        <Stack gap={4}>
          <Stack gap={1}>
            <Heading as="h2" size="md">
              {agentDisplayName ?? "Chargement de l'entretien..."}
            </Heading>
            {agentDisplayName && userName && dateDisplay ? (
              <>
                <Text>par {userName}</Text>
                <Text>le {dateDisplay}</Text>
              </>
            ) : (
              <>
                <Text>par ...</Text>
                <Text>le ...</Text>
              </>
            )}
          </Stack>
          <Stack gap={1}>
            <Text fontWeight="medium">Informations</Text>
            <Text>Questions utilisateur : {stats.answeredQuestions}</Text>
            <Text>
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
            {helpSlot}
          </Stack>
        </Stack>
      )}
    </Box>
  );
}
