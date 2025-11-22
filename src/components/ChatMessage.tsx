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
          backgroundColor="gray.200"
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
          backgroundColor={isUser ? "blue.100" : "gray.100"}
          color={isUser ? "blue.900" : "gray.900"}
        >
          <Text fontSize="sm" whiteSpace="pre-wrap">
            {text}
          </Text>
        </Box>
        {timestamp && (
          <Text fontSize="xs" color="gray.500" marginTop={1}>
            {timestamp}
          </Text>
        )}
      </Box>

      {isUser && (
        <Box
          minWidth={8}
          height={8}
          borderRadius="50%"
          backgroundColor="blue.200"
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
