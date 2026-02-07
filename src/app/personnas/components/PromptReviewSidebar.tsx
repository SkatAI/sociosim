import { Box, Heading, Text, VStack } from "@chakra-ui/react";

type CauldronError = {
  code: string;
  message: string;
  detail?: string | null;
};

type CauldronCriteria = {
  name: string;
  justification: string;
};

export type CauldronReview = {
  status: "valid" | "invalid";
  errors: CauldronError[];
  quality: {
    criteria: CauldronCriteria[];
    advice: string;
  } | null;
};

type PromptReviewSidebarProps = {
  review: CauldronReview | null;
  reviewError?: string | null;
  isReviewing?: boolean;
  isCurrent?: boolean;
};

const statusCopy = (review: CauldronReview | null, isReviewing?: boolean) => {
  if (isReviewing) {
    return { label: "Analyse en cours…", color: "orange.600", bg: "orange.50" };
  }
  if (!review) {
    return { label: "Non vérifié", color: "gray.600", bg: "gray.50" };
  }
  if (review.status === "valid") {
    return { label: "Valide", color: "green.700", bg: "green.50" };
  }
  return { label: "Invalide", color: "red.700", bg: "red.50" };
};

export default function PromptReviewSidebar({
  review,
  reviewError,
  isReviewing,
  isCurrent = true,
}: PromptReviewSidebarProps) {
  const status = statusCopy(review, isReviewing);

  return (
    <Box
      borderWidth="1px"
      borderColor={{ base: "gray.200", _dark: "gray.700" }}
      borderRadius="lg"
      padding={5}
      backgroundColor={{ base: "white", _dark: "gray.900" }}
    >
      <VStack alignItems="stretch" gap={4}>
        <Heading size="sm">Validation du prompt</Heading>

        <Box borderRadius="md" padding={3} backgroundColor={status.bg}>
          <Text fontSize="sm" fontWeight="semibold" color={status.color}>
            {status.label}
          </Text>
          {!review && !isReviewing && (
            <Text fontSize="sm" color="fg.muted" marginTop={2}>
              Cliquez sur « Enregistrer » pour lancer l&apos;analyse du prompt.
            </Text>
          )}
        </Box>

        {reviewError && (
          <Box
            borderRadius="md"
            padding={3}
            backgroundColor={{ base: "red.50", _dark: "red.900" }}
            borderLeft="3px solid"
            borderLeftColor="red.500"
          >
            <Text fontSize="sm" color={{ base: "red.700", _dark: "red.200" }}>
              {reviewError}
            </Text>
          </Box>
        )}

        {review && !isCurrent && (
          <Box
            borderRadius="md"
            padding={3}
            backgroundColor={{ base: "yellow.50", _dark: "yellow.900" }}
            borderLeft="3px solid"
            borderLeftColor="yellow.500"
          >
            <Text fontSize="sm" color={{ base: "yellow.800", _dark: "yellow.100" }}>
              Le prompt a été modifié depuis la dernière validation. Relancez
              l&apos;enregistrement pour actualiser l&apos;analyse.
            </Text>
          </Box>
        )}

        {review?.status === "invalid" && (
          <VStack alignItems="stretch" gap={3}>
            <Text fontSize="sm" fontWeight="semibold">
              Explications
            </Text>
            {review.errors.length === 0 && (
              <Text fontSize="sm" color="fg.muted">
                Le service de validation a signalé un problème sans détail.
              </Text>
            )}
            {review.errors.map((error, index) => (
              <Box
                key={`${error.code}-${index}`}
                padding={3}
                borderRadius="md"
                backgroundColor={{ base: "gray.50", _dark: "gray.800" }}
              >
                <Text fontSize="sm" fontWeight="semibold">
                  {error.message}
                </Text>
                {error.detail && (
                  <Text fontSize="sm" color="fg.muted" marginTop={1}>
                    {error.detail}
                  </Text>
                )}
                <Text fontSize="xs" color="fg.muted" marginTop={2}>
                  Code : {error.code}
                </Text>
              </Box>
            ))}
          </VStack>
        )}

        {review?.status === "valid" && (
          <VStack alignItems="stretch" gap={3}>
            <Text fontSize="sm" fontWeight="semibold">
              Suggestions
            </Text>
            {review.quality?.advice && (
              <Box
                padding={3}
                borderRadius="md"
                backgroundColor={{ base: "gray.50", _dark: "gray.800" }}
              >
                <Text fontSize="sm">{review.quality.advice}</Text>
              </Box>
            )}
            {review.quality?.criteria?.length ? (
              <>
                <Box
                  height="1px"
                  backgroundColor={{ base: "gray.200", _dark: "gray.700" }}
                />
                <VStack alignItems="stretch" gap={3}>
                  {review.quality.criteria.map((criterion, index) => (
                    <Box key={`${criterion.name}-${index}`}>
                      <Text fontSize="sm" fontWeight="semibold">
                        {criterion.name}
                      </Text>
                      <Text fontSize="sm" color="fg.muted">
                        {criterion.justification}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              </>
            ) : (
              <Text fontSize="sm" color="fg.muted">
                Aucun conseil supplémentaire pour ce prompt.
              </Text>
            )}
          </VStack>
        )}
      </VStack>
    </Box>
  );
}
