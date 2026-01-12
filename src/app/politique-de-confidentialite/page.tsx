"use client";

import { Container, Heading, List, Stack, Text } from "@chakra-ui/react";

export default function PrivacyPolicyPage() {
  return (
    <Container maxW="4xl" py={{ base: 8, md: 12 }}>
      <Stack gap={6}>
        <Heading size="lg">Politique de confidentialité</Heading>

        <Text>
          Cette page décrit comment Mimesis collecte et traite vos données personnelles
          lorsque vous utilisez la plateforme.
        </Text>

        <Stack gap={3}>
          <Heading size="md">Données collectées</Heading>
          <Text>Nous pouvons collecter les informations suivantes :</Text>
          <List.Root pl={4} styleType="disc">
            <List.Item>Identifiants de compte (nom, email).</List.Item>
            <List.Item>Données de profil (rôle, préférences).</List.Item>
            <List.Item>Historique d&apos;entretiens et messages associés.</List.Item>
            <List.Item>Données techniques (journalisation, métriques d&apos;usage).</List.Item>
          </List.Root>
        </Stack>

        <Stack gap={3}>
          <Heading size="md">Finalités</Heading>
          <Text>Ces données sont utilisées pour :</Text>
          <List.Root pl={4} styleType="disc">
            <List.Item>Fournir et améliorer le service.</List.Item>
            <List.Item>Assurer la sécurité et prévenir les abus.</List.Item>
            <List.Item>Gérer les accès et le support.</List.Item>
          </List.Root>
        </Stack>

        <Stack gap={3}>
          <Heading size="md">Base légale</Heading>
          <Text>
            Les traitements reposent sur l&apos;exécution du service, l&apos;intérêt légitime
            (sécurité, amélioration), et le cas échéant le consentement.
          </Text>
        </Stack>

        <Stack gap={3}>
          <Heading size="md">Conservation</Heading>
          <Text>
            Les données sont conservées pendant la durée nécessaire aux finalités décrites,
            puis archivées ou supprimées conformément aux obligations légales.
          </Text>
        </Stack>

        <Stack gap={3}>
          <Heading size="md">Partage</Heading>
          <Text>
            Les données ne sont pas vendues. Elles peuvent être partagées avec des prestataires
            techniques nécessaires au fonctionnement de la plateforme (hébergement, authentification),
            dans le respect de la réglementation.
          </Text>
        </Stack>

        <Stack gap={3}>
          <Heading size="md">Vos droits</Heading>
          <Text>Conformément au RGPD, vous disposez des droits suivants :</Text>
          <List.Root pl={4} styleType="disc">
            <List.Item>Accès, rectification, effacement.</List.Item>
            <List.Item>Opposition et limitation du traitement.</List.Item>
            <List.Item>Portabilité des données lorsque applicable.</List.Item>
          </List.Root>
          <Text>
            Pour exercer vos droits, contactez :{" "}
            <Text as="span" fontWeight="semibold">
              contact@sociomimesis.com
            </Text>
            .
          </Text>
        </Stack>

        <Stack gap={3}>
          <Heading size="md">Cookies</Heading>
          <Text>
            Des cookies techniques peuvent être utilisés pour la gestion de session et la sécurité.
            Aucun cookie publicitaire n&apos;est utilisé.
          </Text>
        </Stack>

        <Stack gap={3}>
          <Heading size="md">Mise à jour</Heading>
          <Text>
            Cette politique peut être mise à jour. La date de dernière mise à jour est indiquée
            sur cette page.
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Dernière mise à jour : 12 janvier 2026
          </Text>
        </Stack>
      </Stack>
    </Container>
  );
}
