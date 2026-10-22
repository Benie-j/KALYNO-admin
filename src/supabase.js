import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://nscxeuaouowaemlqjagk.supabase.co'

// Clé publique : prévue pour le navigateur. Ne JAMAIS mettre la clé secrète ici.
// Les écritures sont protégées côté base : seul un compte avec le rôle admin peut modifier.
const PUBLISHABLE_KEY = 'sb_publishable_PkWTixwM1OedfGURTxVXIQ_JKMUYvCi'

export const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY)
