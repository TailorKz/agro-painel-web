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

export default function App() {
  return (
    <ProducerProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing Page como tela inicial absoluta */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* O ERP passa a morar dentro de /app */}
          <Route path="/app" element={<DashboardLayout />}>
            <Route index element={<VisaoGeral />} />
            <Route path="produtores" element={<Produtores />} />
            <Route path="parametrizacao" element={<Parametrizacao />} />
            <Route path="notas" element={<NotasFiscais />} />
            <Route path="livro-caixa" element={<LivroCaixa />} />
            <Route path="calculadora-irpr" element={<SimuladorIRPR />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProducerProvider>
  );
}
