import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing. Using fallback mode.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper function to resolve universityId from university name
 */
export async function resolveUniversityId(name: string) {
  if (!name) return null;

  const { data } = await supabase
    .from('university')
    .select('id')
    .ilike('name', name)
    .single();

  return data?.id ?? null;
}

/**
 * Helper function to resolve organizerId from organizer name
 */
export async function resolveOrganizerId(name: string) {
  if (!name) return null;

  const { data } = await supabase
    .from('organizer')
    .select('orgId')
    .ilike('orgName', name)
    .single();

  return data?.orgId ?? null;
}

/**
 * Helper function to resolve competitionId from competition title
 */
export async function resolveCompetitionId(title: string) {
  if (!title) return null;

  const { data } = await supabase
    .from('competition')
    .select('id')
    .ilike('title', title)
    .single();

  return data?.id ?? null;
}

/**
 * Helper function to resolve timelineId
 */
export async function resolveTimelineId(id: string) {
  if (!id) return null;

  const { data } = await supabase
    .from('timeline')
    .select('id')
    .eq('id', id)
    .single();

  return data?.id ?? null;
}

/**
 * Helper function to resolve historyId
 */
export async function resolveHistoryId(id: string) {
  if (!id) return null;

  const { data } = await supabase
    .from('history')
    .select('id')
    .eq('id', id)
    .single();

  return data?.id ?? null;
}
