import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Eye,
  EyeOff,
  FileText,
  CalendarDays,
  Receipt,
  Download,
  Loader2,
  X
} from "lucide-react";
import { useProducer } from "../context/ProducerContext";
import { TractorLoadingOverlay } from "../components/TractorLoadingOverlay";

type ItemNota = { id: number; descricao: string; ncm: string; valor: number; isDedutivel: boolean; };
type NotaFiscal = { id: number; numero: string; dataEmissao: string; tipo: "ENTRADA" | "SAIDA"; valorTotal: number; empresaEnvolvida: string; itens: ItemNota[]; };

export function VisaoGeral() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const { currentProducer, isLoadingProducers } = useProducer();
  const navigate = useNavigate();
  
  const [showValues, setShowValues] = useState(true);
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [isLoadingNotas, setIsLoadingNotas] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // Controle de Loading Inteligente (Trator só na primeira vez)
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Filtros de Data
  const [activeFilter, setActiveFilter] = useState("Este Mês");
  const filters = ["Hoje", "Este Mês", "Este Ano", "Tudo"];

  // Estados para Data Personalizada
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  const obterParametrosDeData = (filtro: string) => {
    const hoje = new Date();
    const formatarISO = (data: Date) => {
      const tzOffset = data.getTimezoneOffset() * 60000;
      return new Date(data.getTime() - tzOffset).toISOString().split("T")[0];
    };
    if (filtro === "Hoje") return `?inicio=${formatarISO(hoje)}&fim=${formatarISO(hoje)}`;
    if (filtro === "Este Mês") {
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return `?inicio=${formatarISO(primeiroDiaMes)}&fim=${formatarISO(hoje)}`;
    }
    if (filtro === "Este Ano") {
      const primeiroDiaAno = new Date(hoje.getFullYear(), 0, 1);
      return `?inicio=${formatarISO(primeiroDiaAno)}&fim=${formatarISO(hoje)}`;
    }
    if (filtro === "Personalizado" && customStartDate && customEndDate) {
      return `?inicio=${customStartDate}&fim=${customEndDate}`;
    }
    return "";
  };

  useEffect(() => {
    if (isLoadingProducers) return;

    if (!currentProducer) {
      setNotas([]);
      setIsLoadingNotas(false);
      setIsInitialLoad(false);
      return;
    }

    let cancelado = false;
    const buscarNotas = async () => {
      setIsLoadingNotas(true);
      try {
        const token = localStorage.getItem("@AgroPops:token");
        const response = await fetch(`${baseUrl}/notas/listar/${currentProducer.id}${obterParametrosDeData(activeFilter)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelado && response.ok) {
          const dados = await response.json();
          setNotas(dados);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelado) {
          setIsLoadingNotas(false);
          setIsInitialLoad(false); // Desativa o Trator permanentemente após a primeira busca
        }
      }
    };
    buscarNotas();
    return () => { cancelado = true; };
  }, [currentProducer?.id, activeFilter, customStartDate, customEndDate, isLoadingProducers]);

  const handleExportarRelatorio = async () => {
    if (!currentProducer) return;
    setIsExporting(true);
    try {
      const token = localStorage.getItem("@AgroPops:token");
      const parametros = obterParametrosDeData(activeFilter);
      const response = await fetch(`${baseUrl}/notas/exportar/${currentProducer.id}${parametros}`, {
        method: 'GET', headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Livro_Caixa_${currentProducer.nome.replace(/\s+/g, "_")}_${activeFilter.replace(/\s+/g, "")}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else { alert("Erro ao exportar o relatório."); }
    } catch (error) { alert("Falha de conexão ao exportar."); } finally { setIsExporting(false); }
  };

  const aplicarFiltroPersonalizado = () => {
    if (tempStartDate && tempEndDate) {
      setCustomStartDate(tempStartDate);
      setCustomEndDate(tempEndDate);
      setActiveFilter("Personalizado");
      setShowCustomDateModal(false);
    } else {
      alert("Por favor, preencha a data de início e fim.");
    }
  };

  const totalEntradas = notas.filter((n) => n.tipo === "ENTRADA").reduce((acc, curr) => acc + curr.valorTotal, 0);
  const totalSaidas = notas.filter((n) => n.tipo === "SAIDA").reduce((acc, curr) => acc + curr.valorTotal, 0);
  const saldo = totalEntradas - totalSaidas;

  let totalDedutivel = 0;
  notas.filter((n) => n.tipo === "SAIDA").forEach((nota) => {
    nota.itens.forEach((item) => { if (item.isDedutivel) totalDedutivel += item.valor; });
  });

  totalDedutivel = Math.min(totalDedutivel, totalSaidas);
  const totalNaoDedutivel = Math.max(0, totalSaidas - totalDedutivel);
  const porcentagemDedutivel = totalSaidas > 0 ? Math.round((totalDedutivel / totalSaidas) * 100) : 0;

  const formatBRL = (valor: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
  const formatarData = (dataString: string) => {
    if (!dataString) return "";
    const [ano, mes, dia] = dataString.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const ultimasNotas = notas.slice(0, 4);
  const exibirTelaInicial = isLoadingProducers || isInitialLoad;

  return (
    <div className="space-y-6">
      {/* O Trator agora só aparece na primeira vez! */}
      <TractorLoadingOverlay ativo={exibirTelaInicial} />

      {/* Container que fica transparente enquanto busca dados nas trocas de data */}
      <div className={`space-y-6 transition-opacity duration-300 ${(isLoadingNotas && !isInitialLoad) ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Visão Geral {currentProducer ? `- ${(currentProducer.nome || "").split(" ")[0]}` : ""}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Resumo financeiro e fiscal atualizado em tempo real via SEFAZ.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button 
              onClick={handleExportarRelatorio}
              disabled={isExporting || notas.length === 0}
              className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl font-medium hover:bg-slate-900 transition-colors shadow-sm text-sm disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Exportar CSV
            </button>

            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
              {filters.map((filter) => (
                <button key={filter} onClick={() => setActiveFilter(filter)} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeFilter === filter ? "bg-agro-secondary text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}>
                  {filter}
                </button>
              ))}
              
              <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block"></div>
              
              <button 
                onClick={() => setShowCustomDateModal(true)} 
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeFilter === "Personalizado" ? "bg-agro-secondary text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}
                title="Filtrar por data específica"
              >
                <CalendarDays size={16} />
                {activeFilter === "Personalizado" && <span className="hidden sm:inline">Personalizado</span>}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div onClick={() => navigate('/app/notas', { state: { abaInicial: 'todas', periodoInicial: activeFilter, dataInicio: customStartDate, dataFim: customEndDate } })} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-105 transition-all">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Wallet size={20} /></div>
                <span className="font-semibold text-gray-500">Saldo Geral</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setShowValues(!showValues); }} className="text-gray-400 hover:text-gray-600 p-1">
                {showValues ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
            <div className="mt-4"><h2 className={`text-3xl font-bold ${saldo < 0 ? "text-rose-600" : "text-gray-800"}`}>{showValues ? formatBRL(saldo) : "R$ •••••••"}</h2></div>
          </div>

          <div onClick={() => navigate('/app/notas', { state: { abaInicial: 'entrada', periodoInicial: activeFilter, dataInicio: customStartDate, dataFim: customEndDate } })} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-105 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><TrendingUp size={20} /></div>
              <span className="font-semibold text-gray-500">Total de Entradas</span>
            </div>
            <div className="mt-4"><h2 className="text-3xl font-bold text-emerald-600">{showValues ? formatBRL(totalEntradas) : "R$ •••••••"}</h2></div>
          </div>

          <div onClick={() => navigate('/app/notas', { state: { abaInicial: 'saida', periodoInicial: activeFilter, dataInicio: customStartDate, dataFim: customEndDate } })} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-105 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center"><TrendingDown size={20} /></div>
              <span className="font-semibold text-gray-500">Total de Saídas</span>
            </div>
            <div className="mt-4"><h2 className="text-3xl font-bold text-rose-600">{showValues ? formatBRL(totalSaidas) : "R$ •••••••"}</h2></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FileText size={20} className="text-agro-secondary" />Classificação LCDPR (Detalhada por Item)</h3>
              <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{activeFilter}</span>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              {notas.length === 0 && !isLoadingNotas ? (
                <div className="flex justify-center items-center h-full text-gray-400">Nenhum dado neste período.</div>
              ) : (
                <>
                  <div className="mb-2 flex justify-between text-sm font-semibold">
                    <span className="text-emerald-600">Dedutível ({porcentagemDedutivel}%)</span>
                    <span className="text-rose-500">Não Dedutível ({100 - porcentagemDedutivel}%)</span>
                  </div>
                  <div className="w-full h-4 bg-rose-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500 rounded-r-none transition-all" style={{ width: `${porcentagemDedutivel}%` }} />
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-4">
                    
                   {/* CARTÕES CLICÁVEIS DE DEDUTIBILIDADE */}
                    <div 
                      onClick={() => navigate('/app/notas', { state: { abaInicial: 'saida', periodoInicial: activeFilter, dataInicio: customStartDate, dataFim: customEndDate, filtroDedutibilidade: 'dedutivel' } })}
                      className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 cursor-pointer hover:bg-emerald-100/50 hover:shadow-sm transition-all"
                    >
                      <p className="text-sm text-gray-500 font-medium">Abate Imposto (Itens)</p>
                      <p className="text-xl font-bold text-emerald-700 mt-1">{showValues ? formatBRL(totalDedutivel) : "••••••"}</p>
                    </div>
                    
                    <div 
                      onClick={() => navigate('/app/notas', { state: { abaInicial: 'saida', periodoInicial: activeFilter, dataInicio: customStartDate, dataFim: customEndDate, filtroDedutibilidade: 'nao_dedutivel' } })}
                      className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 cursor-pointer hover:bg-rose-100/50 hover:shadow-sm transition-all"
                    >
                      <p className="text-sm text-gray-500 font-medium">Despesa Pessoal (Itens)</p>
                      <p className="text-xl font-bold text-rose-700 mt-1">{showValues ? formatBRL(totalNaoDedutivel) : "••••••"}</p>
                    </div>

                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Receipt size={20} className="text-gray-400" />Últimas Notas Importadas</h3>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {notas.length === 0 && !isLoadingNotas ? (
                <div className="flex justify-center py-10 text-gray-400 text-sm">Nenhuma nota encontrada.</div>
              ) : (
                ultimasNotas.map((nota) => (
                  <div key={nota.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${nota.tipo === "ENTRADA" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                        {nota.tipo === "ENTRADA" ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{nota.empresaEnvolvida}</p>
                        <p className="text-xs text-gray-400">{formatarData(nota.dataEmissao)} • {nota.itens.length} itens</p>
                      </div>
                    </div>
                    <div className={`font-bold text-sm ${nota.tipo === "ENTRADA" ? "text-emerald-600" : "text-gray-700"}`}>
                      {nota.tipo === "ENTRADA" ? "+" : "-"} {showValues ? formatBRL(nota.valorTotal) : "••••••"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* MODAL DE DATA PERSONALIZADA */}
      {showCustomDateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <CalendarDays size={18} className="text-agro-secondary" /> Período Específico
              </h2>
              <button onClick={() => setShowCustomDateModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Data de Início</label>
                <input type="date" value={tempStartDate} onChange={e => setTempStartDate(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-agro-secondary" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Data Final</label>
                <input type="date" value={tempEndDate} onChange={e => setTempEndDate(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-agro-secondary" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowCustomDateModal(false)} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">Cancelar</button>
              <button onClick={aplicarFiltroPersonalizado} className="px-5 py-2.5 text-sm font-bold text-white bg-agro-secondary hover:bg-agro-primary rounded-xl shadow-sm transition-colors">
                Aplicar Filtro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}