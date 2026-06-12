import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProducerProvider } from './context/ProducerContext';
import { DashboardLayout } from './components/DashboardLayout';

// Novas telas
import { LandingPage } from './screens/LandingPage';
import { Login } from './screens/Login';

// Telas existentes
import { Produtores } from './screens/Produtores';
import { Parametrizacao } from './screens/Parametrizacao';
import { VisaoGeral } from './screens/VisaoGeral';
import { NotasFiscais } from './screens/NotasFiscais';
import { Register } from './screens/Register';

export default function App() {
  return (
    <ProducerProvider>
      <BrowserRouter>
        <Routes>
          {/* Rotas públicas (sem sidebar) */}
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rotas protegidas (com DashboardLayout + sidebar) */}
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<VisaoGeral />} />
            <Route path="produtores" element={<Produtores />} />
            <Route path="parametrizacao" element={<Parametrizacao />} />
            <Route path="notas" element={<NotasFiscais />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProducerProvider>
  );
}