import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  FileText, 
  MoreVertical 
} from 'lucide-react';
import { useProducer } from '../context/ProducerContext';

// Mesma tipagem de notas que usamos na Visão Geral
type NotaFiscal = {
  id: number;
  numero: string;
  dataEmissao: string;
  tipo: 'ENTRADA' | 'SAIDA';
  valor: number;
  isDedutivel: boolean;
  descricao: string;
};

export function NotasFiscais() {
  const { currentProducer } = useProducer();
  const location = useLocation();
  
  // Lê as instruções passadas pela tela de Visão Geral (se o utilizador clicou num card)
  const abaInicial = location.state?.abaInicial || 'todas';
  const filtroFiscalInicial = location.state?.filtroFiscal || 'todos';

  const [activeTab, setActiveTab] = useState(abaInicial);
  const [searchTerm, setSearchTerm] = useState('');
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Busca as notas no Java assim que a tela abre ou o produtor muda
  useEffect(() => {
    const buscarNotas = async () => {
      if (!currentProducer) {
        setNotas([]);
        return;
      }

      setIsLoading(true);
      try {
        const token = localStorage.getItem('@AgroPops:token');
        const response = await fetch(`http://localhost:8080/api/notas/listar/${currentProducer.id}`, {
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
  }, [currentProducer]);

  // ==========================================
  // LÓGICA DE BUSCA E FILTRAGEM COMBINADA
  // ==========================================
  const notasFiltradas = notas.filter(nota => {
    // 1. Filtro da Barra de Busca (Pesquisa na descrição e no número da nota)
    const matchesSearch = nota.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          nota.numero.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Filtro das Abas Superiores (Todas, Entradas, Saídas)
    const matchesTab = activeTab === 'todas' || nota.tipo.toLowerCase() === activeTab;

    // 3. Filtro Fiscal Invisível (Se veio clicado do gráfico LCDPR da Visão Geral)
    let matchesFiscal = true;
    if (filtroFiscalInicial === 'dedutivel') {
      matchesFiscal = nota.isDedutivel === true;
    } else if (filtroFiscalInicial === 'nao-dedutivel') {
      matchesFiscal = nota.isDedutivel === false;
    }

    return matchesSearch && matchesTab && matchesFiscal;
  });

  // Formatadores
  const formatBRL = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const formatarData = (dataString: string) => {
    if (!dataString) return '';
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div className="space-y-6">
      {/* HEADER DA TELA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notas Fiscais</h1>
          <p className="text-sm text-gray-500 mt-1">Extrato completo de receitas e despesas do produtor.</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm text-sm">
          <Download size={18} />
          Exportar Relatório
        </button>
      </div>

      {/* BARRA DE BUSCA E ABAS DE FILTRO */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por descrição ou número da nota..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-agro-light focus:ring-2 focus:ring-agro-light/20 transition-all text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
          <button 
            onClick={() => { setActiveTab('todas'); window.history.replaceState({}, document.title) }}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'todas' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Todas
          </button>
          <button 
            onClick={() => { setActiveTab('entrada'); window.history.replaceState({}, document.title) }}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${activeTab === 'entrada' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <TrendingUp size={14} /> Entradas
          </button>
          <button 
            onClick={() => { setActiveTab('saida'); window.history.replaceState({}, document.title) }}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${activeTab === 'saida' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <TrendingDown size={14} /> Saídas
          </button>
        </div>

        <button className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors flex items-center gap-2">
          <Filter size={18} />
          Mais Filtros
        </button>
      </div>

      {/* TABELA DE RESULTADOS */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
           <div className="p-10 text-center text-gray-500">Carregando notas fiscais da base de dados...</div>
        ) : notasFiltradas.length === 0 ? (
           <div className="p-10 text-center text-gray-500 flex flex-col items-center gap-3">
             <FileText size={40} className="text-gray-300" />
             <p>Nenhuma nota fiscal encontrada para os filtros atuais.</p>
           </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                <th className="px-6 py-4 font-medium">Nota / Descrição</th>
                <th className="px-6 py-4 font-medium">Data Emissão</th>
                <th className="px-6 py-4 font-medium">Classificação LCDPR</th>
                <th className="px-6 py-4 font-medium text-right">Valor</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {notasFiltradas.map((nota) => (
                <tr key={nota.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${nota.tipo === 'ENTRADA' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {nota.tipo === 'ENTRADA' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{nota.descricao}</p>
                        <p className="text-xs text-gray-400 font-mono">Nº {nota.numero}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{formatarData(nota.dataEmissao)}</span>
                  </td>
                  <td className="px-6 py-4">
                    {nota.tipo === 'SAIDA' ? (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${nota.isDedutivel ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {nota.isDedutivel ? 'Dedutível' : 'Não Dedutível'}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Receita Agrícola
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-bold ${nota.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-gray-800'}`}>
                      {nota.tipo === 'ENTRADA' ? '+' : '-'} {formatBRL(nota.valor)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}