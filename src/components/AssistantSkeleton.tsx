"use client";

import { HStack, Skeleton, SkeletonCircle, SkeletonText, Stack } from "@chakra-ui/react";

export function AssistantSkeleton() {
  return (
    <HStack width="100%" justifyContent="flex-start" paddingX={4} paddingY={2} gap={3}>
      <Stack gap="6" maxW="xs" width="full">
        <HStack width="full">
          <SkeletonCircle size="10" />
          <SkeletonText noOfLines={2} />
        </HStack>
        <Skeleton height="200px" />
      </Stack>
    </HStack>
  );
}
