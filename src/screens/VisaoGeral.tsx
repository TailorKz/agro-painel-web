import { useState, useEffect, useMemo, useCallback } from "react";
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
  Scale,
  ChevronDown
} from "lucide-react";
import { useProducer } from "../context/ProducerContext";
import { TractorLoadingOverlay } from "../components/TractorLoadingOverlay";


type ItemNota = { id: number; descricao: string; ncm: string; valor: number; isDedutivel: boolean; };
type NotaFiscal = { id: number; numero: string; dataEmissao: string; tipo: "ENTRADA" | "SAIDA"; valorTotal: number; empresaEnvolvida: string; itens: ItemNota[]; };

export function VisaoGeral() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const { currentProducer, isLoadingProducers, currentProperty } = useProducer();
  const navigate = useNavigate();
  
  const [showValues, setShowValues] = useState(true);
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [isLoadingNotas, setIsLoadingNotas] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [activePeriod, setActivePeriod] = useState<string | number>(new Date().getFullYear());

  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  const anosDisponiveis = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    return Array.from({ length: 15 }, (_, i) => anoAtual - 5 + i);
  }, []);

  const botoesAnosRapidos = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    const anoAtivo = typeof activePeriod === 'number' ? activePeriod : anoAtual;
    const anos = new Set([anoAtual - 1, anoAtual, anoAtual + 1, anoAtivo]);
    return Array.from(anos).sort((a, b) => a - b);
  }, [activePeriod]);

  const obterParametrosDeData = useCallback((periodo: string | number) => {
    const hoje = new Date();
    const formatarDataLocal = (data: Date) => {
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const dia = String(data.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    };

    if (typeof periodo === 'number') return `?inicio=${periodo}-01-01&fim=${periodo}-12-31`;
    if (periodo === "Hoje") return `?inicio=${formatarDataLocal(hoje)}&fim=${formatarDataLocal(hoje)}`;
    if (periodo === "Este Mês") {
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      return `?inicio=${formatarDataLocal(primeiroDia)}&fim=${formatarDataLocal(ultimoDia)}`;
    }
    if (periodo === "Tudo") return `?inicio=2000-01-01&fim=2099-12-31`;
    if (periodo === "Personalizado" && customStartDate && customEndDate) return `?inicio=${customStartDate}&fim=${customEndDate}`;
    
    return `?inicio=${hoje.getFullYear()}-01-01&fim=${hoje.getFullYear()}-12-31`;
  }, [customStartDate, customEndDate]);

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
        const response = await fetch(`${baseUrl}/notas/listar/${currentProducer.id}${obterParametrosDeData(activePeriod)}`, {
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
          setIsInitialLoad(false); 
        }
      }
    };
    buscarNotas();
    return () => { cancelado = true; };
  }, [currentProducer?.id, activePeriod, customStartDate, customEndDate, isLoadingProducers, baseUrl, obterParametrosDeData]);

  const handleExportarRelatorio = async () => {
    if (!currentProducer) return;
    setIsExporting(true);
    try {
      const token = localStorage.getItem("@AgroPops:token");
      const parametros = obterParametrosDeData(activePeriod);
      const response = await fetch(`${baseUrl}/notas/exportar/${currentProducer.id}${parametros}`, {
        method: 'GET', headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Livro_Caixa_${currentProducer.nome.replace(/\s+/g, "_")}_${activePeriod.toString().replace(/\s+/g, "")}.csv`;
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
      setActivePeriod("Personalizado");
      setShowCustomDateModal(false);
    } else {
      alert("Por favor, preencha a data de início e fim.");
    }
  };

  // --- MOTOR DE CÁLCULO INTELIGENTE (COERENTE COM O SIMULADOR) ---
  const metricasFinanceiras = useMemo(() => {
    // Se houver uma propriedade selecionada, aplica a porcentagem. Se não, é 100% (1).
    const multiplicador = currentProperty ? (currentProperty.percentualParticipacao / 100) : 1;

    const totalEntradas = notas.filter((n) => n.tipo === "ENTRADA").reduce((acc, curr) => acc + curr.valorTotal, 0) * multiplicador;
    const totalSaidas = notas.filter((n) => n.tipo === "SAIDA").reduce((acc, curr) => acc + curr.valorTotal, 0) * multiplicador;
    const saldo = totalEntradas - totalSaidas;

    let totalDedutivel = 0;
    notas.filter((n) => n.tipo === "SAIDA").forEach((nota) => {
      nota.itens.forEach((item) => { if (item.isDedutivel) totalDedutivel += item.valor; });
    });
    totalDedutivel = Math.min(totalDedutivel * multiplicador, totalSaidas);
    
    const totalNaoDedutivel = Math.max(0, totalSaidas - totalDedutivel);
    const porcentagemDedutivel = totalSaidas > 0 ? Math.round((totalDedutivel / totalSaidas) * 100) : 0;
    
    const lucro = Math.max(0, totalEntradas - totalDedutivel);

    // Tabela Progressiva do IR
    const calcularImposto = (base: number) => {
      if (base <= 28467.20) return 0;
      if (base <= 33919.80) return (base * 0.075) - 2135.04;
      if (base <= 45012.60) return (base * 0.15) - 4679.03;
      if (base <= 55976.16) return (base * 0.225) - 8054.97;
      return (base * 0.275) - 10853.78;
    };

    const impostoEstimado = calcularImposto(lucro);
    const aliquotaEfetiva = totalEntradas > 0 ? (impostoEstimado / totalEntradas) * 100 : 0;

    return { totalEntradas, totalSaidas, saldo, totalDedutivel, totalNaoDedutivel, porcentagemDedutivel, impostoEstimado, aliquotaEfetiva };
  }, [notas, currentProperty]);

  const formatBRL = (valor: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
  const formatarData = (dataString: string) => {
    if (!dataString) return "";
    const [ano, mes, dia] = dataString.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const ultimasNotas = notas.slice(0, 4);
  const exibirTelaInicial = isLoadingProducers || isInitialLoad;

  return (
    <div className="space-y-6 pb-10">
      <TractorLoadingOverlay ativo={exibirTelaInicial} />

      <div className={`space-y-6 transition-opacity duration-300 ${(isLoadingNotas && !isInitialLoad) ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Visão Geral {currentProducer ? `- ${(currentProducer.nome || "").split(" ")[0]}` : ""}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Resumo financeiro e fiscal atualizado em tempo real via SEFAZ.</p>
          </div>
          
          <div className="flex flex-col lg:flex-row items-center gap-3">
            <button 
              onClick={handleExportarRelatorio}
              disabled={isExporting || notas.length === 0}
              className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl font-medium hover:bg-slate-900 transition-colors shadow-sm text-sm disabled:opacity-50 w-full lg:w-auto justify-center"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Exportar CSV
            </button>

            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex-wrap justify-center relative w-full lg:w-auto">
              {botoesAnosRapidos.map(ano => (
                <button key={ano} onClick={() => setActivePeriod(ano)} className={`px-3 lg:px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${activePeriod === ano ? "bg-agro-secondary text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}>
                  {ano}
                </button>
              ))}
              
              <button onClick={() => setShowYearDropdown(!showYearDropdown)} className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${showYearDropdown ? "bg-gray-100 text-gray-800" : "text-gray-500 hover:bg-gray-100"}`}>
                <ChevronDown size={16} />
              </button>

              {showYearDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowYearDropdown(false)} />
                  <div className="absolute right-auto left-0 md:left-auto md:right-0 top-full mt-2 bg-white border border-gray-100 shadow-xl rounded-xl p-3 z-50 w-72">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Selecione o Ano Base</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {anosDisponiveis.map(ano => (
                        <button key={ano} onClick={() => { setActivePeriod(ano); setShowYearDropdown(false); }} className={`px-2 py-2 text-xs font-bold rounded-lg transition-colors ${activePeriod === ano ? 'bg-agro-secondary text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                          {ano}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block"></div>

              {["Hoje", "Este Mês", "Tudo"].map((filter) => (
                <button key={filter} onClick={() => setActivePeriod(filter)} className={`px-3 lg:px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${activePeriod === filter ? "bg-agro-secondary text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}>
                  {filter}
                </button>
              ))}
              
              <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block"></div>
              
              <button 
                onClick={() => setShowCustomDateModal(true)} 
                className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${activePeriod === "Personalizado" ? "bg-agro-secondary text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}
              >
                <CalendarDays size={16} />
                {activePeriod === "Personalizado" && <span className="hidden sm:inline">Personalizado</span>}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div onClick={() => navigate('/app/notas', { state: { abaInicial: 'todas', periodoInicial: activePeriod, dataInicio: customStartDate, dataFim: customEndDate } })} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-blue-200 hover:-translate-y-1 transition-all group">
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Wallet size={20} /></div>
                <span className="font-bold text-gray-500 uppercase tracking-wider text-xs">Saldo Geral</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setShowValues(!showValues); }} className="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg transition-colors">
                {showValues ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            <div className="mt-5 relative z-10">
              <h2 className={`text-3xl font-black font-mono ${metricasFinanceiras.saldo < 0 ? "text-rose-600" : "text-gray-800"}`}>{showValues ? formatBRL(metricasFinanceiras.saldo) : "R$ •••••••"}</h2>
            </div>
            <Wallet className="absolute -right-4 -bottom-4 text-blue-600/[0.03] group-hover:text-blue-600/[0.08] transition-colors" size={100} />
          </div>

          <div onClick={() => navigate('/app/notas', { state: { abaInicial: 'entrada', periodoInicial: activePeriod, dataInicio: customStartDate, dataFim: customEndDate } })} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-emerald-200 hover:-translate-y-1 transition-all group">
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><TrendingUp size={20} /></div>
                <span className="font-bold text-gray-500 uppercase tracking-wider text-xs">Total de Entradas</span>
              </div>
            </div>
            <div className="mt-5 relative z-10">
              <h2 className="text-3xl font-black text-gray-800 font-mono">{showValues ? formatBRL(metricasFinanceiras.totalEntradas) : "R$ •••••••"}</h2>
            </div>
            <TrendingUp className="absolute -right-4 -bottom-4 text-emerald-600/[0.03] group-hover:text-emerald-600/[0.08] transition-colors" size={100} />
          </div>

          <div onClick={() => navigate('/app/notas', { state: { abaInicial: 'saida', periodoInicial: activePeriod, dataInicio: customStartDate, dataFim: customEndDate } })} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-rose-200 hover:-translate-y-1 transition-all group">
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600"><TrendingDown size={20} /></div>
                <span className="font-bold text-gray-500 uppercase tracking-wider text-xs">Total de Saídas</span>
              </div>
            </div>
            <div className="mt-5 relative z-10">
              <h2 className="text-3xl font-black text-gray-800 font-mono">{showValues ? formatBRL(metricasFinanceiras.totalSaidas) : "R$ •••••••"}</h2>
            </div>
            <TrendingDown className="absolute -right-4 -bottom-4 text-rose-600/[0.03] group-hover:text-rose-600/[0.08] transition-colors" size={100} />
          </div>

          {/* NOVO CARTÃO DE ESTIMATIVA (COM ALÍQUOTA EFETIVA) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between group cursor-default hover:border-amber-200 hover:-translate-y-1 transition-all">
             <div className="flex items-center justify-between relative z-10">
               <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600"><Scale size={20} /></div>
                 <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs">Estimativa IRPF</h3>
               </div>
               {metricasFinanceiras.aliquotaEfetiva > 0 && (
                 <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-md" title="Alíquota Efetiva">
                   {metricasFinanceiras.aliquotaEfetiva.toFixed(2)}%
                 </span>
               )}
             </div>
             <div className="mt-5 relative z-10">
               <p className="text-3xl font-black text-gray-800 font-mono">{showValues ? formatBRL(metricasFinanceiras.impostoEstimado) : "R$ •••••••"}</p>
             </div>
             <Scale className="absolute -right-4 -bottom-4 text-amber-600/[0.03] group-hover:text-amber-600/[0.08] transition-colors" size={100} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FileText size={20} className="text-agro-secondary" />Classificação LCDPR</h3>
              <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{activePeriod}</span>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              {notas.length === 0 && !isLoadingNotas ? (
                <div className="flex justify-center items-center h-full text-gray-400">Nenhum dado neste período.</div>
              ) : (
                <>
                  <div className="mb-2 flex justify-between text-sm font-semibold">
                    <span className="text-emerald-600">Dedutível ({metricasFinanceiras.porcentagemDedutivel}%)</span>
                    <span className="text-rose-500">Não Dedutível ({100 - metricasFinanceiras.porcentagemDedutivel}%)</span>
                  </div>
                  <div className="w-full h-4 bg-rose-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500 rounded-r-none transition-all" style={{ width: `${metricasFinanceiras.porcentagemDedutivel}%` }} />
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-4">
                    
                   <div 
                     onClick={() => navigate('/app/notas', { state: { abaInicial: 'saida', periodoInicial: activePeriod, dataInicio: customStartDate, dataFim: customEndDate, filtroDedutibilidade: 'dedutivel' } })}
                     className="p-4 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-emerald-200 hover:shadow-sm transition-all group"
                   >
                     <p className="text-sm text-gray-500 font-medium group-hover:text-emerald-600 transition-colors">Abate Imposto (Itens)</p>
                     <p className="text-xl font-bold text-gray-800 font-mono mt-1">{showValues ? formatBRL(metricasFinanceiras.totalDedutivel) : "••••••"}</p>
                   </div>
                   
                   <div 
                     onClick={() => navigate('/app/notas', { state: { abaInicial: 'saida', periodoInicial: activePeriod, dataInicio: customStartDate, dataFim: customEndDate, filtroDedutibilidade: 'nao_dedutivel' } })}
                     className="p-4 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-rose-200 hover:shadow-sm transition-all group"
                   >
                     <p className="text-sm text-gray-500 font-medium group-hover:text-rose-600 transition-colors">Despesa Pessoal (Itens)</p>
                     <p className="text-xl font-bold text-gray-800 font-mono mt-1">{showValues ? formatBRL(metricasFinanceiras.totalNaoDedutivel) : "••••••"}</p>
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
                  <div key={nota.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-100 transition-colors cursor-pointer" onClick={() => navigate('/app/notas')}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${nota.tipo === "ENTRADA" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                        {nota.tipo === "ENTRADA" ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{nota.empresaEnvolvida}</p>
                        <p className="text-xs text-gray-400">{formatarData(nota.dataEmissao)} • {nota.itens.length} itens</p>
                      </div>
                    </div>
                    <div className={`font-bold text-sm font-mono ${nota.tipo === "ENTRADA" ? "text-emerald-600" : "text-gray-700"}`}>
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