import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, type Session } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';

// Tipagem do perfil do usuário cadastrado na tabela public.profiles
export interface Profile {
    id: string;
    name: string;
    role: 'gerente' | 'recepcionista' | 'medico';
    specialty_id?: string | null;
    crm?: string | null;
}

// Tipagem das informações que o Contexto disponibilizará para a aplicação
interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Função para buscar os dados de perfil (role, crm, etc) na tabela public.profiles
    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Erro ao buscar perfil do usuário:', error.message);
                setProfile(null);
            } else {
                setProfile(data as Profile);
            }
        } catch (err) {
            console.error('Erro inesperado ao buscar perfil:', err);
        }
    };

    // Atualiza o perfil manualmente quando necessário (ex: após edições)
    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    useEffect(() => {
        // 1. Obtém a sessão atual salva no navegador (localStorage)
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id).finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        });

        // 2. Escuta mudanças na autenticação em tempo real (login, logout, token expirado)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    await fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                }

                setLoading(false);
            }
        );

        // Cancela o listener ao desmontar o componente para evitar vazamento de memória
        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Função para deslogar a sessão
    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                session,
                loading,
                signOut,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

// Hook personalizado para consumir o contexto com facilidade nas páginas
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
};