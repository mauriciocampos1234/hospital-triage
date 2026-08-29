import { createClient } from '@supabase/supabase-js';

// Busca as chaves de acesso que configuraremos no arquivo de ambiente (.env.local)
// O operador "|| ''" garante que o TypeScript não reclame caso as variáveis estejam vazias
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validação de segurança no console para facilitar o seu diagnóstico em desenvolvimento
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        'Atenção: As variáveis de ambiente do Supabase não foram encontradas no arquivo .env.local'
    );
}

// Inicializa a conexão com o serviço do Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);