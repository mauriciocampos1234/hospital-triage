import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { DashboardGerente } from "./pages/DashboardGerente";
import { DashboardRecepcao } from "./pages/DashboardRecepcao";
import { DashboardMedico } from "./pages/DashboardMedico";
import { PainelTV } from "./pages/PainelTV";

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
          <Route path="/" element={<Login />} />
          <Route path="/painel" element={<PainelTV />} />

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
            path="/medico"
            element={
              <ProtectedRoute allowedRoles={["medico"]}>
                <DashboardMedico />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}