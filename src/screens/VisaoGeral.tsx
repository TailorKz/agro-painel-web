import { useState, useEffect } from 'react';
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

type NotaFiscal = {
  id: number;
  numero: string;
  dataEmissao: string;
  tipo: 'ENTRADA' | 'SAIDA';
  valor: number;
  isDedutivel: boolean;
  descricao: string;
};

export function VisaoGeral() {
  const { currentProducer } = useProducer();
  const navigate = useNavigate();
  const [showValues, setShowValues] = useState(true);
  
  // O Estado do Filtro agora comanda a API!
  const [activeFilter, setActiveFilter] = useState('Este Mês');
  
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const filters = ['Hoje', 'Este Mês', 'Este Ano', 'Tudo'];

  // ==========================================
  // O AJUDANTE DE CALENDÁRIO
  // ==========================================
  const obterParametrosDeData = (filtro: string) => {
    const hoje = new Date();
    // Função para formatar YYYY-MM-DD mantendo o fuso horário local correto
    const formatarISO = (data: Date) => {
      const tzOffset = data.getTimezoneOffset() * 60000;
      return new Date(data.getTime() - tzOffset).toISOString().split('T')[0];
    };

    if (filtro === 'Hoje') {
      const hojeStr = formatarISO(hoje);
      return `?inicio=${hojeStr}&fim=${hojeStr}`;
    }
    if (filtro === 'Este Mês') {
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return `?inicio=${formatarISO(primeiroDiaMes)}&fim=${formatarISO(hoje)}`;
    }
    if (filtro === 'Este Ano') {
      const primeiroDiaAno = new Date(hoje.getFullYear(), 0, 1);
      return `?inicio=${formatarISO(primeiroDiaAno)}&fim=${formatarISO(hoje)}`;
    }
    // Se for 'Tudo', não envia parâmetros (o Java traz o histórico inteiro)
    return '';
  };

  useEffect(() => {
    const buscarNotas = async () => {
      if (!currentProducer) {
        setNotas([]);
        return;
      }

      setIsLoading(true);
      try {
        const token = localStorage.getItem('@AgroPops:token');
        const parametros = obterParametrosDeData(activeFilter); // <--- A MAGIA ACONTECE AQUI
        
        const response = await fetch(`http://localhost:8080/api/notas/listar/${currentProducer.id}${parametros}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const dados = await response.json();
          setNotas(dados);
        }
      } catch (error) {
        console.error("Erro ao buscar as notas fiscais:", error);
      } finally {
        setIsLoading(false);
      }
    };

    buscarNotas();
  }, [currentProducer, activeFilter]); // <-- Agora recarrega quando mudar o filtro também!

  // Cálculos Financeiros
  const totalEntradas = notas.filter(n => n.tipo === 'ENTRADA').reduce((acc, curr) => acc + curr.valor, 0);
  const totalSaidas = notas.filter(n => n.tipo === 'SAIDA').reduce((acc, curr) => acc + curr.valor, 0);
  const saldo = totalEntradas - totalSaidas;

  const totalDedutivel = notas.filter(n => n.tipo === 'SAIDA' && n.isDedutivel).reduce((acc, curr) => acc + curr.valor, 0);
  const totalNaoDedutivel = totalSaidas - totalDedutivel;
  const porcentagemDedutivel = totalSaidas > 0 ? Math.round((totalDedutivel / totalSaidas) * 100) : 0;

  const formatBRL = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  const formatarData = (dataString: string) => {
    if (!dataString) return '';
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const ultimasNotas = notas.slice(0, 4);

  return (
    <div className="space-y-6">
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
              {filter === 'Tudo' ? <Calendar size={16} className="inline-block" /> : filter}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => navigate('/notas', { state: { abaInicial: 'todas', periodoInicial: activeFilter } })}
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
              onClick={(e) => { e.stopPropagation(); setShowValues(!showValues); }} 
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              {showValues ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>
          <div className="mt-4">
            <h2 className={`text-3xl font-bold ${saldo < 0 ? 'text-rose-600' : 'text-gray-800'}`}>
              {showValues ? formatBRL(saldo) : 'R$ •••••••'}
            </h2>
            <p className="text-sm text-gray-400 mt-1">Disponível em Caixa/Bancos</p>
          </div>
        </div>

        <div 
          onClick={() => navigate('/notas', { state: { abaInicial: 'entrada', periodoInicial: activeFilter } })}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-emerald-200 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <span className="font-semibold text-gray-500">Total de Entradas</span>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-bold text-emerald-600">{showValues ? formatBRL(totalEntradas) : 'R$ •••••••'}</h2>
            <p className="text-sm text-gray-400 mt-1">Vendas e Receitas Fiscais</p>
          </div>
        </div>

        <div 
          onClick={() => navigate('/notas', { state: { abaInicial: 'saida', periodoInicial: activeFilter } })}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-rose-200 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown size={20} />
            </div>
            <span className="font-semibold text-gray-500">Total de Saídas</span>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-bold text-rose-600">{showValues ? formatBRL(totalSaidas) : 'R$ •••••••'}</h2>
            <p className="text-sm text-gray-400 mt-1">Despesas e Compras</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FileText size={20} className="text-agro-secondary" />
              Classificação LCDPR
            </h3>
            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{activeFilter}</span>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            {isLoading ? (
               <div className="flex justify-center items-center h-full text-gray-400">Processando Livro Caixa...</div>
            ) : (
              <>
                <div className="mb-2 flex justify-between text-sm font-semibold">
                  <span className="text-emerald-600">Dedutível ({porcentagemDedutivel}%)</span>
                  <span className="text-rose-500">Não Dedutível ({100 - porcentagemDedutivel}%)</span>
                </div>
                <div className="w-full h-4 bg-rose-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500 rounded-r-none transition-all duration-1000 ease-out" style={{ width: `${porcentagemDedutivel}%` }} />
                </div>
                
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div 
                    onClick={() => navigate('/notas', { state: { abaInicial: 'saida', filtroFiscal: 'dedutivel', periodoInicial: activeFilter } })}
                    className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 cursor-pointer hover:bg-emerald-100 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 font-medium">Abate Imposto</p>
                      <ArrowRight size={14} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xl font-bold text-emerald-700 mt-1">{showValues ? formatBRL(totalDedutivel) : '••••••'}</p>
                  </div>
                  
                  <div 
                    onClick={() => navigate('/notas', { state: { abaInicial: 'saida', filtroFiscal: 'nao-dedutivel', periodoInicial: activeFilter } })}
                    className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 cursor-pointer hover:bg-rose-100 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 font-medium">Despesa Pessoal</p>
                      <ArrowRight size={14} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xl font-bold text-rose-700 mt-1">{showValues ? formatBRL(totalNaoDedutivel) : '••••••'}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Receipt size={20} className="text-gray-400" />
              Últimas Notas Importadas
            </h3>
            <button 
              onClick={() => navigate('/notas', { state: { abaInicial: 'todas', periodoInicial: activeFilter } })}
              className="text-sm font-semibold text-agro-secondary hover:text-agro-primary flex items-center gap-1 transition-colors"
            >
              Ver Todas <ArrowRight size={16} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {isLoading ? (
               <div className="flex justify-center py-10 text-gray-400 text-sm">Carregando notas da SEFAZ...</div>
            ) : ultimasNotas.length === 0 ? (
               <div className="flex justify-center py-10 text-gray-400 text-sm">Nenhuma nota encontrada neste período.</div>
            ) : (
              ultimasNotas.map((nota) => (
                <div key={nota.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${nota.tipo === 'ENTRADA' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {nota.tipo === 'ENTRADA' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{nota.descricao}</p>
                      <p className="text-xs text-gray-400">{formatarData(nota.dataEmissao)}</p>
                    </div>
                  </div>
                  <div className={`font-bold text-sm ${nota.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-gray-700'}`}>
                    {nota.tipo === 'ENTRADA' ? '+' : '-'} {showValues ? formatBRL(nota.valor) : '••••••'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}