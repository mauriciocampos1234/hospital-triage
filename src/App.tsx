import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Login } from './pages/Login';
import { DashboardRecepcao } from './pages/DashboardRecepcao';
import { Triagem } from './pages/Triagem';
import { DashboardMedico } from './pages/DashboardMedico';
import { DashboardGerente } from './pages/DashboardGerente';
import { PainelTV } from './pages/PainelTV';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota Pública */}
          <Route path="/" element={<Login />} />
          <Route path="/painel" element={<PainelTV />} />

          {/* Rotas Protegidas - Recepção */}
          <Route
            path="/recepcao"
            element={
              <ProtectedRoute allowedRoles={['recepcao', 'recepcionista']}>
                <DashboardRecepcao />
              </ProtectedRoute>
            }
          />
          <Route
            path="/triagem/:patientId"
            element={
              <ProtectedRoute allowedRoles={['recepcao', 'recepcionista']}>
                <Triagem />
              </ProtectedRoute>
            }
          />

          {/* Rotas Protegidas - Médico */}
          <Route
            path="/medico"
            element={
              <ProtectedRoute allowedRoles={['medico']}>
                <DashboardMedico />
              </ProtectedRoute>
            }
          />

          {/* Rotas Protegidas - Gerência */}
          <Route
            path="/gerencia"
            element={
              <ProtectedRoute allowedRoles={['gerente', 'gerente_plantao', 'gerente_geral']}>
                <DashboardGerente />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;