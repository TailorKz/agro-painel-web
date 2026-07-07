import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Search, TrendingUp, TrendingDown, FileText, UploadCloud, X, AlertCircle, CheckCircle, Loader2, Edit3, Trash2, Save } from "lucide-react";
import { useProducer } from "../context/ProducerContext";

type ItemNota = { id: number; descricao: string; ncm: string; valor: number; isDedutivel: boolean; };
type NotaFiscal = { id: number; numero: string; dataEmissao: string; tipo: "ENTRADA" | "SAIDA"; valorTotal: number; empresaEnvolvida: string; itens: ItemNota[]; };

export function NotasFiscais() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const { currentProducer } = useProducer();
  const location = useLocation();

  const abaInicial = location.state?.abaInicial || "todas";
  const periodoInicial = location.state?.periodoInicial || "Tudo";

  const [activeTab, setActiveTab] = useState(abaInicial);
  const [activePeriod, setActivePeriod] = useState(periodoInicial);
  const [searchTerm, setSearchTerm] = useState("");
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNotas, setIsLoadingNotas] = useState(false);
  const idBuscaRef = useRef(0);

  // Estados dos Modais
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedNotaModal, setSelectedNotaModal] = useState<NotaFiscal | null>(null);
  
  // NOVO: Estados para Modal de Exclusão em Massa
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePeriod, setDeletePeriod] = useState("Tudo");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState({ text: "", type: "" });

  const obterParametrosDeData = (filtro: string) => {
    const hoje = new Date();
    const formatarISO = (data: Date) => {
      const tzOffset = data.getTimezoneOffset() * 60000;
      return new Date(data.getTime() - tzOffset).toISOString().split("T")[0];
    };
    if (filtro === "Hoje") return `?inicio=${formatarISO(hoje)}&fim=${formatarISO(hoje)}`;
    
    // Adicionado opção de 7 dias para o modal de deletar
    if (filtro === "Últimos 7 dias") {
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(hoje.getDate() - 7);
      return `?inicio=${formatarISO(seteDiasAtras)}&fim=${formatarISO(hoje)}`;
    }

    if (filtro === "Este Mês") {
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return `?inicio=${formatarISO(primeiroDiaMes)}&fim=${formatarISO(hoje)}`;
    }
    if (filtro === "Este Ano") {
      const primeiroDiaAno = new Date(hoje.getFullYear(), 0, 1);
      return `?inicio=${formatarISO(primeiroDiaAno)}&fim=${formatarISO(hoje)}`;
    }
    return "";
  };

  const chaveCacheNotas = (produtorId: string, periodo: string) => `@AgroPops:notasCache:${produtorId}:${periodo}`;

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
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (idBuscaRef.current === idDestaBusca) setIsLoadingNotas(false);
    }
  }, [currentProducer, activePeriod]);

  useEffect(() => {
    if (!currentProducer) {
      setNotas([]);
      return;
    }
    const cacheSalvo = localStorage.getItem(chaveCacheNotas(currentProducer.id, activePeriod));
    if (cacheSalvo) {
      try { setNotas(JSON.parse(cacheSalvo)); } catch { setNotas([]); }
    } else {
      setNotas([]);
      setIsLoadingNotas(true);
    }
    buscarNotas();
  }, [currentProducer?.id, activePeriod]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleUploadXMLs = async () => {
    if (selectedFiles.length === 0 || !currentProducer) return;
    setIsUploading(true);
    setUploadMessage({ text: "Preparando envio em lotes...", type: "success" });

    const token = localStorage.getItem("@AgroPops:token");
    let sucesso = 0; let falha = 0; const tamanhoLote = 20;

    for (let i = 0; i < selectedFiles.length; i += tamanhoLote) {
      const lote = selectedFiles.slice(i, i + tamanhoLote);
      const formData = new FormData();
      lote.forEach((file) => formData.append("arquivos", file));

      try {
        const response = await fetch(`${baseUrl}/notas/importar/${currentProducer.id}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (response.ok) { sucesso += lote.length; } else { falha += lote.length; }
      } catch (error) { falha += lote.length; }

      const loteAtual = Math.ceil((i + 1) / tamanhoLote);
      const totalLotes = Math.ceil(selectedFiles.length / tamanhoLote);
      setUploadMessage({ text: `Processando lote ${loteAtual} de ${totalLotes}... (${sucesso} salvas)`, type: "success" });
    }

    setUploadMessage({ text: `Concluído! ${sucesso} processadas.`, type: sucesso > 0 ? "success" : "error" });

    // FECHAMENTO RÁPIDO DO MODAL (Reduzido de 3s para 1s)
    setTimeout(() => {
      setIsImportModalOpen(false);
      setSelectedFiles([]);
      buscarNotas();
    }, 1000);

    setIsUploading(false);
  };

  const toggleItemDedutibilidade = (itemId: number) => {
    if (selectedNotaModal) {
      const updatedNota = { ...selectedNotaModal, itens: selectedNotaModal.itens.map((item) => item.id === itemId ? { ...item, isDedutivel: !item.isDedutivel } : item ) };
      setSelectedNotaModal(updatedNota);
    }
  };

  const salvarAlteracoesItens = async () => {
    if (!selectedNotaModal) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("@AgroPops:token");
      const response = await fetch(`${baseUrl}/notas/atualizar-itens/${selectedNotaModal.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(selectedNotaModal.itens),
      });
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
      const response = await fetch(`${baseUrl}/notas/deletar/${notaId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        setSelectedNotaModal(null);
        buscarNotas();
      }
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  // NOVA FUNÇÃO: Exclusão com Período selecionado
  const confirmarExclusaoEmMassa = async () => {
    if (!currentProducer) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("@AgroPops:token");
      const parametros = obterParametrosDeData(deletePeriod);
      
      const response = await fetch(`${baseUrl}/notas/deletar-todas/${currentProducer.id}${parametros}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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
    return matchesSearch && matchesTab;
  });

  const formatBRL = (valor: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
  const formatarData = (dataString: string) => {
    if (!dataString) return "";
    const [ano, mes, dia] = dataString.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notas Fiscais</h1>
          <p className="text-sm text-gray-500 mt-1">Clique sobre a linha da nota para editar a dedutibilidade dos itens.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* BOTÃO APAGAR TODAS AGORA ABRE UM MODAL */}
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={isLoading || notas.length === 0}
            className="flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-200 px-4 py-2 rounded-xl font-medium hover:bg-rose-100 transition-colors shadow-sm text-sm disabled:opacity-50"
          >
            <Trash2 size={18} /> Apagar Notas
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl font-medium hover:bg-emerald-100 transition-colors shadow-sm text-sm"
          >
            <UploadCloud size={18} /> Importar XML
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar por empresa ou número..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-agro-light text-sm" />
        </div>
        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200 w-full md:w-auto">
          <button onClick={() => setActiveTab("todas")} className={`px-4 py-1.5 text-sm font-medium rounded-lg ${activeTab === "todas" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}>Todas</button>
          <button onClick={() => setActiveTab("entrada")} className={`px-4 py-1.5 text-sm font-medium rounded-lg ${activeTab === "entrada" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500"}`}>Entradas</button>
          <button onClick={() => setActiveTab("saida")} className={`px-4 py-1.5 text-sm font-medium rounded-lg ${activeTab === "saida" ? "bg-white text-rose-600 shadow-sm" : "text-gray-500"}`}>Saídas</button>
        </div>
      </div>

      {/* TABELA PRINCIPAL */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoadingNotas ? (
          <div className="p-10 text-center text-gray-500">Buscando notas...</div>
        ) : notasFiltradas.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Nenhuma nota encontrada.</div>
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
              {notasFiltradas.map((nota) => (
                <tr key={nota.id} onClick={() => setSelectedNotaModal(nota)} className="hover:bg-blue-50/50 transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${nota.tipo === "ENTRADA" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                        {nota.tipo === "ENTRADA" ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{nota.empresaEnvolvida}</p>
                        <p className="text-xs text-gray-400 font-mono">Nº {nota.numero}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="text-sm text-gray-600">{formatarData(nota.dataEmissao)}</span></td>
                  <td className="px-6 py-4"><span className="text-sm font-medium bg-gray-100 text-gray-600 px-3 py-1 rounded-full border border-gray-200">{nota.itens.length} produtos</span></td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-bold ${nota.tipo === "ENTRADA" ? "text-emerald-600" : "text-gray-800"}`}>
                      {nota.tipo === "ENTRADA" ? "+" : "-"} {formatBRL(nota.valorTotal)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL DE DETALHES DA NOTA (ITENS) */}
      {selectedNotaModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="text-agro-secondary" />
                    Nota Fiscal Nº {selectedNotaModal.numero}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedNotaModal.empresaEnvolvida} • {formatarData(selectedNotaModal.dataEmissao)}</p>
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
                    {selectedNotaModal.itens.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.descricao}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{item.ncm}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleItemDedutibilidade(item.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${item.isDedutivel ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"}`}>
                            <Edit3 size={12} />
                            {item.isDedutivel ? "Despesa Dedutível" : "Uso Pessoal (Não Dedutível)"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-700 text-right">{formatBRL(item.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BOTÃO EXCLUIR MOVIDO PARA O FOOTER JUNTO COM O SALVAR */}
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

      {/* NOVO MODAL: SELECIONAR PERÍODO PARA EXCLUIR NOTAS */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-rose-600 flex items-center gap-2">
                <Trash2 /> Apagar Notas Fiscais
              </h2>
              <button onClick={() => setIsDeleteModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Selecione o período das notas que deseja apagar permanentemente do banco de dados deste produtor.
              </p>
              <select 
                value={deletePeriod} 
                onChange={e => setDeletePeriod(e.target.value)} 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800"
              >
                <option value="Hoje">Hoje</option>
                <option value="Últimos 7 dias">Últimos 7 dias</option>
                <option value="Este Mês">Este Mês</option>
                <option value="Este Ano">Este Ano</option>
                <option value="Tudo">Apagar Todas as Notas</option>
              </select>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} disabled={isLoading} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={confirmarExclusaoEmMassa} disabled={isLoading} className="px-5 py-2.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors shadow-sm flex items-center gap-2">
                {isLoading ? <><Loader2 size={16} className="animate-spin" /> Apagando...</> : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação XML (Upload) */}
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
              <button onClick={() => { setIsImportModalOpen(false); setSelectedFiles([]); }} disabled={isUploading} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={handleUploadXMLs} disabled={isUploading || selectedFiles.length === 0} className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
                {isUploading ? <><Loader2 size={18} className="animate-spin" /> Processando...</> : "Iniciar Importação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}