"use client";

import { Container, Heading, List, Stack, Text } from "@chakra-ui/react";

export default function TermsPage() {
  return (
    <Container maxW="4xl" py={{ base: 8, md: 12 }}>
      <Stack gap={6}>
        <Heading size="lg">Conditions d&apos;utilisation</Heading>

        <Text>
          Les présentes conditions d&apos;utilisation encadrent l&apos;accès et l&apos;usage de Mimesis.
          En utilisant la plateforme, vous acceptez ces conditions.
        </Text>

        <Stack gap={3}>
          <Heading size="md">Éditeur et propriété</Heading>
          <Text>
            L&apos;application a été réalisée par Skatai SAS (Siret 978 308 294 00013),
            31 rue Pierre Semard 75009 Paris.
          </Text>
          <Text>
            L&apos;application est la propriété de l&apos;Université Gustave Eiffel.
          </Text>
        </Stack>

        <Stack gap={3}>
          <Heading size="md">Accès au service</Heading>
          <Text>
            L&apos;accès à certaines fonctionnalités nécessite un compte. Vous êtes responsable
            de la confidentialité de vos identifiants et des actions effectuées via votre compte.
          </Text>
        </Stack>

        <Stack gap={3}>
          <Heading size="md">Usage acceptable</Heading>
          <Text>Vous vous engagez à :</Text>
          <List.Root pl={4} styleType="disc">
            <List.Item>Ne pas utiliser le service à des fins illégales.</List.Item>
            <List.Item>Ne pas tenter d&apos;accéder aux données d&apos;autrui.</List.Item>
            <List.Item>Ne pas perturber le fonctionnement de la plateforme.</List.Item>
          </List.Root>
        </Stack>

        <Stack gap={3}>
          <Heading size="md">Contenus</Heading>
          <Text>
            Vous restez responsable des contenus que vous saisissez. L&apos;éditeur se réserve
            le droit de retirer tout contenu inapproprié ou contraire à la réglementation.
          </Text>
        </Stack>

        <Stack gap={3}>
          <Heading size="md">Disponibilité</Heading>
          <Text>
            Le service est fourni « en l&apos;état ». Des interruptions temporaires peuvent
            survenir pour maintenance ou raisons techniques.
          </Text>
        </Stack>

        <Stack gap={3}>
          <Heading size="md">Modification des conditions</Heading>
          <Text>
            Ces conditions peuvent être mises à jour. La date de dernière mise à jour
            est indiquée sur cette page.
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Dernière mise à jour : 12 janvier 2026
          </Text>
        </Stack>
      </Stack>
    </Container>
  );
}
