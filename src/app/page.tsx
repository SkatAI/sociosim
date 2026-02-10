// app/page.tsx
"use client";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";

const cards = [
  {
    title: "Apprendre par la pratique",
    body: "L'entretien semi-directif est au cœur de l'enquête qualitative en sciences sociales. Mais comment s'y former autrement que sur le terrain ? SocioSim vous propose de vous exercer face à des enquêtés virtuels, incarnés par une intelligence artificielle, dans un cadre pédagogique où l'erreur devient un levier d'apprentissage.",
  },
  {
    title: "Trois regards théoriques, un terrain",
    body: "Les usages des LLM à l'université servent de fil conducteur à trois situations d'entretien, chacune adossée à une grande théorie de l'action : la logique des capitaux et de l'habitus (Bourdieu), les jeux stratégiques au sein des organisations (Crozier & Friedberg), la construction des réseaux sociotechniques (Latour). Trois manières d'interroger, trois manières de comprendre.",
  },
  {
    title: "De l'entretien à l'analyse",
    body: "Muni d'une grille d'entretien, vous conduisez l'échange à votre rythme. Le verbatim horodaté est enregistré intégralement, puis un codage automatique et une première analyse vous permettent de prendre du recul sur votre pratique d'enquêteur et sur les matériaux produits.",
  },
];

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuthUser();

  useEffect(() => {
    if (!isLoading && user?.id) {
      router.replace("/personnas");
    }
  }, [isLoading, router, user?.id]);

  return (
    <Container py={16} maxW="6xl" centerContent mx="auto">
      <Flex
        direction={{ base: "column", md: "row" }}
        gap={6}
        width="100%"
      >
        {cards.map((card) => (
          <Box
            key={card.title}
            flex="1"
            p={6}
            bg="bg.panel"
            borderRadius="xl"
            boxShadow="sm"
            _hover={{ boxShadow: "md" }}
            transition="box-shadow 0.2s"
          >
            <Heading size="md" mb={3}>
              {card.title}
            </Heading>
            <Text color="fg.muted" fontSize="sm">
              {card.body}
            </Text>
          </Box>
        ))}
      </Flex>
    </Container>
  );
}
