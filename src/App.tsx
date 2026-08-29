import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { DashboardGerente } from "./pages/DashboardGerente";
import { DashboardRecepcao } from "./pages/DashboardRecepcao";
import { DashboardMedico } from "./pages/DashboardMedico";
import { PainelTV } from "./pages/PainelTV";
import { Triagem } from "./pages/Triagem";

const NotFound = () => (
  <div className="p-10 text-2xl text-gray-600 font-bold">
    Erro 404 - Página não encontrada
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<Login />} />
          <Route path="/painel" element={<PainelTV />} />

          {/* Rotas Protegidas por Perfil */}
          <Route
            path="/gerencia"
            element={
              <ProtectedRoute allowedRoles={["gerente"]}>
                <DashboardGerente />
              </ProtectedRoute>
            }
          />

          <Route
            path="/recepcao"
            element={
              <ProtectedRoute allowedRoles={["recepcionista"]}>
                <DashboardRecepcao />
              </ProtectedRoute>
            }
          />

          <Route
            path="/triagem"
            element={
              <ProtectedRoute allowedRoles={["recepcionista", "gerente"]}>
                <Triagem />
              </ProtectedRoute>
            }
          />

          <Route
            path="/medico"
            element={
              <ProtectedRoute allowedRoles={["medico"]}>
                <DashboardMedico />
              </ProtectedRoute>
            }
          />

          {/* Rota Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}