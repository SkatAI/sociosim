import { Box, Button, HStack, Textarea, BoxProps } from "@chakra-ui/react";
import { useRef, useState } from "react";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  containerProps?: BoxProps;
}

/**
 * MessageInput Component
 * Textarea with send button for user messages
 * - Wrapped in a standardized Box for consistent dimensions
 * - Enter to send, Shift+Enter for new line
 * - Disabled while loading
 */
export function MessageInput({
  onSendMessage,
  isLoading = false,
  placeholder = "Tapez votre message...",
  containerProps = {},
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (unless Shift+Enter)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box width="100%" {...containerProps}>
      <HStack
        width="100%"
        padding={4}
        gap={2}
        borderTop="1px solid"
        borderTopColor="border.muted"
        backgroundColor="bg.surface"
        flexShrink={0}
      >
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          minHeight={12}
          maxHeight={32}
          resize="vertical"
          flexGrow={1}
          backgroundColor="bg.surface"
          color="fg.default"
          borderColor="border.muted"
          _placeholder={{ color: "fg.subtle" }}
        />
        <Button
          onClick={handleSendMessage}
          disabled={isLoading || !message.trim()}
          colorPalette="blue"
          minWidth={16}
          height={12}
        >
          {isLoading ? "..." : "Envoyer"}
        </Button>
      </HStack>
    </Box>
  );
}
