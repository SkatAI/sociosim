import { describe, it, expect } from "vitest";
import { toUserFacingError } from "./chatErrors";

describe("toUserFacingError", () => {
  const RATE_LIMIT_MSG = "En raison de limitations budgétaires, le nombre de requêtes est limité. Veuillez patienter environ une minute avant de continuer.";
  const TIMEOUT_MSG = "La réponse a pris trop de temps. Veuillez réessayer dans quelques instants.";
  const SESSION_MSG = "La session a expiré. Veuillez rafraîchir la page et relancer l'entretien.";
  const NETWORK_MSG = "Impossible de contacter le service d'entretien. Veuillez vérifier votre connexion et réessayer.";
  const GENERIC_MSG = "Une erreur est survenue. Veuillez réessayer.";

  it.each([
    ["ADK request failed: 503 UNAVAILABLE", RATE_LIMIT_MSG],
    ["ADK request failed: 503", RATE_LIMIT_MSG],
    ["UNAVAILABLE: high demand", RATE_LIMIT_MSG],
    ["rate limit exceeded", RATE_LIMIT_MSG],
    ["server overloaded", RATE_LIMIT_MSG],
    ["RESOURCE_EXHAUSTED", RATE_LIMIT_MSG],
  ])("maps rate-limit error %j to French message", (input, expected) => {
    expect(toUserFacingError(input)).toBe(expected);
  });

  it.each([
    ["request timeout", TIMEOUT_MSG],
    ["connection timed out after 30s", TIMEOUT_MSG],
  ])("maps timeout error %j to French message", (input, expected) => {
    expect(toUserFacingError(input)).toBe(expected);
  });

  it("maps session-not-found to French message", () => {
    expect(toUserFacingError("Session not found: abc-123")).toBe(SESSION_MSG);
  });

  it.each([
    ["network error", NETWORK_MSG],
    ["ECONNREFUSED 127.0.0.1:8000", NETWORK_MSG],
    ["fetch failed", NETWORK_MSG],
  ])("maps network error %j to French message", (input, expected) => {
    expect(toUserFacingError(input)).toBe(expected);
  });

  it("returns generic fallback for unknown errors", () => {
    expect(toUserFacingError("something completely random")).toBe(GENERIC_MSG);
  });
});
