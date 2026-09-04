// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { user, profile, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-sans text-xs">
                Verificando permissões...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // Permite acesso se a role do perfil estiver explicitamente listada ou se for qualquer variação de gerente
    const hasPermission = !allowedRoles || (profile && (
        allowedRoles.includes(profile.role) ||
        (profile.role.includes('gerente') && allowedRoles.some(r => r.includes('gerente')))
    ));

    if (!hasPermission) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;