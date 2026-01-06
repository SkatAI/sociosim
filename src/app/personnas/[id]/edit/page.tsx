"use client";

import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { supabase } from "@/lib/supabaseClient";

type AgentPromptState = {
  systemPrompt: string;
  version: number;
};

export default function EditAgentPromptPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = typeof params.id === "string" ? params.id : "";
  const { user, isLoading: isAuthLoading } = useAuthUser();
  const [agentName, setAgentName] = useState<string>("");
  const [promptState, setPromptState] = useState<AgentPromptState>({
    systemPrompt: "",
    version: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    if (!agentId) {
      setError("Agent introuvable.");
      setIsLoading(false);
      return;
    }

    const loadAgentPrompt = async () => {
      try {
        const { data: agentData, error: agentError } = await supabase
          .from("agents")
          .select("id, agent_name")
          .eq("id", agentId)
          .single();

        if (agentError || !agentData) {
          console.error("Error fetching agent:", agentError);
          setError("Impossible de charger l'agent.");
          setIsLoading(false);
          return;
        }

        setAgentName(agentData.agent_name);

        const { data: promptData, error: promptError } = await supabase
          .from("agent_prompts")
          .select("system_prompt, version")
          .eq("agent_id", agentId)
          .eq("published", true)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (promptError) {
          console.error("Error fetching agent prompt:", promptError);
          setError("Impossible de charger le prompt.");
          setIsLoading(false);
          return;
        }

        if (promptData) {
          setPromptState({
            systemPrompt: promptData.system_prompt,
            version: promptData.version,
          });
        } else {
          setPromptState({
            systemPrompt: "",
            version: 0,
          });
        }
      } catch (loadError) {
        console.error("Error loading agent prompt:", loadError);
        setError("Une erreur est survenue.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAgentPrompt();
  }, [agentId, isAuthLoading, router, user]);

  const handleSave = async () => {
    if (!user?.id) {
      router.push("/login");
      return;
    }

    if (!promptState.systemPrompt.trim()) {
      setError("Le prompt ne peut pas être vide.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const nextVersion = promptState.version + 1;
      const { error: saveError } = await supabase.from("agent_prompts").insert({
        agent_id: agentId,
        system_prompt: promptState.systemPrompt,
        edited_by: user.id,
        version: nextVersion,
        published: true,
      });

      if (saveError) {
        console.error("Error saving agent prompt:", saveError);
        setError("Impossible d'enregistrer le prompt pour le moment.");
        return;
      }

      router.push("/personnas");
    } catch (saveError) {
      console.error("Error saving agent prompt:", saveError);
      setError("Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    router.push("/personnas");
  };

  if (isLoading) {
    return (
      <Container maxWidth="4xl" height="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={4}>
          <Spinner size="lg" color="blue.500" />
          <Text color="fg.muted">Chargement du prompt...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxWidth="5xl" py={{ base: 8, md: 12 }} px={{ base: 4, md: 6 }}>
      <VStack gap={6} alignItems="stretch">
        <Box>
          <Heading size="lg">Modifier le prompt</Heading>
          <Text color="fg.muted">{agentName || "Agent"}</Text>
        </Box>

        {error && (
          <Box
            backgroundColor={{ base: "red.50", _dark: "red.900" }}
            borderRadius="md"
            padding={4}
            borderLeft="4px solid"
            borderLeftColor="red.500"
          >
            <Text color={{ base: "red.700", _dark: "red.200" }}>{error}</Text>
          </Box>
        )}

        <Textarea
          value={promptState.systemPrompt}
          onChange={(event) =>
            setPromptState((current) => ({
              ...current,
              systemPrompt: event.target.value,
            }))
          }
          minH="520px"
          rows={22}
          fontSize="sm"
          placeholder="Rédigez le system prompt de l'agent..."
        />

        <HStack justifyContent="flex-end" gap={3}>
          <Button variant="outline" onClick={handleDiscard} disabled={isSaving}>
            Annuler
          </Button>
          <Button colorPalette="blue" onClick={handleSave} loading={isSaving}>
            Enregistrer
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
}
