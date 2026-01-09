"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseHost = new URL(supabaseUrl).hostname;
export const supabaseStorageKey = `sb-${supabaseHost.split(".")[0]}-auth-token`;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
