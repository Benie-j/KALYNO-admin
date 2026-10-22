import { reactive } from 'vue'
import { supabase } from './supabase'

export const auth = reactive({ ready: false, user: null, isAdmin: false })

async function refresh(session) {
  auth.user = session?.user ?? null
  auth.isAdmin = false
  if (auth.user) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', auth.user.id)
      .maybeSingle()
    auth.isAdmin = data?.role === 'admin'
  }
  auth.ready = true
}

export async function refreshSession() {
  const { data } = await supabase.auth.getSession()
  await refresh(data.session)
}

export async function initAuth() {
  await refreshSession()
  supabase.auth.onAuthStateChange((_event, session) => {
    // setTimeout : évite d'appeler Supabase à l'intérieur du callback d'authentification
    setTimeout(() => refresh(session), 0)
  })
}
