import { Avatar, Box, HStack, Text } from "@chakra-ui/react";

interface ChatMessageProps {
  role: "user" | "assistant";
  text: string;
  userName?: string;
  agentName?: string;
  timestamp?: string;
}

/**
 * ChatMessage Component
 * Displays individual chat messages in conversation
 * - User messages: right-aligned with icon
 * - Assistant messages: left-aligned with icon
 */
export function ChatMessage({ role, text, userName, agentName, timestamp }: ChatMessageProps) {
  const isUser = role === "user";
  const bubbleBg = isUser
    ? { base: "blue.100", _dark: "blue.900" }
    : { base: "gray.100", _dark: "gray.800" };
  const bubbleColor = isUser
    ? { base: "blue.900", _dark: "blue.50" }
    : { base: "gray.900", _dark: "gray.100" };
  const timestampColor = { base: "gray.500", _dark: "gray.400" };
  const avatarName = isUser ? userName || "Utilisateur" : agentName || "Agent";

  return (
    <HStack
      width="100%"
      justifyContent={isUser ? "flex-end" : "flex-start"}
      align="flex-start"
      paddingX={4}
      paddingY={2}
      gap={3}
    >
      {!isUser && (
        <Avatar.Root size="sm" marginTop="2px">
          <Avatar.Fallback name={avatarName} />
        </Avatar.Root>
      )}

      <Box
        maxWidth={isUser ? "50%" : "70%"}
        width="fit-content"
        wordBreak="break-word"
      >
        <Box
          padding={3}
          borderRadius="md"
          backgroundColor={bubbleBg}
          color={bubbleColor}
        >
          <Text fontSize="sm" whiteSpace="pre-wrap">
            {text}
          </Text>
        </Box>
        {timestamp && (
          <Text fontSize="xs" color={timestampColor} marginTop={1}>
            {timestamp}
          </Text>
        )}
      </Box>

      {isUser && (
        <Avatar.Root size="sm" marginTop="2px">
          <Avatar.Fallback name={avatarName} />
        </Avatar.Root>
      )}
    </HStack>
  );
}
