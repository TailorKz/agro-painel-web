import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  Search,
  TrendingUp,
  TrendingDown,
  FileText,
  UploadCloud,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Edit3,
  Trash2,
  Save,
  RotateCcw,
  CalendarDays,
  ChevronDown,
} from "lucide-react";
import { useProducer } from "../context/ProducerContext";

type ItemNota = {
  id: number;
  descricao: string;
  ncm: string;
  valor: number;
  isDedutivel: boolean;
};
type NotaFiscal = {
  id: number;
  numero: string;
  dataEmissao: string;
  tipo: "ENTRADA" | "SAIDA";
  valorTotal: number;
  empresaEnvolvida: string;
  chaveAcessoReferencia?: string;
  itens: ItemNota[];
};

export function NotasFiscais() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const { currentProducer } = useProducer();
  const location = useLocation();

  const abaInicial = location.state?.abaInicial || "todas";
  const periodoInicial = location.state?.periodoInicial || new Date().getFullYear();
  const dataInicioInicial = location.state?.dataInicio || "";
  const dataFimInicial = location.state?.dataFim || "";
  const dedutibilidadeInicial = location.state?.filtroDedutibilidade || "todos";

  const [activeTab, setActiveTab] = useState(abaInicial);
  const [activePeriod, setActivePeriod] = useState<string | number>(periodoInicial);
  const [filtroDedutibilidade, setFiltroDedutibilidade] = useState<"todos" | "dedutivel" | "nao_dedutivel">(dedutibilidadeInicial);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [customStartDate, setCustomStartDate] = useState(dataInicioInicial);
  const [customEndDate, setCustomEndDate] = useState(dataFimInicial);
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

  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNotas, setIsLoadingNotas] = useState(false);
  const idBuscaRef = useRef(0);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedNotaModal, setSelectedNotaModal] = useState<NotaFiscal | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState({ text: "", type: "" });

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

  const chaveCacheNotas = useCallback((produtorId: string, periodo: string | number) =>
    `@AgroPops:notasCache:${produtorId}:${periodo}${customStartDate}${customEndDate}`, [customStartDate, customEndDate]);

  const buscarNotas = useCallback(async () => {
    if (!currentProducer) return;
    const idDestaBusca = ++idBuscaRef.current;
    try {
      const token = localStorage.getItem("@AgroPops:token");
      const parametros = obterParametrosDeData(activePeriod);
      const response = await fetch(`${baseUrl}/notas/listar/${currentProducer.id}${parametros}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const dados = await response.json();
        if (idBuscaRef.current !== idDestaBusca) return;
        setNotas(dados);
        localStorage.setItem(chaveCacheNotas(currentProducer.id, activePeriod), JSON.stringify(dados));
      } else {
        setNotas([]);
      }
    } catch (error) {
      console.error(error);
      setNotas([]);
    } finally {
      if (idBuscaRef.current === idDestaBusca) setIsLoadingNotas(false);
    }
  }, [currentProducer, activePeriod, customStartDate, customEndDate, baseUrl, obterParametrosDeData, chaveCacheNotas]);

  useEffect(() => {
    if (!currentProducer) {
      setNotas([]);
      return;
    }
    const cacheSalvo = localStorage.getItem(chaveCacheNotas(currentProducer.id, activePeriod));
    if (cacheSalvo) {
      try {
        setNotas(JSON.parse(cacheSalvo));
      } catch {
        setNotas([]);
      }
    } else {
      setNotas([]);
      setIsLoadingNotas(true);
    }
    buscarNotas();
  }, [currentProducer?.id, activePeriod, customStartDate, customEndDate, buscarNotas, chaveCacheNotas]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files)
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleUploadXMLs = async () => {
    if (selectedFiles.length === 0 || !currentProducer) return;
    setIsUploading(true);
    setUploadMessage({ text: "Preparando envio em lotes...", type: "success" });

    const token = localStorage.getItem("@AgroPops:token");
    let sucesso = 0;
    let falha = 0;
    const tamanhoLote = 20;

    for (let i = 0; i < selectedFiles.length; i += tamanhoLote) {
      const lote = selectedFiles.slice(i, i + tamanhoLote);
      const formData = new FormData();
      lote.forEach((file) => formData.append("arquivos", file));

      try {
        const response = await fetch(
          `${baseUrl}/notas/importar/${currentProducer.id}`,
          { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData }
        );
        if (response.ok) { sucesso += lote.length; } else { falha += lote.length; }
      } catch (error) { falha += lote.length; }

      const loteAtual = Math.ceil((i + 1) / tamanhoLote);
      const totalLotes = Math.ceil(selectedFiles.length / tamanhoLote);
      setUploadMessage({
        text: `Processando lote ${loteAtual} de ${totalLotes}... (${sucesso} salvas)`,
        type: "success",
      });
    }
    setUploadMessage({
      text: `Concluído! ${sucesso} processadas.`,
      type: sucesso > 0 ? "success" : "error",
    });
    setTimeout(() => {
      setIsImportModalOpen(false);
      setSelectedFiles([]);
      buscarNotas();
    }, 1000);
    setIsUploading(false);
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

  const toggleItemDedutibilidade = (itemId: number) => {
    if (selectedNotaModal) {
      const updatedNota = {
        ...selectedNotaModal,
        itens: selectedNotaModal.itens.map((item) =>
          item.id === itemId ? { ...item, isDedutivel: !item.isDedutivel } : item,
        ),
      };
      setSelectedNotaModal(updatedNota);
    }
  };

  const salvarAlteracoesItens = async () => {
    if (!selectedNotaModal) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("@AgroPops:token");
      const response = await fetch(
        `${baseUrl}/notas/atualizar-itens/${selectedNotaModal.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(selectedNotaModal.itens),
        },
      );
      if (response.ok) {
        setSelectedNotaModal(null);
        buscarNotas();
      }
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const excluirNota = async (notaId: number) => {
    if (!window.confirm("Atenção: Deseja realmente excluir esta nota? A ação é irreversível.")) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("@AgroPops:token");
      const response = await fetch(`${baseUrl}/notas/deletar/${notaId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setSelectedNotaModal(null);
        buscarNotas();
      }
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const confirmarExclusaoEmMassa = async () => {
    if (!currentProducer) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("@AgroPops:token");
      const parametros = obterParametrosDeData(activePeriod); 
      const response = await fetch(`${baseUrl}/notas/deletar-todas/${currentProducer.id}${parametros}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` } 
      });
      if (response.ok) {
        setIsDeleteModalOpen(false);
        setNotas([]);
        buscarNotas();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const notasFiltradas = notas.filter((nota) => {
    const matchesSearch = nota.empresaEnvolvida.toLowerCase().includes(searchTerm.toLowerCase()) || nota.numero.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === "todas" || nota.tipo.toLowerCase() === activeTab;
    let matchesDedutibilidade = true;
    if (activeTab === "saida" && filtroDedutibilidade !== "todos") {
      if (filtroDedutibilidade === "dedutivel") matchesDedutibilidade = nota.itens.some((item) => item.isDedutivel);
      else if (filtroDedutibilidade === "nao_dedutivel") matchesDedutibilidade = nota.itens.some((item) => !item.isDedutivel);
    }
    return matchesSearch && matchesTab && matchesDedutibilidade;
  });

  const formatBRL = (valor: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
  const formatarData = (dataString: string) => {
    if (!dataString) return "";
    const [ano, mes, dia] = dataString.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notas Fiscais</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activePeriod === "Personalizado" ? `Filtrando por período específico.` : `Clique sobre a linha da nota para editar.`}
          </p>
        </div>
        
        <div className="flex flex-col lg:flex-row items-center gap-3">
          
          {/* BARRA DE FILTROS UNIFICADA */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex-wrap justify-center relative w-full lg:w-auto">
            
            {/* Anos */}
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
                      <button key={ano} onClick={() => { setActivePeriod(ano); setShowYearDropdown(false); }} className={`px-2 py-2 text-xs font-bold rounded-lg transition-colors ${activePeriod === ano ? 'bg-agro-secondary text-white' : 'text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200'}`}>
                        {ano}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block"></div>

            {/* Períodos */}
            {["Hoje", "Este Mês", "Tudo"].map((filter) => (
              <button key={filter} onClick={() => setActivePeriod(filter)} className={`px-3 lg:px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${activePeriod === filter ? "bg-agro-secondary text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}>
                {filter}
              </button>
            ))}
            
            <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block"></div>
            
            <button 
              onClick={() => setShowCustomDateModal(true)} 
              className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${activePeriod === "Personalizado" ? "bg-agro-secondary text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}
              title="Filtrar por data específica"
            >
              <CalendarDays size={16} />
              {activePeriod === "Personalizado" && <span className="hidden sm:inline">Personalizado</span>}
            </button>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            <button onClick={() => setIsDeleteModalOpen(true)} disabled={isLoading || notas.length === 0} className="flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-200 px-4 py-2.5 rounded-xl font-medium hover:bg-rose-100 transition-colors shadow-sm text-sm disabled:opacity-50">
              <Trash2 size={18} /> Apagar Seleção
            </button>
            <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl font-medium hover:bg-emerald-100 transition-colors shadow-sm text-sm">
              <UploadCloud size={18} /> Importar XML
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center w-full">
          <div className="flex-1 relative w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar por empresa ou número..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-agro-light text-sm" />
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200 w-full md:w-auto">
            <button onClick={() => setActiveTab("todas")} className={`px-4 py-1.5 text-sm font-bold rounded-lg ${activeTab === "todas" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}>Todas</button>
            <button onClick={() => setActiveTab("entrada")} className={`px-4 py-1.5 text-sm font-bold rounded-lg ${activeTab === "entrada" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500"}`}>Entradas</button>
            <button onClick={() => setActiveTab("saida")} className={`px-4 py-1.5 text-sm font-bold rounded-lg ${activeTab === "saida" ? "bg-white text-rose-600 shadow-sm" : "text-gray-500"}`}>Saídas</button>
          </div>
        </div>

        {activeTab === "saida" && (
          <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-gray-100">
            <span className="text-sm font-semibold text-gray-500 mr-2 flex items-center gap-1"><FileText size={16} /> Filtrar Saídas:</span>
            <button onClick={() => setFiltroDedutibilidade("todos")} className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${filtroDedutibilidade === "todos" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>Mostrar Todas</button>
            <button onClick={() => setFiltroDedutibilidade("dedutivel")} className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${filtroDedutibilidade === "dedutivel" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>Possui Abate Imposto</button>
            <button onClick={() => setFiltroDedutibilidade("nao_dedutivel")} className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${filtroDedutibilidade === "nao_dedutivel" ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>Possui Despesa Pessoal</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        {isLoadingNotas ? (
          <div className="p-20 text-center text-gray-400 flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-agro-secondary" />
            <p>Buscando notas fiscais...</p>
          </div>
        ) : notasFiltradas.length === 0 ? (
          <div className="p-20 text-center text-gray-500">Nenhuma nota encontrada com os filtros atuais.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                <th className="px-6 py-4 font-medium">Empresa Envolvida</th>
                <th className="px-6 py-4 font-medium">Data Emissão</th>
                <th className="px-6 py-4 font-medium">Itens na Nota</th>
                <th className="px-6 py-4 font-medium text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {notasFiltradas.map((nota) => {
                const isDevolucaoCompleta = nota.valorTotal < 0;
                const valorAbsolutoTotal = Math.abs(nota.valorTotal);
                return (
                <tr key={nota.id} onClick={() => setSelectedNotaModal(nota)} className="hover:bg-blue-50/50 transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDevolucaoCompleta ? "bg-sky-100 text-sky-600" : nota.tipo === "ENTRADA" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                        {isDevolucaoCompleta ? <RotateCcw size={18} /> : nota.tipo === "ENTRADA" ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                      </div>
                     <div>
                        <p className="font-semibold text-gray-800">{nota.empresaEnvolvida}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-400 font-mono">Nº {nota.numero}</p>
                          {nota.chaveAcessoReferencia && (
                            <span className="bg-sky-50 text-sky-600 border border-sky-100 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider flex items-center gap-1">
                              <RotateCcw size={10} strokeWidth={3} /> CONTRA-NOTA
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="text-sm text-gray-600">{formatarData(nota.dataEmissao)}</span></td>
                  <td className="px-6 py-4"><span className="text-sm font-medium bg-gray-100 text-gray-600 px-3 py-1 rounded-full border border-gray-200">{nota.itens.length} produtos</span></td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-bold ${isDevolucaoCompleta ? "text-sky-600" : nota.tipo === "ENTRADA" ? "text-emerald-600" : "text-gray-800"}`}>
                      {isDevolucaoCompleta ? <span className="flex items-center justify-end gap-1"><RotateCcw size={12}/> {formatBRL(valorAbsolutoTotal)}</span> : formatBRL(nota.valorTotal)}
                    </span>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        )}
      </div>

      {selectedNotaModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="text-agro-secondary" /> Nota Fiscal Nº {selectedNotaModal.numero}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedNotaModal.empresaEnvolvida} • {formatarData(selectedNotaModal.dataEmissao)}</p>
                  {/* ALERTA DE VÍNCULO DE DEVOLUÇÃO */}
                  {selectedNotaModal.chaveAcessoReferencia && (
                    <div className="mt-3 p-2.5 bg-sky-50 border border-sky-100 rounded-lg flex items-start gap-2 max-w-xl">
                      <RotateCcw size={16} className="text-sky-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-sky-800">Nota de Devolução (Estorno)</p>
                        <p className="text-[10px] text-sky-600 font-mono mt-0.5 break-all">Referente à Chave: {selectedNotaModal.chaveAcessoReferencia}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedNotaModal(null)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-400"><X size={20} /></button>
            </div>

            <div className="p-6 overflow-y-auto bg-white">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Itens da Operação ({selectedNotaModal.itens.length})</h3>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                      <th className="px-4 py-3 font-medium">Produto / Descrição</th>
                      <th className="px-4 py-3 font-medium">NCM</th>
                      <th className="px-4 py-3 font-medium">Dedutibilidade (LCDPR)</th>
                      <th className="px-4 py-3 font-medium text-right">Valor Unitário</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedNotaModal.itens.map((item) => {
                       const isDevolucao = item.descricao.includes('[DEVOLUÇÃO]');
                       const descricaoLimpa = item.descricao.replace('[DEVOLUÇÃO]', '').trim();
                       const valorAbsoluto = Math.abs(item.valor);
                       return(
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                          {isDevolucao ? (
                            <span className="text-sky-600 flex items-center gap-1.5 font-bold" title="Item de Devolução/Estorno">
                              <RotateCcw size={14} strokeWidth={3} /> {descricaoLimpa}
                            </span>
                          ) : (
                            item.descricao
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{item.ncm}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleItemDedutibilidade(item.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${item.isDedutivel ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"}`}
                          >
                            <Edit3 size={12} /> {item.isDedutivel ? "Despesa Dedutível" : "Uso Pessoal (Não Dedutível)"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-700 text-right">
                          {isDevolucao ? (
                            <span className="text-sky-600">- {formatBRL(valorAbsoluto)}</span>
                          ) : (
                            formatBRL(item.valor)
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <div className="flex gap-3">
                <button onClick={salvarAlteracoesItens} disabled={isLoading} className="flex items-center gap-2 px-6 py-2.5 bg-agro-secondary hover:bg-agro-primary text-white font-bold rounded-xl shadow-sm transition-all">
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Alterações
                </button>
                <button onClick={() => excluirNota(selectedNotaModal.id)} disabled={isLoading} className="flex items-center gap-2 px-6 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-xl shadow-sm transition-all">
                  <Trash2 size={18} /> Excluir Nota
                </button>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Valor Total da Nota</p>
                <p className="text-2xl font-bold text-gray-800">{formatBRL(selectedNotaModal.valorTotal)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE APAGAR NOTAS */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-rose-600 flex items-center gap-2"><Trash2 /> Apagar Notas Selecionadas</h2>
              <button onClick={() => setIsDeleteModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Atenção: Você está prestes a excluir **todas as notas** do período selecionado atualmente: <strong>{activePeriod}</strong>.
              </p>
              <div className="bg-rose-50 p-3 rounded-lg border border-rose-100 text-xs text-rose-700 font-medium">
                ⚠️ Aviso: A exclusão abrange todas as notas importadas dentro do período selecionado. Esta ação não pode ser desfeita.
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} disabled={isLoading} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl">Cancelar</button>
              <button onClick={confirmarExclusaoEmMassa} disabled={isLoading} className="px-5 py-2.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-xl flex items-center gap-2">
                {isLoading ? <><Loader2 size={16} className="animate-spin" /> Apagando...</> : "Confirmar Exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO (XML) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><UploadCloud className="text-emerald-600" /> Importar XML</h2>
              <button onClick={() => { setIsImportModalOpen(false); setSelectedFiles([]); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {uploadMessage.text && (
                <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border ${uploadMessage.type === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                  {uploadMessage.type === "error" ? <AlertCircle size={18} /> : <CheckCircle size={18} />} {uploadMessage.text}
                </div>
              )}
              <label className="border-2 border-dashed border-emerald-200 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-emerald-50/30 hover:bg-emerald-50 transition-colors cursor-pointer group">
                <input type="file" multiple accept=".xml" className="hidden" onChange={handleFileSelect} disabled={isUploading} />
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform"><FileText size={28} /></div>
                <div className="text-center"><p className="text-sm font-semibold text-emerald-800">Clique para anexar XMLs</p></div>
              </label>
              {selectedFiles.length > 0 && (
                <div className="mt-4 max-h-40 overflow-y-auto space-y-2 pr-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-100 p-2.5 rounded-lg">
                      <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
                      <button onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))} disabled={isUploading} className="text-gray-400 hover:text-rose-500 p-1"><X size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
              <button onClick={() => { setIsImportModalOpen(false); setSelectedFiles([]); }} disabled={isUploading} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl">Cancelar</button>
              <button onClick={handleUploadXMLs} disabled={isUploading || selectedFiles.length === 0} className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center gap-2">
                {isUploading ? <><Loader2 size={18} className="animate-spin" /> Processando...</> : "Iniciar Importação"}
              </button>
            </div>
          </div>
        </div>
      )}

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