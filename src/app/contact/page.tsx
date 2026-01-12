"use client";

import { Box, Container, Heading, Image, Link, Stack, Text } from "@chakra-ui/react";

export default function ContactPage() {
  return (
    <Container maxW="3xl" py={{ base: 8, md: 12 }}>
      <Stack gap={6}>
        <Box>
          <Image
            src="/logos/Logo_Universite_Gustave_Eiffel_2020.svg"
            alt="Université Gustave Eiffel"
            height="48px"
            width="auto"
          />
        </Box>
        <Stack gap={3}>
          <Heading size="lg">Contact</Heading>
          <Text>
            UMR LISIS - Laboratoire Interdisciplinaire Sciences, Innovations, Sociétés
          </Text>
          <Text>Université Gustave Eiffel, 5 bd Descartes</Text>
          <Text>F-77454 Marne-la-Vallée Cedex 02 - France</Text>
          <Link href="https://www.umr-lisis.fr" color="accent.primary">
            www.umr-lisis.fr
          </Link>
          <Link href="mailto:contact@sociomimesis.com" color="accent.primary">
            contact@sociomimesis.com
          </Link>
        </Stack>
      </Stack>
    </Container>
  );
}
