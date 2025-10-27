// app/components/Header.tsx
"use client";
import { Box, Flex, HStack, Link, Text } from "@chakra-ui/react";

export default function Header() {
  return (
    <Box as="header" bg="white" borderBottomWidth="1px">
      <Flex
        maxW="6xl"
        mx="auto"
        px={{ base: 4, md: 6 }}
        py={4}
        align="center"
        justify="space-between"
      >
        <Text fontWeight="bold" fontSize="lg">
          Sociosim
        </Text>

        <HStack gap={4}>
          <Link href="/register" fontWeight="medium" color="teal.600">
            Créer un compte
          </Link>
          <Link href="/login" fontWeight="medium" color="gray.700">
            Se connecter
          </Link>
        </HStack>
      </Flex>
    </Box>
  );
}
