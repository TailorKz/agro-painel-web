import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProducerProvider } from "./context/ProducerContext";
import { DashboardLayout } from "./components/DashboardLayout";
import { LandingPage } from "./screens/LandingPage";
import { Login } from "./screens/Login";
import { Register } from "./screens/Register";
import { Produtores } from "./screens/Produtores";
import { Parametrizacao } from "./screens/Parametrizacao";
import { VisaoGeral } from "./screens/VisaoGeral";
import { NotasFiscais } from "./screens/NotasFiscais";
import { LivroCaixa } from "./screens/LivroCaixa";
import { SimuladorIRPR } from "./screens/SimuladorIRPR";
import { Configuracoes } from "./screens/Configuracoes";

// --- IMPORTS DO PAINEL ADMIN (SAAS) ---
import { AdminLogin } from "./screens/AdminLogin";
import { AdminDashboardLayout } from "./components/AdminDashboardLayout";
import { VisaoGeralSaaS } from "./screens/VisaoGeralSaaS";
import { AdminContadores } from "./screens/AdminContadores";
import { ConfiguracoesMaster } from "./screens/ConfiguracoesMaster";
import { RegrasGlobaisSaaS } from "./screens/RegrasGlobaisSaaS";

export default function App() {
  return (
    <ProducerProvider>
      <BrowserRouter>
        <Routes>
          {/* Telas Públicas */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ROTA DO ADMIN*/}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboardLayout />}>
            <Route index element={<VisaoGeralSaaS />} />
            <Route path="contadores" element={<AdminContadores />} />
            <Route path="configuracoes" element={<ConfiguracoesMaster />} />
            <Route path="regras-fiscais" element={<RegrasGlobaisSaaS />} />
          </Route>

          {/*ROTA DO SISTEMA (CONTADOR / PRODUTOR)*/}
          <Route path="/app" element={<DashboardLayout />}>
            <Route index element={<VisaoGeral />} />
            <Route path="produtores" element={<Produtores />} />
            <Route path="parametrizacao" element={<Parametrizacao />} />
            <Route path="notas" element={<NotasFiscais />} />
            <Route path="livro-caixa" element={<LivroCaixa />} />
            <Route path="calculadora-irpr" element={<SimuladorIRPR />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProducerProvider>
  );
}