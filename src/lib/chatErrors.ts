/**
 * Map raw error messages to user-friendly French messages for the chat UI.
 */
export function toUserFacingError(rawError: string): string {
  const lower = rawError.toLowerCase().replace(/_/g, " ");

  if (lower.includes("503") || lower.includes("unavailable") || lower.includes("high demand") || lower.includes("rate limit") || lower.includes("overloaded") || lower.includes("resource exhausted")) {
    return "En raison de limitations budgétaires, le nombre de requêtes est limité. Veuillez patienter environ une minute avant de continuer.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "La réponse a pris trop de temps. Veuillez réessayer dans quelques instants.";
  }
  if (lower.includes("session") && lower.includes("not found")) {
    return "La session a expiré. Veuillez rafraîchir la page et relancer l'entretien.";
  }
  if (lower.includes("network") || lower.includes("econnrefused") || lower.includes("fetch failed")) {
    return "Impossible de contacter le service d'entretien. Veuillez vérifier votre connexion et réessayer.";
  }

  return "Une erreur est survenue. Veuillez réessayer.";
}
