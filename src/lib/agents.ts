/**
 * Agent Configuration
 *
 * Agent data is stored in public.agents and should be loaded from the database.
 */

export interface Agent {
  id: string;
  agent_name: string;
  description: string | null;
  has_published_prompt?: boolean;
}
