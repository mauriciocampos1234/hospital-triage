import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export type UserRole = 
    | 'gerente_geral' 
    | 'gerente_plantao' 
    | 'gerente' 
    | 'recepcao' 
    | 'recepcionista' 
    | 'medico';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    allowedRoles,
}) => {
    const { user, profile, loading } = useAuth();

    // 1. Enquanto o Supabase restaura a sessão, exibe um indicador visual
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-600 font-medium">Verificando credenciais...</p>
                </div>
            </div>
        );
    }

    // 2. Se não estiver autenticado, redireciona para a tela de Login
    if (!user) {
        return <Navigate to="/" replace />;
    }

    // 3. Se a rota exige papéis específicos e o perfil do usuário não corresponder
    if (allowedRoles && profile && !allowedRoles.includes(profile.role as UserRole)) {
        if (profile.role === 'gerente_geral' || profile.role === 'gerente_plantao' || profile.role === 'gerente') {
            return <Navigate to="/gerencia" replace />;
        }
        if (profile.role === 'recepcao' || profile.role === 'recepcionista') {
            return <Navigate to="/recepcao" replace />;
        }
        if (profile.role === 'medico') {
            return <Navigate to="/medico" replace />;
        }
        return <Navigate to="/" replace />;
    }

    // 4. Acesso autorizado: renderiza a página solicitada
    return <>{children}</>;
};