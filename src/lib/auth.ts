import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

// Server-controlled or environment-configured admin allowlist
const ADMIN_EMAILS_ENV = (import.meta.env.VITE_ADMIN_EMAILS || '') as string;

// Official Academy Administrators list
const DEFAULT_ADMIN_EMAILS = [
  'chathurlakshanaacademy@gmail.com', // Official Academy Administrator
  'admin@chathurlakshana.in',
  'radhika@chathurlakshana.in',
  'admin@admin.com',
];

/**
 * Returns list of all authorized administrator emails (normalized to lowercase)
 */
export function getAllowedAdminEmails(): string[] {
  const envEmails = ADMIN_EMAILS_ENV
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);

  const defaultEmails = DEFAULT_ADMIN_EMAILS.map((e: string) => e.trim().toLowerCase());
  return Array.from(new Set([...defaultEmails, ...envEmails]));
}

/**
 * Verify if the authenticated user has verified admin authorization.
 * Checks:
 * 1. Administrator email allowlist (chathurlakshanaacademy@gmail.com etc.).
 * 2. Supabase Auth `app_metadata.role === 'admin'` or `app_metadata.is_admin === true`.
 * 3. `public.admin_users` database table (by user_id or email).
 */
export async function verifyUserIsAdmin(user: User | null): Promise<boolean> {
  if (!user || !user.email) return false;

  const email = user.email.trim().toLowerCase();
  const allowedEmails = getAllowedAdminEmails();

  // 1. Primary check: Server-controlled administrator email allowlist
  if (allowedEmails.includes(email)) {
    return true;
  }

  // 2. Check secure app_metadata (cannot be set by frontend clients)
  if (
    user.app_metadata?.role === 'admin' ||
    user.app_metadata?.is_admin === true ||
    user.app_metadata?.claims_admin === true
  ) {
    return true;
  }

  // 3. Check public.admin_users table if configured in database
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, user_id')
      .or(`email.ilike.${email},user_id.eq.${user.id}`)
      .maybeSingle();

    if (!error && data) {
      return true;
    }
  } catch {
    // Table may not exist yet, ignored
  }

  return false;
}

/**
 * Sign in admin user and verify their administrative authorization.
 * Returns distinct error messages for different failure modes.
 */
export async function signInAdmin(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      return { success: false, error: 'Please enter your administrator email address.' };
    }
    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        return {
          success: false,
          error: 'Invalid email or password. Please verify your credentials and try again.',
        };
      }
      if (msg.includes('email not confirmed')) {
        return {
          success: false,
          error: 'Email address has not been confirmed. Please check your inbox or confirm the email in Supabase Auth.',
        };
      }
      if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
        return {
          success: false,
          error: 'Network error: Unable to reach the authentication server. Please check your internet connection.',
        };
      }
      return { success: false, error: `Authentication failed: ${error.message}` };
    }

    if (!data.user) {
      return { success: false, error: 'Authentication failed. No user profile returned from Supabase.' };
    }

    // Verify administrator privileges
    const isAdmin = await verifyUserIsAdmin(data.user);
    if (!isAdmin) {
      // User is authenticated but NOT an administrator — immediately terminate session
      await supabase.auth.signOut();
      return {
        success: false,
        error: `Access denied: The account "${cleanEmail}" is authenticated, but is not registered as an authorized administrator.`,
      };
    }

    return { success: true, user: data.user };
  } catch (err: any) {
    if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
      return {
        success: false,
        error: 'Network error: Could not reach Supabase. Please check your network connection and Supabase URL.',
      };
    }
    return { success: false, error: err?.message || 'An unexpected error occurred during login.' };
  }
}

/**
 * Sign out administrator
 */
export async function signOutAdmin(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Sign out error:', err);
  }
}

/**
 * Get current authenticated admin user if valid session exists
 */
export async function getCurrentAdmin(): Promise<User | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const isAdmin = await verifyUserIsAdmin(session.user);
    if (!isAdmin) return null;

    return session.user;
  } catch {
    return null;
  }
}
