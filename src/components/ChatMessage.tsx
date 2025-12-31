import { Box, HStack, Text } from "@chakra-ui/react";

interface ChatMessageProps {
  role: "user" | "assistant";
  text: string;
  timestamp?: string;
}

/**
 * ChatMessage Component
 * Displays individual chat messages in conversation
 * - User messages: right-aligned with icon
 * - Assistant messages: left-aligned with icon
 */
export function ChatMessage({ role, text, timestamp }: ChatMessageProps) {
  const isUser = role === "user";
  const avatarBg = isUser
    ? { base: "blue.200", _dark: "blue.800" }
    : { base: "gray.200", _dark: "gray.700" };
  const bubbleBg = isUser
    ? { base: "blue.100", _dark: "blue.900" }
    : { base: "gray.100", _dark: "gray.800" };
  const bubbleColor = isUser
    ? { base: "blue.900", _dark: "blue.50" }
    : { base: "gray.900", _dark: "gray.100" };
  const timestampColor = { base: "gray.500", _dark: "gray.400" };

  return (
    <HStack
      width="100%"
      justifyContent={isUser ? "flex-end" : "flex-start"}
      paddingX={4}
      paddingY={2}
      gap={3}
    >
      {!isUser && (
        <Box
          minWidth={8}
          height={8}
          borderRadius="50%"
          backgroundColor={avatarBg}
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="sm"
          flexShrink={0}
        >
          🤖
        </Box>
      )}

      <Box maxWidth="70%" wordBreak="break-word">
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
        <Box
          minWidth={8}
          height={8}
          borderRadius="50%"
          backgroundColor={avatarBg}
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="sm"
          flexShrink={0}
        >
          👤
        </Box>
      )}
    </HStack>
  );
}
