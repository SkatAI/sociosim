"use client";

import { Box, Container, HStack, Image, Link, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";

export default function Footer() {
  return (
    <Box as="footer" borderTopWidth="1px" borderTopColor="border.muted" mt={10}>
      <Container maxW="6xl" px={{ base: 4, md: 6 }} py={6}>
        <Stack
          direction={{ base: "column", md: "row" }}
          align={{ base: "flex-start", md: "center" }}
          justify="space-between"
          gap={4}
        >
          <HStack gap={3}>
            <Image
              src="/logos/Logo_Universite_Gustave_Eiffel_2020.svg"
              alt="Université Gustave Eiffel"
              height="32px"
              width="auto"
            />
            <Text fontSize="sm" color="fg.muted">
              © Université Gustave Eiffel 2026
            </Text>
          </HStack>
          <HStack gap={4} flexWrap="wrap">
            <Link as={NextLink} href="/contact" fontSize="sm" color="fg.muted" _hover={{ color: "fg.default" }}>
              Contact
            </Link>
            <Link
              as={NextLink}
              href="/politique-de-confidentialite"
              fontSize="sm"
              color="fg.muted"
              _hover={{ color: "fg.default" }}
            >
              Politique de confidentialité
            </Link>
            <Link
              as={NextLink}
              href="/conditions-d-utilisation"
              fontSize="sm"
              color="fg.muted"
              _hover={{ color: "fg.default" }}
            >
              Conditions d&apos;utilisation
            </Link>
          </HStack>
        </Stack>
      </Container>
    </Box>
  );
}
