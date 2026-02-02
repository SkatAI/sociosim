import { Box, IconButton, Textarea, BoxProps, Tooltip } from "@chakra-ui/react";
import { ArrowRight } from "lucide-react";
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
        textareaRef.current.style.height = "auto";
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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = e.target.value;
    setMessage(nextValue);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const nextHeight = Math.min(textareaRef.current.scrollHeight, 128);
      textareaRef.current.style.height = `${nextHeight}px`;
    }
  };

  return (
    <Box width="100%" {...containerProps}>
      <Box
        width="100%"
        padding={4}
        borderTop="none"
        backgroundColor="bg.surface"
        flexShrink={0}
        display="flex"
        justifyContent="center"
      >
        <Box width="80%" position="relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            minHeight={10}
            maxHeight={32}
            resize="none"
            flexGrow={1}
            overflow="hidden"
            backgroundColor="bg.surface"
            color="fg.default"
            borderColor="border.muted"
            borderRadius="2xl"
            paddingRight="2.75rem"
            _placeholder={{ color: "fg.subtle" }}
          />
          <Tooltip.Root openDelay={150}>
            <Tooltip.Trigger asChild>
              <IconButton
                aria-label="Envoyer"
                onClick={handleSendMessage}
                disabled={isLoading || !message.trim()}
                colorPalette="blue"
                position="absolute"
                right={1}
                top="50%"
                transform="translateY(calc(-50% - 4px))"
                borderRadius="full"
                width={8}
                height={8}
                minWidth={8}
              >
                <ArrowRight size={16} />
              </IconButton>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content px={3} py={2}>
                Envoyer
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
        </Box>
      </Box>
    </Box>
  );
}
