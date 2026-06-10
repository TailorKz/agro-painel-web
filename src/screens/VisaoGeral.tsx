import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Eye, 
  EyeOff, 
  FileText, 
  Calendar, 
  ArrowRight,
  Receipt
} from 'lucide-react';
import { useProducer } from '../context/ProducerContext';

export function VisaoGeral() {
  const { currentProducer } = useProducer();
  const navigate = useNavigate();
  const [showValues, setShowValues] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Este Mês');

  const financeData = {
    saldo: 'R$ 45.230,00',
    entradas: 'R$ 62.000,00',
    saidas: 'R$ 16.770,00',
    dedutivel: 'R$ 12.450,00',
    naoDedutivel: 'R$ 4.320,00',
    porcentagemDedutivel: 74
  };

  const ultimasNotas = [
    { id: '1', data: '08/06/2026', descricao: 'Venda de Soja (Sacas)', tipo: 'entrada', valor: 'R$ 35.000,00' },
    { id: '2', data: '05/06/2026', descricao: 'Adubo NPK e Defensivos', tipo: 'saida', valor: 'R$ 8.500,00' },
    { id: '3', data: '02/06/2026', descricao: 'Manutenção Trator', tipo: 'saida', valor: 'R$ 3.200,00' },
    { id: '4', data: '28/05/2026', descricao: 'Venda de Milho', tipo: 'entrada', valor: 'R$ 18.400,00' },
  ];

  const filters = ['Hoje', 'Este Mês', 'Este Ano', 'Personalizado'];

  return (
    <div className="space-y-6">
      {/* HEADER E FILTROS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Visão Geral {currentProducer ? `- ${currentProducer.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Resumo financeiro e fiscal atualizado em tempo real via SEFAZ.</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeFilter === filter ? 'bg-agro-secondary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {filter === 'Personalizado' ? <Calendar size={16} className="inline-block" /> : filter}
            </button>
          ))}
        </div>
      </div>

      {/* CARDS DE KPI TRANSFORMADOS EM BOTÕES CLICÁVEIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Saldo -> Leva para "todas" */}
        <div 
          onClick={() => navigate('/notas', { state: { abaInicial: 'todas' } })}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-blue-200 hover:shadow-md transition-all"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Wallet size={20} />
              </div>
              <span className="font-semibold text-gray-500">Saldo Geral</span>
            </div>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                setShowValues(!showValues); 
              }} 
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              {showValues ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-bold text-gray-800">{showValues ? financeData.saldo : 'R$ •••••••'}</h2>
            <p className="text-sm text-gray-400 mt-1">Disponível em Caixa/Bancos</p>
          </div>
        </div>

        {/* Card Entradas -> Leva pré-filtrado para "entrada" */}
        <div 
          onClick={() => navigate('/notas', { state: { abaInicial: 'entrada' } })}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-emerald-200 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <span className="font-semibold text-gray-500">Total de Entradas</span>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-bold text-emerald-600">{showValues ? financeData.entradas : 'R$ •••••••'}</h2>
            <p className="text-sm text-gray-400 mt-1">Vendas e Receitas Fiscais</p>
          </div>
        </div>

        {/* Card Saídas -> Leva pré-filtrado para "saida" */}
        <div 
          onClick={() => navigate('/notas', { state: { abaInicial: 'saida' } })}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-rose-200 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown size={20} />
            </div>
            <span className="font-semibold text-gray-500">Total de Saídas</span>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-bold text-rose-600">{showValues ? financeData.saidas : 'R$ •••••••'}</h2>
            <p className="text-sm text-gray-400 mt-1">Despesas e Compras</p>
          </div>
        </div>
      </div>

      {/* SEÇÃO INFERIOR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classificação LCDPR */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FileText size={20} className="text-agro-secondary" />
              Classificação LCDPR
            </h3>
            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{activeFilter}</span>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-2 flex justify-between text-sm font-semibold">
              <span className="text-emerald-600">Dedutível ({financeData.porcentagemDedutivel}%)</span>
              <span className="text-rose-500">Não Dedutível ({100 - financeData.porcentagemDedutivel}%)</span>
            </div>
            <div className="w-full h-4 bg-rose-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500 rounded-r-none transition-all duration-1000 ease-out" style={{ width: `${financeData.porcentagemDedutivel}%` }} />
            </div>
            
            {/* VALORES DETALHADOS CLICÁVEIS */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div 
                onClick={() => navigate('/notas', { state: { abaInicial: 'saida', filtroFiscal: 'dedutivel' } })}
                className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 cursor-pointer hover:bg-emerald-100 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 font-medium">Abate Imposto</p>
                  <ArrowRight size={14} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xl font-bold text-emerald-700 mt-1">{showValues ? financeData.dedutivel : '••••••'}</p>
              </div>
              
              <div 
                onClick={() => navigate('/notas', { state: { abaInicial: 'saida', filtroFiscal: 'nao-dedutivel' } })}
                className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 cursor-pointer hover:bg-rose-100 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 font-medium">Despesa Pessoal</p>
                  <ArrowRight size={14} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xl font-bold text-rose-700 mt-1">{showValues ? financeData.naoDedutivel : '••••••'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Últimas Notas Importadas */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Receipt size={20} className="text-gray-400" />
              Últimas Notas Importadas
            </h3>
            <button 
              onClick={() => navigate('/notas', { state: { abaInicial: 'todas' } })}
              className="text-sm font-semibold text-agro-secondary hover:text-agro-primary flex items-center gap-1 transition-colors"
            >
              Ver Todas <ArrowRight size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {ultimasNotas.map((nota) => (
              <div key={nota.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${nota.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {nota.tipo === 'entrada' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{nota.descricao}</p>
                    <p className="text-xs text-gray-400">{nota.data}</p>
                  </div>
                </div>
                <div className={`font-bold text-sm ${nota.tipo === 'entrada' ? 'text-emerald-600' : 'text-gray-700'}`}>
                  {nota.tipo === 'entrada' ? '+' : '-'} {showValues ? nota.valor : '••••••'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}