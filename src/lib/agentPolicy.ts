// ─── Agent Policy Configuration ──────────────────────────────
//
// All agent visibility and action rules in one place.
// Edit the config constants below; evaluation functions are at the bottom.

type UserRole = "admin" | "teacher" | "student" | string;

// Roles that have full access (see all agents, toggle active, etc.)
const ADMIN_ROLES: UserRole[] = ["admin", "teacher"];

// Template agents are always hidden from all users
const TEMPLATE_HIDDEN = true;

// For non-admin users:
// - Public agents must also be active to be visible
// - Own agents (created_by === userId) are always visible regardless of active status

// ─── Helpers ─────────────────────────────────────────────────

export function isAdminLike(role?: string | null): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

// ─── Evaluation Functions ────────────────────────────────────

interface AgentForPolicy {
  is_template?: boolean;
  is_public?: boolean;
  active: boolean;
  created_by?: string | null;
}

/**
 * Can this user see the given agent in a listing?
 *
 * - Template agents are always hidden.
 * - Admin/teacher sees every non-template agent.
 * - Others see: active public agents + all own agents (including inactive).
 */
export function canViewAgent(
  role: string | null | undefined,
  userId: string,
  agent: AgentForPolicy
): boolean {
  if (TEMPLATE_HIDDEN && agent.is_template) return false;
  if (isAdminLike(role)) return true;
  if (agent.created_by === userId) return true;
  return !!agent.is_public && agent.active;
}

/**
 * Can this user toggle an agent's active/inactive status?
 * Only admin-like roles.
 */
export function canToggleActive(role: string | null | undefined): boolean {
  return isAdminLike(role);
}

/**
 * Can this user start a new interview with the given agent?
 *
 * Must pass visibility check first, then:
 * - Students cannot start interviews with inactive agents.
 * - Admin/teacher can start interviews with any visible agent.
 */
export function canStartInterview(
  role: string | null | undefined,
  userId: string,
  agent: AgentForPolicy
): boolean {
  if (!canViewAgent(role, userId, agent)) return false;
  if (!agent.active && !isAdminLike(role)) return false;
  return true;
}
