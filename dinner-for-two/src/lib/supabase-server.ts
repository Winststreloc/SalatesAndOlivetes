import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSideClient() {
  const cookieStore = await cookies()

  // Use Service Role Key if available for server-side operations to bypass RLS
  // since we verify authentication manually via our JWT/Session in actions.ts
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  )
}
