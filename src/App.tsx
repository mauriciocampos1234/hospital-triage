import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { Login } from './pages/Login';
import { DashboardGerente } from './pages/DashboardGerente';
import { Triagem } from './pages/Triagem';
import { DashboardRecepcao } from './pages/DashboardRecepcao';
import { DashboardMedico } from './pages/DashboardMedico';
import { PainelTV } from './pages/PainelTV';
import { ProtectedRoute } from './components/ProtectedRoute';

export function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/painel" element={<PainelTV />} />

                    {/* Rota da Gerência */}
                    <Route
                        path="/gerencia"
                        element={
                            <ProtectedRoute allowedRoles={['gerente', 'gerente_geral', 'gerente_plantao']}>
                                <DashboardGerente />
                            </ProtectedRoute>
                        }
                    />

                    {/* Rota da Triagem */}
                    <Route
                        path="/triagem"
                        element={
                            <ProtectedRoute allowedRoles={[
                                'triagem',
                                'enfermagem',
                                'enfermeiro',
                                'enfermeira_triagem',
                                'enfermeira_medicamento',
                                'enfermeira_uti',
                                'auxiliar_enfermagem',
                                'auxiliar_uti'
                            ]}>
                                <Triagem />
                            </ProtectedRoute>
                        }
                    />

                    {/* Rota da Recepção */}
                    <Route
                        path="/recepcao"
                        element={
                            <ProtectedRoute allowedRoles={['recepcao', 'recepcionista']}>
                                <DashboardRecepcao />
                            </ProtectedRoute>
                        }
                    />

                    {/* Rota Médica */}
                    <Route
                        path="/medico"
                        element={
                            <ProtectedRoute allowedRoles={['medico', 'medico_uti']}>
                                <DashboardMedico />
                            </ProtectedRoute>
                        }
                    />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;