import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProducerProvider } from './context/ProducerContext';
import { DashboardLayout } from './components/DashboardLayout';

import { Produtores } from './screens/Produtores';
import { Parametrizacao } from './screens/Parametrizacao';
import { VisaoGeral } from './screens/VisaoGeral';
import { NotasFiscais } from './screens/NotasFiscais'; // <-- IMPORTAÇÃO NOVA

export default function App() {
  return (
    <ProducerProvider>
      <BrowserRouter>
        <Routes>
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