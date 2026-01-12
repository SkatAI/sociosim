import { vi } from "vitest";
import type { User } from "@supabase/supabase-js";

export const mockUser: User = {
  id: "test-user-123",
  email: "test@example.com",
  aud: "authenticated",
  role: "authenticated",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  app_metadata: {},
  user_metadata: {
    firstName: "Test",
    lastName: "User",
    name: "Test User",
  },
};

export const mockUseAuthUser = {
  user: mockUser,
  session: null,
  role: "student" as const,
  user_admin: false,
  isLoading: false,
  refreshUser: vi.fn(),
  updateUserMetadata: vi.fn(),
};

export const createMockAuthUser = (overrides = {}) => ({
  ...mockUseAuthUser,
  ...overrides,
});
