import { reactive } from 'vue'
import { supabase } from './supabase'

export const auth = reactive({
  ready: false,
  user: null,
  isAdmin: false
})

let refreshVersion = 0

async function refresh(session) {
  const version = ++refreshVersion

  auth.ready = false
  auth.user = session?.user ?? null
  auth.isAdmin = false

  try {
    if (auth.user) {
      const userId = auth.user.id

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      // Ignorer une réponse ancienne arrivée après une nouvelle session.
      if (version !== refreshVersion) return

      // Aucun accès administrateur si la requête échoue ou si le rôle
      // est absent, inconnu ou différent de "admin".
      auth.isAdmin = !error && data?.role === 'admin'
    }
  } catch {
    if (version === refreshVersion) {
      auth.isAdmin = false
    }
  } finally {
    if (version === refreshVersion) {
      auth.ready = true
    }
  }
}

export async function refreshSession() {
  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      await refresh(null)
      return
    }

    await refresh(data.session)
  } catch {
    await refresh(null)
  }
}

export async function initAuth() {
  await refreshSession()

  supabase.auth.onAuthStateChange((_event, session) => {
    // Évite d'appeler Supabase directement dans le callback d'auth.
    setTimeout(() => {
      void refresh(session)
    }, 0)
  })
}
