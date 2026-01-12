/**
 * Agent Configuration
 *
 * Agent data is stored in public.agents and should be loaded from the database.
 */

export interface Agent {
  id: string;
  agent_name: string;
  description: string | null;
  active: boolean;
  is_template?: boolean;
  has_published_prompt?: boolean;
}
