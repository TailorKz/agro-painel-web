import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProducerProvider } from './context/ProducerContext';
import { DashboardLayout } from './components/DashboardLayout';

import { LandingPage } from './screens/LandingPage';
import { Login } from './screens/Login';
import { Register } from './screens/Register';
import { AdminLogin } from './screens/AdminLogin';

import { Produtores } from './screens/Produtores';
import { Parametrizacao } from './screens/Parametrizacao';
import { VisaoGeral } from './screens/VisaoGeral';
import { NotasFiscais } from './screens/NotasFiscais';
import { AdminContadores } from './screens/AdminContadores';
import { AdminDashboardLayout } from './components/AdminDashboardLayout';
import { VisaoGeralSaaS } from './screens/VisaoGeralSaaS';

import { Configuracoes } from './screens/Configuracoes';
import { ConfiguracoesMaster } from './screens/ConfiguracoesMaster';

export default function App() {
  return (
    <ProducerProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/admin" element={<AdminLogin />} />

          {/* Rota do Admin */}
          <Route path="/admin/dashboard" element={<AdminDashboardLayout />}>
            <Route index element={<VisaoGeralSaaS />} />
            <Route path="contadores" element={<AdminContadores />} />
            <Route path="configuracoes" element={<ConfiguracoesMaster />} />
          </Route>

          <Route path="/app" element={<DashboardLayout />}>
            <Route index element={<VisaoGeral />} />
            <Route path="produtores" element={<Produtores />} />
            <Route path="parametrizacao" element={<Parametrizacao />} />
            <Route path="notas" element={<NotasFiscais />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProducerProvider>
  );
}