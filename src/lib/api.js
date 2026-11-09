import { criarApiSupabase } from './api-supabase.js'
import { criarApiDemo } from './api-demo.js'

const url = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY
const forcarDemo = new URLSearchParams(location.search).has('demo')

export const api = url && chave && !forcarDemo ? criarApiSupabase(url, chave) : criarApiDemo()
