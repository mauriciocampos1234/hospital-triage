import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { Login } from './pages/Login';
import { DashboardRecepcao } from './pages/DashboardRecepcao';
import { Triagem } from './pages/Triagem';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserRole } from './types';

export const App: React.FC = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Rotas Públicas */}
                    <Route path="/" element={<Login />} />
                    <Route path="/login" element={<Login />} />

                    {/* Rota Recepção */}
                    <Route 
                        path="/recepcao" 
                        element={
                            <ProtectedRoute allowedRoles={['recepcao', 'recepcionista', 'gerente_geral'] as UserRole[]}>
                                <DashboardRecepcao />
                            </ProtectedRoute>
                        } 
                    />

                    {/* Rota Triagem */}
                    <Route 
                        path="/triagem" 
                        element={
                            <ProtectedRoute allowedRoles={['triagem', 'enfermeiro', 'enfermagem', 'gerente_geral'] as UserRole[]}>
                                <Triagem />
                            </ProtectedRoute>
                        } 
                    />

                    {/* Redirecionamento Padrão */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;