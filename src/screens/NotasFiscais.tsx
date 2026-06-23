import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  FileText, 
  MoreVertical,
  Calendar,
  UploadCloud,
  X,
  AlertCircle,
  CheckCircle,
  Loader2
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

export function NotasFiscais() {
  const { currentProducer } = useProducer();
  const location = useLocation();
  
  const abaInicial = location.state?.abaInicial || 'todas';
  const filtroFiscalInicial = location.state?.filtroFiscal || 'todos';
  const periodoInicial = location.state?.periodoInicial || 'Tudo';

  const [activeTab, setActiveTab] = useState(abaInicial);
  const [activePeriod, setActivePeriod] = useState(periodoInicial);
  const [searchTerm, setSearchTerm] = useState('');
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ESTADOS DO MODAL DE IMPORTAÇÃO DE XML
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState({ text: '', type: '' });

  const obterParametrosDeData = (filtro: string) => {
    const hoje = new Date();
    const formatarISO = (data: Date) => {
      const tzOffset = data.getTimezoneOffset() * 60000;
      return new Date(data.getTime() - tzOffset).toISOString().split('T')[0];
    };

    if (filtro === 'Hoje') return `?inicio=${formatarISO(hoje)}&fim=${formatarISO(hoje)}`;
    if (filtro === 'Este Mês') {
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return `?inicio=${formatarISO(primeiroDiaMes)}&fim=${formatarISO(hoje)}`;
    }
    if (filtro === 'Este Ano') {
      const primeiroDiaAno = new Date(hoje.getFullYear(), 0, 1);
      return `?inicio=${formatarISO(primeiroDiaAno)}&fim=${formatarISO(hoje)}`;
    }
    return ''; 
  };

  const buscarNotas = useCallback(async () => {
    if (!currentProducer) {
      setNotas([]);
      return;
    }
    setIsLoading(true);
    try {
      const token = localStorage.getItem('@AgroPops:token');
      const parametros = obterParametrosDeData(activePeriod);
      const response = await fetch(`http://localhost:8080/api/notas/listar/${currentProducer.id}${parametros}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const dados = await response.json();
        setNotas(dados);
      }
    } catch (error) {
      console.error("Erro ao buscar as notas:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentProducer, activePeriod]);

  useEffect(() => {
    buscarNotas();
  }, [buscarNotas]);

  // ==========================================
  // LÓGICA DE UPLOAD DE XML
  // ==========================================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Converte o FileList num Array e adiciona aos ficheiros já selecionados
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleUploadXMLs = async () => {
    if (selectedFiles.length === 0 || !currentProducer) return;
    
    setIsUploading(true);
    setUploadMessage({ text: '', type: '' });

    // O FormData é o "envelope" que o Java entende para ficheiros binários
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('arquivos', file);
    });

    try {
      const token = localStorage.getItem('@AgroPops:token');
      const response = await fetch(`http://localhost:8080/api/notas/importar/${currentProducer.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const msg = await response.text();
        setUploadMessage({ text: msg, type: 'success' });
        
        // Limpa tudo e recarrega a tabela após 2 segundos
        setTimeout(() => {
          setIsImportModalOpen(false);
          setSelectedFiles([]);
          setUploadMessage({ text: '', type: '' });
          buscarNotas(); // A MÁGICA: A tabela atualiza instantaneamente com as novas notas!
        }, 2500);
      } else {
        setUploadMessage({ text: 'Falha ao processar os ficheiros.', type: 'error' });
      }
    } catch (error) {
      console.error("Erro de upload:", error);
      setUploadMessage({ text: 'Erro de comunicação com o servidor.', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };


  const notasFiltradas = notas.filter(nota => {
    const matchesSearch = nota.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          nota.numero.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'todas' || nota.tipo.toLowerCase() === activeTab;
    let matchesFiscal = true;
    if (filtroFiscalInicial === 'dedutivel') matchesFiscal = nota.isDedutivel === true;
    else if (filtroFiscalInicial === 'nao-dedutivel') matchesFiscal = nota.isDedutivel === false;
    return matchesSearch && matchesTab && matchesFiscal;
  });

  const formatBRL = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
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
        <div className="flex items-center gap-3">
          {/* NOVO BOTÃO DE IMPORTAR XML */}
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl font-medium hover:bg-emerald-100 transition-colors shadow-sm text-sm"
          >
            <UploadCloud size={18} />
            Importar XML
          </button>
          
          <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm text-sm">
            <Download size={18} />
            Exportar
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" placeholder="Buscar por descrição ou número da nota..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-agro-light focus:ring-2 focus:ring-agro-light/20 transition-all text-sm"
          />
        </div>
        
        <div className="relative min-w-[140px] w-full md:w-auto">
          <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select 
            value={activePeriod} onChange={(e) => setActivePeriod(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg outline-none cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors appearance-none"
          >
            <option value="Hoje">Hoje</option>
            <option value="Este Mês">Este Mês</option>
            <option value="Este Ano">Este Ano</option>
            <option value="Tudo">Tudo (Histórico)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200 w-full md:w-auto">
          <button onClick={() => { setActiveTab('todas'); window.history.replaceState({}, document.title) }} className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'todas' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Todas</button>
          <button onClick={() => { setActiveTab('entrada'); window.history.replaceState({}, document.title) }} className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${activeTab === 'entrada' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><TrendingUp size={14} /> Entradas</button>
          <button onClick={() => { setActiveTab('saida'); window.history.replaceState({}, document.title) }} className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${activeTab === 'saida' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><TrendingDown size={14} /> Saídas</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
           <div className="p-10 text-center text-gray-500">Buscando notas fiscais na base de dados...</div>
        ) : notasFiltradas.length === 0 ? (
           <div className="p-10 text-center text-gray-500 flex flex-col items-center gap-3">
             <FileText size={40} className="text-gray-300" />
             <p>Nenhuma nota fiscal encontrada para o período/filtro atual.</p>
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
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"><MoreVertical size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL DE IMPORTAÇÃO DE XML */}
      {/* ========================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <UploadCloud className="text-emerald-600" /> Importar NFP-e (XML)
              </h2>
              <button onClick={() => { setIsImportModalOpen(false); setSelectedFiles([]); setUploadMessage({text:'', type:''}); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {uploadMessage.text && (
                <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border ${uploadMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  {uploadMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                  {uploadMessage.text}
                </div>
              )}

              <p className="text-sm text-gray-500">
                Arraste e solte os ficheiros XML fornecidos pela SEFAZ ou clique para selecionar. Notas já existentes serão ignoradas automaticamente.
              </p>

              {/* ÁREA DE DRAG AND DROP */}
              <label className="border-2 border-dashed border-emerald-200 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-emerald-50/30 hover:bg-emerald-50 transition-colors cursor-pointer group">
                <input 
                  type="file" multiple accept=".xml" className="hidden" 
                  onChange={handleFileSelect} disabled={isUploading}
                />
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText size={28} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-emerald-800">Clique aqui para anexar XMLs</p>
                  <p className="text-xs text-emerald-600/70 mt-1">Pode selecionar múltiplos ficheiros de uma vez</p>
                </div>
              </label>

              {/* LISTA DE FICHEIROS SELECIONADOS */}
              {selectedFiles.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ficheiros Selecionados ({selectedFiles.length})</h4>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-100 p-2.5 rounded-lg">
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={16} className="text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
                        </div>
                        <button onClick={() => removeFile(index)} disabled={isUploading} className="text-gray-400 hover:text-rose-500 p-1">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => { setIsImportModalOpen(false); setSelectedFiles([]); }} disabled={isUploading}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUploadXMLs} disabled={isUploading || selectedFiles.length === 0}
                className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? <><Loader2 size={18} className="animate-spin" /> Processando SEFAZ...</> : 'Iniciar Importação'}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}