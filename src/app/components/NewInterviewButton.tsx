"use client";

import { IconButton, Tooltip } from "@chakra-ui/react";
import { CirclePlus } from "lucide-react";

type NewInterviewButtonProps = {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export default function NewInterviewButton({
  onClick,
  loading = false,
  disabled = false,
}: NewInterviewButtonProps) {
  return (
    <Tooltip.Root openDelay={150}>
      <Tooltip.Trigger asChild>
        <IconButton
          aria-label="Commencer un nouvel entretien"
          size="sm"
          variant="outline"
          rounded="full"
          colorPalette="blue"
          backgroundColor="blue.400"
          color="white"
          borderColor="blue.400"
          _hover={{ backgroundColor: "blue.500" }}
          onClick={onClick}
          loading={loading}
          disabled={disabled}
        >
          <CirclePlus size={18} />
        </IconButton>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content px={3} py={2}>
          Commencer un nouvel entretien
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  );
}
