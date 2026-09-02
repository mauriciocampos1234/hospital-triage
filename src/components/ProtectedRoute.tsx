import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-semibold text-slate-600">Verificando autenticação...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        switch (profile.role) {
            case 'gerente_geral':
            case 'gerente_plantao':
            case 'gerente':
                return <Navigate to="/gerencia" replace />;
            case 'recepcao':
            case 'recepcionista':
                return <Navigate to="/recepcao" replace />;
            case 'medico':
                return <Navigate to="/medico" replace />;
            default:
                return <Navigate to="/" replace />;
        }
    }

    return <>{children}</>;
};