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
  Info,
  Plus,
  ListOrdered,
  ArrowRightLeft,
  ScanBarcode,
  Copy,
  ExternalLink,
  CornerDownLeft,
} from "lucide-react";
import { useProducer } from "../context/ProducerContext";
import { NCM_CAPITULOS, NCM_POSICOES } from "../utils/dicionarioNcm";

type ItemNota = {
  id: number;
  descricao: string;
  ncm: string;
  cfop?: string;
  valor: number;
  isDedutivel: boolean;
};

type NotaFiscal = {
  id: number;
  numero: string;
  chaveAcesso?: string;
  naturezaOperacao?: string;
  nomeEmitente?: string;
  nomeDestinatario?: string;
  dataEmissao: string;
  tipo: "ENTRADA" | "SAIDA";
  valorTotal: number;
  empresaEnvolvida: string;
  chaveAcessoReferencia?: string;
  itens: ItemNota[];
  parcelas?: any[];
  conferida?: boolean;
  observacao?: string;
};

// NÁLISE DE CFOP (BASEADO NO SUFIXO)
const getCFOPInfo = (cfopStr?: string) => {
  if (!cfopStr || cfopStr.length < 4)
    return {
      tipo: "Desconhecido",
      descricao: "CFOP inválido ou não informado.",
      cor: "bg-gray-100 text-gray-700 border-gray-200",
    };

  const sufixo = cfopStr.substring(1);

  if (
    [
      "101",
      "102",
      "401",
      "403",
      "405",
      "551",
      "352",
      "353",
      "356",
      "253",
      "255",
      "257",
    ].includes(sufixo)
  ) {
    let desc = "";
    if (["101", "102"].includes(sufixo))
      desc =
        "Venda de produção própria ou de terceiros (sementes, defensivos, adubos, ferramentas).";
    else if (["401", "403", "405"].includes(sufixo))
      desc =
        "Venda de mercadoria com substituição tributária (óleos, autopeças, pneus).";
    else if (["551"].includes(sufixo))
      desc =
        "Venda de bem do ativo imobilizado (compra de maquinário ou implementos).";
    else if (["352", "353", "356"].includes(sufixo))
      desc =
        "Prestações de serviço de transporte (frete pago sobre a compra de insumos).";
    else if (["253", "255", "257"].includes(sufixo))
      desc =
        "Venda de energia elétrica (deve estar vinculada aos medidores da produção).";
    return {
      tipo: "Dedutibilidade Automática",
      descricao: desc,
      cor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    };
  }

  if (
    [
      "901",
      "902",
      "903",
      "904",
      "905",
      "906",
      "907",
      "910",
      "911",
      "912",
      "913",
      "915",
      "916",
      "201",
      "202",
      "210",
      "411",
      "908",
      "909",
    ].includes(sufixo)
  ) {
    let desc = "";
    if (["901", "902", "903"].includes(sufixo))
      desc =
        "Remessas para venda fora do estabelecimento ou vendas já faturadas anteriormente.";
    else if (["904", "905", "906", "907"].includes(sufixo))
      desc =
        "Remessas para depósito fechado, armazém geral ou estocagem (não há compra, apenas guarda).";
    else if (["910", "911", "912", "913"].includes(sufixo))
      desc = "Remessas para demonstração, mostruário ou feiras.";
    else if (["915", "916"].includes(sufixo))
      desc =
        "Remessa para conserto ou manutenção (a peça nova é dedutível pelo X.102, mas a remessa para oficina não é).";
    else if (["201", "202", "210", "411"].includes(sufixo))
      desc =
        "Devoluções de vendas ou compras (não representam despesa operável).";
    else if (["908", "909"].includes(sufixo))
      desc = "Remessa de bens por contrato de comodato.";
    return {
      tipo: "Bloqueio (Não Dedutível)",
      descricao: desc,
      cor: "bg-rose-50 text-rose-800 border-rose-200",
    };
  }

  if (["556", "407", "653", "922", "923"].includes(sufixo)) {
    let desc = "";
    if (["556", "407"].includes(sufixo))
      desc =
        "Venda de material de uso e consumo. No agro, pode ser um item dedutível de manutenção, mas vale uma conferência manual.";
    else if (["653"].includes(sufixo))
      desc =
        "Venda de combustível. ATENÇÃO: Se Diesel para trator = Dedutível. Se Gasolina/Etanol para carro de passeio = Uso Pessoal (Não dedutível).";
    else if (["922", "923"].includes(sufixo))
      desc =
        "Simples faturamento. A despesa só poderá entrar no Livro Caixa quando houver o pagamento efetivo e a entrega física da mercadoria.";
    return {
      tipo: "Alerta (Análise Humana)",
      descricao: desc,
      cor: "bg-amber-50 text-amber-800 border-amber-200",
    };
  }

  return {
    tipo: "Não Mapeado / Outros",
    descricao:
      "Este CFOP não se enquadra nas regras automáticas principais. Verifique a natureza da operação do XML.",
    cor: "bg-gray-50 text-gray-700 border-gray-200",
  };
};

export function NotasFiscais() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const { currentProducer, currentProperty } = useProducer();
  const location = useLocation();

  const [divergentes, setDivergentes] = useState<any[]>([]);
  const [arquivosDivergentesMap, setArquivosDivergentesMap] = useState<
    Map<string, File>
  >(new Map());
  const [selectedDivergentes, setSelectedDivergentes] = useState<Set<string>>(
    new Set(),
  );
  const [showDivergentesModal, setShowDivergentesModal] = useState(false);

  const abaInicial = location.state?.abaInicial || "todas";
  const periodoInicial =
    location.state?.periodoInicial || new Date().getFullYear();
  const dataInicioInicial = location.state?.dataInicio || "";
  const dataFimInicial = location.state?.dataFim || "";
  const dedutibilidadeInicial = location.state?.filtroDedutibilidade || "todos";

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const [isEditingObs, setIsEditingObs] = useState(false);
  const [tempObs, setTempObs] = useState("");

  const [activeTab, setActiveTab] = useState(abaInicial);
  const [activePeriod, setActivePeriod] = useState<string | number>(
    periodoInicial,
  );
  const [filtroDedutibilidade, setFiltroDedutibilidade] = useState<
    "todos" | "dedutivel" | "nao_dedutivel"
  >(dedutibilidadeInicial);
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
    const anoAtivo = typeof activePeriod === "number" ? activePeriod : anoAtual;
    const anos = new Set([anoAtual - 1, anoAtual, anoAtual + 1, anoAtivo]);
    return Array.from(anos).sort((a, b) => a - b);
  }, [activePeriod]);

  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNotas, setIsLoadingNotas] = useState(false);
  const idBuscaRef = useRef(0);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedNotaModal, setSelectedNotaModal] = useState<NotaFiscal | null>(
    null,
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState({ text: "", type: "" });

  const [activeTabModal, setActiveTabModal] = useState<"itens" | "parcelas">(
    "itens",
  );

  const [ncmModalData, setNcmModalData] = useState<{
    ncm: string;
    cap: string;
    pos: string;
    descCap: string;
    descPos: string;
  } | null>(null);

  const [cfopModalData, setCfopModalData] = useState<{
    cfop: string;
    tipo: string;
    descricao: string;
    cor: string;
  } | null>(null);

  // ESTADOS DO NOVO LANÇAMENTO MANUAL (NOTAS/CUPONS)
  const [isManualNotaModalOpen, setIsManualNotaModalOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fornecedores, setFornecedores] = useState<any[]>([]);

  const [manualForm, setManualForm] = useState({
    tipo: "SAIDA",
    dataEmissao: new Date().toISOString().split("T")[0],
    empresaEnvolvida: "",
    cpfCnpj: "",
    numero: "",
    valorTotal: "",
    isDedutivel: true,
  });

  const handleCloseNotaModal = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
    } else {
      setSelectedNotaModal(null);
    }
  };

  const [manualParcelas, setManualParcelas] = useState<any[]>([
    {
      id: Date.now(),
      numeroParcela: "001",
      dataVencimento: new Date().toISOString().split("T")[0],
      valor: "",
    },
  ]);

  const [showParcelasManual, setShowParcelasManual] = useState(false);

  useEffect(() => {
    const fetchFornecedores = async () => {
      const userRole = localStorage.getItem("@AgroPops:userRole");
      if (userRole !== "CONTADOR") return;
      const contadorData = JSON.parse(
        localStorage.getItem("@AgroPops:contador") || "{}",
      );
      if (!contadorData.id) return;
      try {
        const token = localStorage.getItem("@AgroPops:token");
        const res = await fetch(
          `${baseUrl}/fornecedores/listar/${contadorData.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.ok) setFornecedores(await res.json());
      } catch (err) {
        console.error(err);
      }
    };
    fetchFornecedores();
  }, [baseUrl]);

  const fornecedoresFiltrados = useMemo(() => {
    if (!manualForm.empresaEnvolvida) return [];
    return fornecedores.filter(
      (f) =>
        f.nome
          .toLowerCase()
          .includes(manualForm.empresaEnvolvida.toLowerCase()) ||
        (f.cpfCnpj && f.cpfCnpj.includes(manualForm.empresaEnvolvida)),
    );
  }, [fornecedores, manualForm.empresaEnvolvida]);

  const handleAddParcelaManual = () => {
    setManualParcelas([
      ...manualParcelas,
      {
        id: Date.now(),
        numeroParcela: String(manualParcelas.length + 1).padStart(3, "0"),
        dataVencimento: manualForm.dataEmissao,
        valor: "",
      },
    ]);
  };

  const handleRemoveParcelaManual = (id: number) => {
    const novas = manualParcelas.filter((p) => p.id !== id);
    novas.forEach((p, i) => (p.numeroParcela = String(i + 1).padStart(3, "0")));
    setManualParcelas(novas);
  };

  const handleSalvarNotaManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProducer) return;

    const valorTotalNum =
      parseFloat(manualForm.valorTotal.replace(/\./g, "").replace(",", ".")) ||
      0;

    // Se o usuário abriu a aba de parcelas, validam a soma. Se não, ignora.
    if (showParcelasManual) {
      const somaParcelas = manualParcelas.reduce(
        (acc, p) =>
          acc + (parseFloat(p.valor.replace(/\./g, "").replace(",", ".")) || 0),
        0,
      );
      if (Math.abs(somaParcelas - valorTotalNum) > 0.1) {
        alert(
          `A soma das parcelas (${formatBRL(somaParcelas)}) deve ser igual ao valor total (${formatBRL(valorTotalNum)}).`,
        );
        return;
      }
    }

    setIsUploading(true);
    try {
      const token = localStorage.getItem("@AgroPops:token");
      const payload = {
        ...manualForm,
        valorTotal: valorTotalNum,
        propriedadeId: currentProperty ? currentProperty.id : null,
        parcelas: showParcelasManual
          ? manualParcelas.map((p) => ({
              numeroParcela: p.numeroParcela,
              dataVencimento: p.dataVencimento,
              valor:
                parseFloat(p.valor.replace(/\./g, "").replace(",", ".")) || 0,
            }))
          : [],
      };

      const res = await fetch(`${baseUrl}/notas/manual/${currentProducer.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsManualNotaModalOpen(false);
        setManualForm({
          ...manualForm,
          empresaEnvolvida: "",
          cpfCnpj: "",
          numero: "",
          valorTotal: "",
        });
        setManualParcelas([
          {
            id: Date.now(),
            numeroParcela: "001",
            dataVencimento: new Date().toISOString().split("T")[0],
            valor: "",
          },
        ]);
        buscarNotas();
      } else {
        alert(await res.text());
      }
    } catch (err) {
      alert("Erro de conexão ao salvar a nota.");
    } finally {
      setIsUploading(false);
    }
  };

  const obterParametrosDeData = useCallback(
    (periodo: string | number) => {
      const hoje = new Date();
      const formatarDataLocal = (data: Date) => {
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        const dia = String(data.getDate()).padStart(2, "0");
        return `${ano}-${mes}-${dia}`;
      };

      if (typeof periodo === "number")
        return `?inicio=${periodo}-01-01&fim=${periodo}-12-31`;
      if (periodo === "Hoje")
        return `?inicio=${formatarDataLocal(hoje)}&fim=${formatarDataLocal(hoje)}`;
      if (periodo === "Este Mês") {
        const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        return `?inicio=${formatarDataLocal(primeiroDia)}&fim=${formatarDataLocal(ultimoDia)}`;
      }
      if (periodo === "Tudo") return `?inicio=2000-01-01&fim=2099-12-31`;
      if (periodo === "Personalizado" && customStartDate && customEndDate)
        return `?inicio=${customStartDate}&fim=${customEndDate}`;

      return `?inicio=${hoje.getFullYear()}-01-01&fim=${hoje.getFullYear()}-12-31`;
    },
    [customStartDate, customEndDate],
  );

  const chaveCacheNotas = useCallback(
    (produtorId: string, periodo: string | number) =>
      `@AgroPops:notasCache:${produtorId}:${periodo}${customStartDate}${customEndDate}`,
    [customStartDate, customEndDate],
  );

  const buscarNotas = useCallback(async () => {
    if (!currentProducer) return;
    const idDestaBusca = ++idBuscaRef.current;
    try {
      const token = localStorage.getItem("@AgroPops:token");
      const parametros = obterParametrosDeData(activePeriod);
      const response = await fetch(
        `${baseUrl}/notas/listar/${currentProducer.id}${parametros}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const dados = await response.json();
        if (idBuscaRef.current !== idDestaBusca) return;
        setNotas(dados);
        localStorage.setItem(
          chaveCacheNotas(currentProducer.id, activePeriod),
          JSON.stringify(dados),
        );
      } else {
        setNotas([]);
      }
    } catch (error) {
      console.error(error);
      setNotas([]);
    } finally {
      if (idBuscaRef.current === idDestaBusca) setIsLoadingNotas(false);
    }
  }, [
    currentProducer,
    activePeriod,
    customStartDate,
    customEndDate,
    baseUrl,
    obterParametrosDeData,
    chaveCacheNotas,
  ]);

  useEffect(() => {
    if (!currentProducer) {
      setNotas([]);
      return;
    }
    const cacheSalvo = localStorage.getItem(
      chaveCacheNotas(currentProducer.id, activePeriod),
    );
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
  }, [
    currentProducer?.id,
    activePeriod,
    customStartDate,
    customEndDate,
    buscarNotas,
    chaveCacheNotas,
  ]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files)
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleUploadXMLs = async (
    forcarArquivos?: File[] | React.MouseEvent | any,
  ) => {
    // BLINDAGEM: Se forcarArquivos for um Evento de Mouse, ignoramos. Só forçamos se for um Array real!
    const isForcando = Array.isArray(forcarArquivos);
    const arquivosParaEnviar = isForcando ? forcarArquivos : selectedFiles;

    if (arquivosParaEnviar.length === 0 || !currentProducer) return;

    setIsUploading(true);
    setUploadMessage({ text: "Processando notas...", type: "success" });
    const token = localStorage.getItem("@AgroPops:token");

    let totalImportadas = 0;
    let totalIgnoradas = 0;
    let totalFalhas = 0;
    let todasDivergentes: any[] = [];
    let mapaArquivosOriginais = new Map(arquivosDivergentesMap);

    const tamanhoLote = 20;
    for (let i = 0; i < arquivosParaEnviar.length; i += tamanhoLote) {
      const lote = arquivosParaEnviar.slice(i, i + tamanhoLote);
      const formData = new FormData();

      lote.forEach((file) => {
        formData.append("arquivos", file);
        if (!isForcando) mapaArquivosOriginais.set(file.name, file);
      });

      if (currentProperty)
        formData.append("propriedadeFallbackId", currentProperty.id.toString());
      if (isForcando) formData.append("forcar", "true"); // Ativa a flag no Java

      try {
        const response = await fetch(
          `${baseUrl}/notas/importar/${currentProducer.id}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          },
        );

        if (response.ok) {
          const result = await response.json();
          totalImportadas += result.importadas;
          totalIgnoradas += result.ignoradas;
          totalFalhas += result.falhas;
          if (result.divergentes && result.divergentes.length > 0) {
            todasDivergentes.push(...result.divergentes);
          }
        } else {
          totalFalhas += lote.length;
        }
      } catch (error) {
        totalFalhas += lote.length;
      }

      const loteAtual = Math.ceil((i + 1) / tamanhoLote);
      const totalLotes = Math.ceil(arquivosParaEnviar.length / tamanhoLote);
      setUploadMessage({
        text: `Processando lote ${loteAtual} de ${totalLotes}...`,
        type: "success",
      });
    }

    // Processamento concluído
    setArquivosDivergentesMap(mapaArquivosOriginais);

    // Se a importação normal achou divergências, abrimos o modal
    if (todasDivergentes.length > 0 && !isForcando) {
      setDivergentes(todasDivergentes);
      setIsImportModalOpen(false);
      setShowDivergentesModal(true);
      setIsUploading(false);
      return; // Interrompe para o contador decidir
    }

    // Se chegou aqui, é porque forçou ou não houve divergências
    let msgFinal = `Concluído: ${totalImportadas} importadas.`;
    if (totalIgnoradas > 0)
      msgFinal += ` ${totalIgnoradas} ignoradas (já existiam).`;
    if (totalFalhas > 0) msgFinal += ` ${totalFalhas} falhas.`;

    setUploadMessage({
      text: msgFinal,
      type: totalImportadas > 0 ? "success" : "error",
    });

    setTimeout(() => {
      setIsImportModalOpen(false);
      setShowDivergentesModal(false);
      setSelectedFiles([]);
      setDivergentes([]);
      setSelectedDivergentes(new Set());
      setArquivosDivergentesMap(new Map());
      buscarNotas();
    }, 3500);

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

  const abrirNotaVinculada = async (notaId?: number, preserveTab = false) => {
    if (!notaId) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("@AgroPops:token");
      const res = await fetch(`${baseUrl}/notas/buscar/${notaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.parcelas) {
          data.parcelas.sort((a: any, b: any) =>
            String(a.numeroParcela).localeCompare(String(b.numeroParcela)),
          );
        }
        setSelectedNotaModal(data);

        setTempObs(data.observacao || ""); 
        setIsEditingObs(false);

        if (!preserveTab) setActiveTabModal("itens");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemDedutibilidade = (itemId: number) => {
    if (selectedNotaModal) {
      const updatedNota = {
        ...selectedNotaModal,
        itens: selectedNotaModal.itens.map((item) =>
          item.id === itemId
            ? { ...item, isDedutivel: !item.isDedutivel }
            : item,
        ),
      };
      setSelectedNotaModal(updatedNota);
      setHasUnsavedChanges(true);
    }
  };

  // MOTOR DE RATEIO INTELIGENTE
  const recalcularParcelas = (novasParcelas: any[], valorTotal: number) => {
    const qtd = novasParcelas.length;
    if (qtd === 0) return [];

    const valorBase = Number((valorTotal / qtd).toFixed(2));
    let soma = 0;

    return novasParcelas.map((p, index) => {
      let valorFinal = valorBase;
      // A última parcela absorve os centavos de dízima (ex: 100 / 3 = 33.33, 33.33, 33.34)
      if (index === qtd - 1) {
        valorFinal = Number((valorTotal - soma).toFixed(2));
      }
      soma += valorFinal;
      return { ...p, valor: valorFinal };
    });
  };

  const handleAdicionarParcela = () => {
    if (!selectedNotaModal) return;
    const currentParcelas = selectedNotaModal.parcelas || [];
    const novaParcela = {
      id: null,
      numeroParcela: String(currentParcelas.length + 1).padStart(3, "0"),
      dataVencimento: selectedNotaModal.dataEmissao,
      valor: 0,
    };

    const arrayAtualizado = recalcularParcelas(
      [...currentParcelas, novaParcela],
      selectedNotaModal.valorTotal,
    );
    setSelectedNotaModal({ ...selectedNotaModal, parcelas: arrayAtualizado });
    setHasUnsavedChanges(true);
  };

  const handleRemoverParcela = (index: number) => {
    if (!selectedNotaModal || !selectedNotaModal.parcelas) return;
    const novasParcelas = [...selectedNotaModal.parcelas];
    novasParcelas.splice(index, 1);

    novasParcelas.forEach(
      (p, i) => (p.numeroParcela = String(i + 1).padStart(3, "0")),
    );
    const arrayAtualizado = recalcularParcelas(
      novasParcelas,
      selectedNotaModal.valorTotal,
    );

    setSelectedNotaModal({ ...selectedNotaModal, parcelas: arrayAtualizado });
    setHasUnsavedChanges(true);
  };

  const salvarAlteracoesNota = async () => {
    if (
      !selectedNotaModal.parcelas ||
      selectedNotaModal.parcelas.length === 0
    ) {
      alert(
        "Erro: A nota não pode ficar sem parcelas financeiras. Adicione ao menos uma.",
      );
      return;
    }

    const somaParcelas =
      selectedNotaModal.parcelas?.reduce(
        (acc: number, p: any) => acc + Number(p.valor),
        0,
      ) || 0;

    if (selectedNotaModal.parcelas && selectedNotaModal.parcelas.length > 0) {
      if (Math.abs(somaParcelas - selectedNotaModal.valorTotal) > 0.1) {
        const confirmar = window.confirm(
          `Atenção: A soma das parcelas (${formatBRL(somaParcelas)}) difere do total da nota (${formatBRL(selectedNotaModal.valorTotal)}).\n\nNo LCDPR (Regime de Caixa), o valor lançado deve ser exatamente o que foi pago ou recebido.\n\nDeseja confirmar e salvar com esta diferença (ex: devido a descontos ou retenções)?`,
        );
        if (!confirmar) return; // Só interrompe se o usuário clicar em "Cancelar"
      }
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem("@AgroPops:token");

      await fetch(`${baseUrl}/notas/atualizar-itens/${selectedNotaModal.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(selectedNotaModal.itens),
      });

      if (selectedNotaModal.parcelas && selectedNotaModal.parcelas.length > 0) {
        await fetch(
          `${baseUrl}/notas/atualizar-parcelas/${selectedNotaModal.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(selectedNotaModal.parcelas),
          },
        );
      }

      setSelectedNotaModal(null);
      setHasUnsavedChanges(false);
      buscarNotas();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const excluirNota = async (notaId: number) => {
    if (
      !window.confirm(
        "Atenção: Deseja realmente excluir esta nota? A ação é irreversível.",
      )
    )
      return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("@AgroPops:token");
      const response = await fetch(`${baseUrl}/notas/deletar/${notaId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setSelectedNotaModal(null);
        buscarNotas();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // AUDITORIA E RESTAURAÇÃO


  const handleToggleConferida = async (e: React.MouseEvent, id: number, valorAtual: boolean) => {
    e.stopPropagation(); // Evita que a linha seja clicada e abra o modal junto
    try {
      const token = localStorage.getItem("@AgroPops:token");
      await fetch(`${baseUrl}/notas/${id}/conferida`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conferida: !valorAtual }),
      });
      
      // Atualiza o botão instantaneamente se o modal estiver aberto
      if (selectedNotaModal && selectedNotaModal.id === id) {
        setSelectedNotaModal({ ...selectedNotaModal, conferida: !valorAtual });
      }

      // Atualiza a lista silenciosamente
      if (location.pathname.includes("livro-caixa")) buscarLancamentos();
      else buscarNotas();
    } catch (error) {
      console.error(error);
    }
  };

  const handleSalvarObservacao = async () => {
    if (!selectedNotaModal) return;
    try {
      const token = localStorage.getItem("@AgroPops:token");
      await fetch(`${baseUrl}/notas/${selectedNotaModal.id}/observacao`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ observacao: tempObs }), // <-- Usa o texto temporário
      });
      
      setSelectedNotaModal({ ...selectedNotaModal, observacao: tempObs });
      setIsEditingObs(false); // Fecha o modo de edição ao terminar
      
      if (location.pathname.includes("livro-caixa")) buscarLancamentos();
      else buscarNotas();
    } catch (error) {
      console.error(error);
    }
  };

  const handleRestaurarOriginal = async () => {
    if (!selectedNotaModal) return;
    if (
      !window.confirm(
        "ATENÇÃO: Deseja realmente restaurar o XML original?\n\nIsso apagará TODAS as suas edições manuais de CFOP, NCM, Dedutibilidade e Parcelas desta nota, retornando-a ao estado original da SEFAZ.",
      )
    )
      return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem("@AgroPops:token");
      const res = await fetch(
        `${baseUrl}/notas/restaurar/${selectedNotaModal.id}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        alert("Nota restaurada com sucesso!");
        abrirNotaVinculada(selectedNotaModal.id, true); // Recarrega os dados do modal
        if (location.pathname.includes("livro-caixa")) buscarLancamentos();
        else buscarNotas();
      } else {
        alert(await res.text());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmarExclusaoEmMassa = async () => {
    if (!currentProducer) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("@AgroPops:token");
      const parametros = obterParametrosDeData(activePeriod);
      const response = await fetch(
        `${baseUrl}/notas/deletar-todas/${currentProducer.id}${parametros}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
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
    const matchesSearch =
      nota.empresaEnvolvida.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nota.numero.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab =
      activeTab === "todas" || nota.tipo.toLowerCase() === activeTab;
    let matchesDedutibilidade = true;
    if (activeTab === "saida" && filtroDedutibilidade !== "todos") {
      if (filtroDedutibilidade === "dedutivel")
        matchesDedutibilidade = nota.itens.some((item) => item.isDedutivel);
      else if (filtroDedutibilidade === "nao_dedutivel")
        matchesDedutibilidade = nota.itens.some((item) => !item.isDedutivel);
    }
    return matchesSearch && matchesTab && matchesDedutibilidade;
  });

  const formatBRL = (valor: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);

  const formatarData = (dataString: string) => {
    if (!dataString) return "";
    const [ano, mes, dia] = dataString.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const totalDedutivelModal =
    selectedNotaModal?.itens?.reduce(
      (acc: number, item: any) =>
        acc + (item.isDedutivel ? Number(item.valor) : 0),
      0,
    ) || 0;
  const totalNaoDedutivelModal =
    selectedNotaModal?.itens?.reduce(
      (acc: number, item: any) =>
        acc + (!item.isDedutivel ? Number(item.valor) : 0),
      0,
    ) || 0;
  const basePercModal = totalDedutivelModal + totalNaoDedutivelModal;
  const percDedutivelModal =
    basePercModal > 0 ? (totalDedutivelModal / basePercModal) * 100 : 0;
  const percNaoDedutivelModal =
    basePercModal > 0 ? (totalNaoDedutivelModal / basePercModal) * 100 : 0;

  const forcarImportacaoDivergentes = () => {
    if (selectedDivergentes.size === 0) return;
    const arquivosParaForcar = Array.from(selectedDivergentes).map(
      (nome) => arquivosDivergentesMap.get(nome)!,
    );
    handleUploadXMLs(arquivosParaForcar);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notas Fiscais</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activePeriod === "Personalizado"
              ? `Filtrando por período específico.`
              : `Clique sobre a linha da nota para editar.`}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-3">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex-wrap justify-center relative w-full lg:w-auto">
            {botoesAnosRapidos.map((ano) => (
              <button
                key={ano}
                onClick={() => setActivePeriod(ano)}
                className={`px-3 lg:px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${activePeriod === ano ? "bg-agro-secondary text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}
              >
                {ano}
              </button>
            ))}

            <button
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${showYearDropdown ? "bg-gray-100 text-gray-800" : "text-gray-500 hover:bg-gray-100"}`}
            >
              <ChevronDown size={16} />
            </button>

            {showYearDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowYearDropdown(false)}
                />
                <div className="absolute right-auto left-0 md:left-auto md:right-0 top-full mt-2 bg-white border border-gray-100 shadow-xl rounded-xl p-3 z-50 w-72">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
                    Selecione o Ano Base
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {anosDisponiveis.map((ano) => (
                      <button
                        key={ano}
                        onClick={() => {
                          setActivePeriod(ano);
                          setShowYearDropdown(false);
                        }}
                        className={`px-2 py-2 text-xs font-bold rounded-lg transition-colors ${activePeriod === ano ? "bg-agro-secondary text-white" : "text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200"}`}
                      >
                        {ano}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block"></div>

            {["Hoje", "Este Mês", "Tudo"].map((filter) => (
              <button
                key={filter}
                onClick={() => setActivePeriod(filter)}
                className={`px-3 lg:px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${activePeriod === filter ? "bg-agro-secondary text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}
              >
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
              {activePeriod === "Personalizado" && (
                <span className="hidden sm:inline">Personalizado</span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={isLoading || notas.length === 0}
              className="flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-200 px-4 py-2.5 rounded-xl font-medium hover:bg-rose-100 transition-colors shadow-sm text-sm disabled:opacity-50"
            >
              <Trash2 size={18} /> Apagar Seleção
            </button>
            <button
              onClick={() =>
                alert("Módulo de Leitura por Scanner em desenvolvimento!")
              }
              className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-xl font-medium hover:bg-blue-100 transition-colors shadow-sm text-sm"
            >
              <ScanBarcode size={18} /> Escanear
            </button>
            <button
              onClick={() => {
                setShowParcelasManual(false); // Garante que abra fechado
                setIsManualNotaModalOpen(true);
              }}
              className="flex items-center gap-2 bg-agro-secondary hover:bg-agro-primary text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm text-sm"
            >
              <Edit3 size={18} /> Lançar Manual
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl font-medium hover:bg-emerald-100 transition-colors shadow-sm text-sm"
            >
              <UploadCloud size={18} /> Importar XML
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center w-full">
          <div className="flex-1 relative w-full">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar por empresa ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-agro-light text-sm"
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200 w-full md:w-auto">
            <button
              onClick={() => setActiveTab("todas")}
              className={`px-4 py-1.5 text-sm font-bold rounded-lg ${activeTab === "todas" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
            >
              Todas
            </button>
            <button
              onClick={() => setActiveTab("entrada")}
              className={`px-4 py-1.5 text-sm font-bold rounded-lg ${activeTab === "entrada" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500"}`}
            >
              Entradas
            </button>
            <button
              onClick={() => setActiveTab("saida")}
              className={`px-4 py-1.5 text-sm font-bold rounded-lg ${activeTab === "saida" ? "bg-white text-rose-600 shadow-sm" : "text-gray-500"}`}
            >
              Saídas
            </button>
          </div>
        </div>

        {activeTab === "saida" && (
          <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-gray-100">
            <span className="text-sm font-semibold text-gray-500 mr-2 flex items-center gap-1">
              <FileText size={16} /> Filtrar Saídas:
            </span>
            <button
              onClick={() => setFiltroDedutibilidade("todos")}
              className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${filtroDedutibilidade === "todos" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
            >
              Mostrar Todas
            </button>
            <button
              onClick={() => setFiltroDedutibilidade("dedutivel")}
              className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${filtroDedutibilidade === "dedutivel" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
            >
              Lançados no Livro
            </button>
            <button
              onClick={() => setFiltroDedutibilidade("nao_dedutivel")}
              className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${filtroDedutibilidade === "nao_dedutivel" ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
            >
              Não Lançados
            </button>
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
          <div className="p-20 text-center text-gray-500">
            Nenhuma nota encontrada com os filtros atuais.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                <th className="px-6 py-4 font-medium text-center w-24">Auditoria</th>
                <th className="px-6 py-4 font-medium">Empresa Envolvida</th>
                <th className="px-6 py-4 font-medium">Data Emissão</th>
                <th className="px-6 py-4 font-medium">Itens na Nota</th>
                <th className="px-6 py-4 font-medium text-right">
                  Valor Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {notasFiltradas.map((nota) => {
                const isDevolucaoCompleta = nota.valorTotal < 0;
                const valorAbsolutoTotal = Math.abs(nota.valorTotal);
                return (
                  <tr
                    key={nota.id}
                    onClick={() => abrirNotaVinculada(nota.id)}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                  >
                    {/* AUDITORIA */}
                    <td className="px-6 py-4 text-center">
                      
                      <button
                        onClick={(e) => handleToggleConferida(e, nota.id, nota.conferida || false)}
                        className={`flex items-center justify-center w-full gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border uppercase tracking-wider ${
                          nota.conferida
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-emerald-50 hover:text-emerald-600"
                        }`}
                        title={nota.conferida ? "Desmarcar conferência" : "Marcar nota como Conferida"}
                      >
                        <CheckCircle size={14} /> {nota.conferida ? "Conferido" : "Pendente"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${isDevolucaoCompleta ? "bg-sky-100 text-sky-600" : nota.tipo === "ENTRADA" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}
                        >
                          {isDevolucaoCompleta ? (
                            <RotateCcw size={18} />
                          ) : nota.tipo === "ENTRADA" ? (
                            <TrendingUp size={18} />
                          ) : (
                            <TrendingDown size={18} />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {nota.empresaEnvolvida}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-gray-400 font-mono">
                              Nº {nota.numero}
                            </p>
                            {nota.chaveAcessoReferencia && (
                              <span className="bg-sky-50 text-sky-600 border border-sky-100 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider flex items-center gap-1">
                                <RotateCcw size={10} strokeWidth={3} />{" "}
                                CONTRA-NOTA
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {formatarData(nota.dataEmissao)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium bg-gray-100 text-gray-600 px-3 py-1 rounded-full border border-gray-200">
                        {nota.itens.length} produtos
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-bold ${isDevolucaoCompleta ? "text-sky-600" : nota.tipo === "ENTRADA" ? "text-emerald-600" : "text-gray-800"}`}
                      >
                        {isDevolucaoCompleta ? (
                          <span className="flex items-center justify-end gap-1">
                            <RotateCcw size={12} />{" "}
                            {formatBRL(valorAbsolutoTotal)}
                          </span>
                        ) : (
                          formatBRL(nota.valorTotal)
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL: DETALHES DA NOTA (ITENS, PARCELAS E CLASSIFICAÇÃO) */}
      {selectedNotaModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* CABEÇALHO DO MODAL */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50">
              
              {/* Lado Esquerdo: Ícone e Título */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-agro-secondary/10 text-agro-secondary rounded-xl flex items-center justify-center shrink-0 shadow-inner border border-emerald-100">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    Nota Fiscal Nº {selectedNotaModal.numero}
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      onClick={() => {
                        if (selectedNotaModal.chaveAcesso) {
                          navigator.clipboard.writeText(
                            selectedNotaModal.chaveAcesso,
                          );
                        }
                      }}
                      className="text-[11px] font-mono bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-md cursor-pointer hover:bg-gray-100 hover:text-gray-800 transition-colors flex items-center gap-1.5 shadow-sm"
                      title="Clique para copiar a chave"
                    >
                      <Copy size={12} />{" "}
                      {selectedNotaModal.chaveAcesso ||
                        "Lançamento Manual (Sem Chave)"}
                    </span>
                    {selectedNotaModal.chaveAcesso && (
                      <a
                        href="https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ+gAVw2g="
                        target="_blank"
                        rel="noreferrer"
                        className="text-white bg-agro-secondary hover:bg-agro-primary px-2 py-1 rounded-md transition-colors shadow-sm flex items-center gap-1 text-[11px] font-bold"
                        title="Ir para o Portal Nacional (A chave já está na sua área de transferência)"
                      >
                        Portal Nacional <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Lado Direito: Ações (Auditoria e Fechar) */}
              <div className="flex items-center gap-4">
                <button
                  onClick={(e) => handleToggleConferida(e, selectedNotaModal.id, selectedNotaModal.conferida || false)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold transition-all shadow-sm border uppercase tracking-wider ${
                    selectedNotaModal.conferida 
                    ? "bg-emerald-500 text-white border-emerald-600" 
                    : "bg-white text-gray-500 border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                  }`}
                >
                  <CheckCircle size={16} /> 
                  {selectedNotaModal.conferida ? "Nota Auditada" : "Marcar como Conferida"}
                </button>

                <div className="w-px h-6 bg-gray-200" /> {/* Divisor visual */}

                <button
                  onClick={handleCloseNotaModal}
                  className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
                  title="Fechar"
                >
                  <X size={24} />
                </button>
              </div>

            </div>

            {/* BARRA DE INFORMAÇÕES DETALHADAS (FONTE DE VERDADE DO XML) */}
            <div className="px-6 py-4 bg-white border-b border-gray-100 flex flex-col gap-4 text-sm">
              <div className="flex flex-wrap gap-6">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                    Emitente (Origem)
                  </p>
                  <p
                    className="font-semibold text-gray-800 truncate"
                    title={
                      selectedNotaModal.nomeEmitente ||
                      selectedNotaModal.empresaEnvolvida
                    }
                  >
                    {selectedNotaModal.nomeEmitente ||
                      selectedNotaModal.empresaEnvolvida}
                  </p>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                    Destinatário (Destino)
                  </p>
                  <p
                    className="font-semibold text-gray-800 truncate"
                    title={
                      selectedNotaModal.nomeDestinatario ||
                      selectedNotaModal.empresaEnvolvida
                    }
                  >
                    {selectedNotaModal.nomeDestinatario ||
                      selectedNotaModal.empresaEnvolvida}
                  </p>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                    Natureza da Operação
                  </p>
                  <p
                    className="font-semibold text-gray-800 truncate"
                    title={
                      selectedNotaModal.naturezaOperacao || "Não informada"
                    }
                  >
                    {selectedNotaModal.naturezaOperacao || "Não informada"}
                  </p>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                    Data Emissão
                  </p>
                  <p className="font-semibold text-gray-800">
                    {formatarData(selectedNotaModal.dataEmissao)}
                  </p>
                </div>
              </div>
             {/* ================= CAMPO DE OBSERVAÇÃO ================= */}
               <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-2 transition-all">
                 <div className="flex items-center justify-between">
                   <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                     <Edit3 size={14} /> Observações / Apontamentos
                   </label>
                   {!isEditingObs && (
                     <button
                       onClick={() => {
                         setTempObs(selectedNotaModal.observacao || "");
                         setIsEditingObs(true);
                       }}
                       className="text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm"
                     >
                       <Edit3 size={12} /> Editar
                     </button>
                   )}
                 </div>

                 {isEditingObs ? (
                   <div className="flex items-end gap-2 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                     <textarea
                       className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm font-medium text-gray-800 outline-none resize-none placeholder:text-gray-400 focus:border-agro-secondary focus:ring-2 focus:ring-agro-secondary/20 transition-all shadow-inner"
                       rows={2}
                       placeholder="Adicione detalhes, justificativas ou apontamentos internos sobre esta nota..."
                       value={tempObs}
                       onChange={(e) => setTempObs(e.target.value)}
                       autoFocus
                     />
                     <button
                       onClick={handleSalvarObservacao}
                       className="h-11 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-lg flex items-center justify-center transition-colors shadow-sm shrink-0 group"
                       title="Salvar Observação"
                     >
                       <CornerDownLeft size={20} strokeWidth={2.5} className="group-hover:-translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />
                     </button>
                   </div>
                 ) : (
                   <div className="text-sm text-gray-700 mt-1 bg-white p-3 rounded-lg border border-gray-100 shadow-inner min-h-[44px]">
                     {selectedNotaModal.observacao ? (
                       <p className="whitespace-pre-wrap leading-relaxed">{selectedNotaModal.observacao}</p>
                     ) : (
                       <p className="text-gray-400 italic">Nenhuma observação registrada nesta nota.</p>
                     )}
                   </div>
                 )}
               </div>
               {/* ======================================================= */}
  
              {selectedNotaModal.chaveAcessoReferencia && (
                <div className="p-2.5 bg-sky-50 border border-sky-100 rounded-lg flex items-center gap-2 w-fit pr-6">
                  <RotateCcw size={16} className="text-sky-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-sky-800">
                      Nota de Devolução (Contra-Nota)
                    </p>
                    <p className="text-[10px] text-sky-600 font-mono mt-0.5">
                      Referente à Chave:{" "}
                      {selectedNotaModal.chaveAcessoReferencia}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex px-6 bg-gray-50 border-b border-gray-100 pt-2">
              <button
                onClick={() => setActiveTabModal("itens")}
                className={`flex items-center gap-2 pb-3 px-5 text-sm font-bold border-b-2 transition-colors ${
                  activeTabModal === "itens"
                    ? "border-agro-secondary text-agro-secondary bg-white rounded-t-xl shadow-[0_-4px_6px_-4px_rgba(0,0,0,0.05)]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <ListOrdered size={16} /> Produtos e Classificação
              </button>
              <button
                onClick={() => setActiveTabModal("parcelas")}
                className={`flex items-center gap-2 pb-3 px-5 text-sm font-bold border-b-2 transition-colors ${
                  activeTabModal === "parcelas"
                    ? "border-blue-500 text-blue-600 bg-white rounded-t-xl shadow-[0_-4px_6px_-4px_rgba(0,0,0,0.05)]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <CalendarDays size={16} /> Financeiro e Parcelamento
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-white flex-1">
              {activeTabModal === "itens" ? (
                <>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                    Itens NFE ({selectedNotaModal.itens.length})
                  </h3>
                  <div className="border border-gray-100 rounded-xl overflow-visible">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                          <th className="px-4 py-3 font-medium">
                            Produto / Descrição
                          </th>
                          <th className="px-4 py-3 font-medium text-center">
                            CFOP
                          </th>
                          <th className="px-4 py-3 font-medium text-center">
                            NCM
                          </th>
                          <th className="px-4 py-3 font-medium text-center">
                            Livro Caixa
                          </th>
                          <th className="px-4 py-3 font-medium text-right">
                            Valor Unitário
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedNotaModal.itens.map((item: any) => {
                          const isDevolucao =
                            item.descricao?.includes("[DEVOLUÇÃO]");
                          const descricaoLimpa = item.descricao
                            ? item.descricao.replace("[DEVOLUÇÃO]", "").trim()
                            : "Produto sem descrição";

                          const cap = item.ncm
                            ? item.ncm.substring(0, 2)
                            : "00";
                          const pos = item.ncm
                            ? item.ncm.substring(0, 4)
                            : "0000";
                          const descCap =
                            NCM_CAPITULOS[cap] || "Capítulo não mapeado";
                          const descPos =
                            NCM_POSICOES[pos] || "Posição não mapeada";

                          return (
                            <tr key={item.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-800">
                                {isDevolucao ? (
                                  <span className="text-sky-600 font-bold">
                                    <RotateCcw
                                      size={14}
                                      className="inline mr-1"
                                    />
                                    {descricaoLimpa}
                                  </span>
                                ) : (
                                  descricaoLimpa
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {item.cfop ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded shadow-sm">
                                      {item.cfop}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCfopModalData({
                                          cfop: item.cfop,
                                          ...getCFOPInfo(item.cfop),
                                        });
                                      }}
                                      className="text-emerald-500 hover:text-emerald-700 transition-colors p-1"
                                      title="Ver detalhes do CFOP"
                                    >
                                      <Info size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 font-mono text-sm">
                                    -
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 text-sm font-mono text-gray-500">
                                  {item.ncm}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNcmModalData({
                                        ncm: item.ncm,
                                        cap,
                                        pos,
                                        descCap,
                                        descPos,
                                      });
                                    }}
                                    className="text-emerald-500 hover:text-emerald-700 transition-colors p-1"
                                    title="Ver detalhes do NCM"
                                  >
                                    <Info size={14} />
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() =>
                                    toggleItemDedutibilidade(item.id)
                                  }
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${item.isDedutivel ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"}`}
                                >
                                  <Edit3 size={12} />{" "}
                                  {item.isDedutivel
                                    ? "Lançar no Livro"
                                    : "Não Lançar no Livro"}
                                </button>
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-gray-700 text-right font-mono">
                                {isDevolucao ? (
                                  <span className="text-sky-600">
                                    - {formatBRL(Math.abs(item.valor))}
                                  </span>
                                ) : (
                                  formatBRL(item.valor)
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                        Agenda de Pagamentos
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        O Livro Caixa será montado com base nestas datas e
                        valores.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRestaurarOriginal}
                        className="flex items-center gap-2 bg-gray-100 text-gray-600 border border-gray-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 px-3 py-2 rounded-xl text-sm font-bold transition-colors"
                        title="Apagar edições e restaurar o XML que veio da Sefaz"
                      >
                        <RotateCcw size={16} /> Restaurar Original do XML
                      </button>
                      <button
                        onClick={handleAdicionarParcela}
                        className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                      >
                        <Plus size={16} /> Adicionar Parcela Manual
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                          <th className="px-4 py-3 font-medium">Nº Parcela</th>
                          <th className="px-4 py-3 font-medium">
                            Data de Vencimento / Pagto
                          </th>
                          <th className="px-4 py-3 font-medium text-right">
                            Valor da Parcela
                          </th>
                          <th className="px-4 py-3 font-medium text-center">
                            Ação
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {!selectedNotaModal.parcelas ||
                        selectedNotaModal.parcelas.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="p-8 text-center text-gray-400 text-sm"
                            >
                              Nenhuma parcela localizada. Adicione manualmente
                              se houver.
                            </td>
                          </tr>
                        ) : (
                          selectedNotaModal.parcelas.map(
                            (parcela: any, index: number) => (
                              <tr
                                key={parcela.id || index}
                                className="hover:bg-blue-50/20 transition-colors"
                              >
                                <td className="px-4 py-3 text-sm font-bold text-gray-700 font-mono">
                                  <input
                                    type="text"
                                    value={parcela.numeroParcela}
                                    onChange={(e) => {
                                      const newVal = e.target.value;
                                      setSelectedNotaModal((prev: any) => {
                                        const p = [...prev.parcelas];
                                        p[index].numeroParcela = newVal;
                                        return { ...prev, parcelas: p };
                                      });
                                    }}
                                    className="w-16 px-2 py-1 border border-gray-200 rounded text-center outline-none focus:border-blue-400"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="date"
                                    value={parcela.dataVencimento}
                                    onChange={(e) => {
                                      const newVal = e.target.value;
                                      setSelectedNotaModal((prev: any) => {
                                        const p = [...prev.parcelas];
                                        p[index].dataVencimento = newVal;
                                        return { ...prev, parcelas: p };
                                      });
                                    }}
                                    className="px-3 py-1.5 border border-gray-300 rounded-lg outline-none text-sm font-bold focus:border-blue-400 text-blue-800 bg-blue-50/50 transition-colors"
                                  />
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <input
                                    type="text"
                                    value={Number(
                                      parcela.valor || 0,
                                    ).toLocaleString("pt-BR", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                    onChange={(e) => {
                                      const raw = e.target.value.replace(
                                        /\D/g,
                                        "",
                                      );
                                      const newVal = parseFloat(raw) / 100 || 0;
                                      setSelectedNotaModal((prev: any) => {
                                        const p = [...prev.parcelas];
                                        p[index].valor = newVal;
                                        return { ...prev, parcelas: p };
                                      });
                                    }}
                                    className="w-36 px-3 py-1.5 border border-gray-300 rounded-lg outline-none text-sm font-mono font-bold text-gray-800 text-right focus:border-blue-400 bg-white shadow-sm"
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => handleRemoverParcela(index)}
                                    className="text-gray-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ),
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {selectedNotaModal.parcelas &&
                    selectedNotaModal.parcelas.length > 0 && (
                      <div
                        className={`mt-4 p-4 rounded-xl border ${Math.abs(selectedNotaModal.parcelas.reduce((a: any, p: any) => a + Number(p.valor), 0) - selectedNotaModal.valorTotal) > 0.1 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"} flex justify-between items-center`}
                      >
                        <p className="text-sm text-gray-600">
                          Soma das Parcelas:
                        </p>
                        <p
                          className={`text-xl font-black font-mono ${Math.abs(selectedNotaModal.parcelas.reduce((a: any, p: any) => a + Number(p.valor), 0) - selectedNotaModal.valorTotal) > 0.1 ? "text-amber-600" : "text-emerald-600"}`}
                        >
                          {formatBRL(
                            selectedNotaModal.parcelas.reduce(
                              (a: any, p: any) => a + Number(p.valor),
                              0,
                            ),
                          )}
                        </p>
                      </div>
                    )}
                </>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex gap-3 w-full md:w-auto">
                <button
                  onClick={salvarAlteracoesNota}
                  disabled={isLoading}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-agro-secondary hover:bg-agro-primary text-white font-bold rounded-xl shadow-sm transition-all text-sm"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  Salvar Toda a Nota
                </button>
                <button
                  onClick={() => excluirNota(selectedNotaModal.id)}
                  disabled={isLoading}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-xl shadow-sm transition-all text-sm"
                >
                  <Trash2 size={18} /> Excluir
                </button>
              </div>
              <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                <div className="hidden sm:block border-r border-gray-200 pr-6 text-right">
                  <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">
                    Detalhamento (LCDPR)
                  </p>
                  <div className="flex items-center gap-2 justify-end mb-1">
                    <span
                      className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold"
                      title="Peso Dedutível"
                    >
                      {percDedutivelModal.toFixed(1)}%
                    </span>
                    <span
                      className="text-sm font-bold text-emerald-600 font-mono"
                      title="Total Lançado no Livro"
                    >
                      {formatBRL(totalDedutivelModal)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span
                      className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold"
                      title="Peso Não Dedutível"
                    >
                      {percNaoDedutivelModal.toFixed(1)}%
                    </span>
                    <span
                      className="text-xs font-bold text-rose-500 font-mono"
                      title="Uso Pessoal (Não Lançado)"
                    >
                      {formatBRL(totalNaoDedutivelModal)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Valor Total da Nota</p>
                  <p className="text-2xl font-bold text-gray-800 font-mono">
                    {formatBRL(selectedNotaModal.valorTotal)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: LANÇAMENTO MANUAL (NOTAS E CUPONS) */}
      {/* ============================================================== */}
      {isManualNotaModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Edit3 className="text-agro-secondary" /> Novo Documento Fiscal
                Manual
              </h2>
              <button
                onClick={() => setIsManualNotaModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-lg text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSalvarNotaManual}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
              {/* Box Informativo de Destino */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-start gap-3 shadow-sm">
                <div className="text-slate-400 mt-0.5">
                  <Info size={18} />
                </div>
                <div>
                  <p className="text-sm text-slate-700 font-bold">
                    Destino do Lançamento:
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Produtor: <b>{currentProducer?.name}</b> <br />
                    Imóvel:{" "}
                    <b>
                      {currentProperty
                        ? currentProperty.nome
                        : "Propriedade Padrão (Consolidado)"}
                    </b>
                  </p>
                </div>
              </div>

              {/* Tipo de Operação */}
              <div className="flex items-center justify-between gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 shadow-inner max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={() =>
                    setManualForm({ ...manualForm, tipo: "SAIDA" })
                  }
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${manualForm.tipo === "SAIDA" ? "bg-rose-600 text-white shadow-md scale-[1.02]" : "bg-rose-100 text-rose-500 hover:bg-rose-200"}`}
                >
                  DESPESA (Compra)
                </button>
                <div className="text-gray-300 shrink-0 px-1">
                  <ArrowRightLeft size={16} />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setManualForm({ ...manualForm, tipo: "ENTRADA" })
                  }
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${manualForm.tipo === "ENTRADA" ? "bg-emerald-600 text-white shadow-md scale-[1.02]" : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"}`}
                >
                  RECEITA (Venda)
                </button>
              </div>

              {/* Dados da Nota */}
              <div className="bg-white border border-gray-100 p-5 rounded-xl space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Dados do Documento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 relative">
                    <label className="text-xs font-bold text-gray-600 uppercase">
                      Fornecedor / Cliente (Pesquise)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Cooperativa Agro"
                      value={manualForm.empresaEnvolvida}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() =>
                        setTimeout(() => setShowSuggestions(false), 200)
                      }
                      onChange={(e) => {
                        setManualForm({
                          ...manualForm,
                          empresaEnvolvida: e.target.value,
                        });
                        setShowSuggestions(true);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm focus:border-agro-secondary"
                    />
                    {showSuggestions && fornecedoresFiltrados.length > 0 && (
                      <ul className="absolute z-50 left-0 right-0 top-[60px] bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-gray-100">
                        {fornecedoresFiltrados.map((f) => (
                          <li
                            key={f.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setManualForm({
                                ...manualForm,
                                empresaEnvolvida: f.nome,
                                cpfCnpj: f.cpfCnpj || "",
                              });
                              setShowSuggestions(false);
                            }}
                            className="px-4 py-2.5 hover:bg-emerald-50 cursor-pointer flex justify-between items-center transition-colors"
                          >
                            <span className="text-sm font-bold text-gray-800">
                              {f.nome}
                            </span>
                            {f.cpfCnpj && (
                              <span className="text-xs font-mono text-gray-400">
                                {f.cpfCnpj}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">
                      CPF / CNPJ (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Apenas números"
                      value={manualForm.cpfCnpj}
                      onChange={(e) =>
                        setManualForm({
                          ...manualForm,
                          cpfCnpj: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm font-mono focus:border-agro-secondary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">
                      Nº Documento / Cupom
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 12345"
                      value={manualForm.numero}
                      onChange={(e) =>
                        setManualForm({ ...manualForm, numero: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm focus:border-agro-secondary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">
                      Data de Emissão
                    </label>
                    <input
                      type="date"
                      required
                      value={manualForm.dataEmissao}
                      onChange={(e) =>
                        setManualForm({
                          ...manualForm,
                          dataEmissao: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm focus:border-agro-secondary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end pt-2 border-t border-gray-100">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">
                      Valor Total (R$)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="0,00"
                      value={manualForm.valorTotal}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9,.-]/g, "");
                        setManualForm({ ...manualForm, valorTotal: val });
                        if (manualParcelas.length === 1)
                          setManualParcelas([
                            { ...manualParcelas[0], valor: val },
                          ]);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-lg font-mono font-bold focus:border-agro-secondary text-right text-gray-800"
                    />
                  </div>
                  {manualForm.tipo === "SAIDA" && (
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-gray-50 p-3 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={manualForm.isDedutivel}
                        onChange={(e) =>
                          setManualForm({
                            ...manualForm,
                            isDedutivel: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-agro-secondary focus:ring-agro-secondary h-5 w-5"
                      />
                      <div className="text-sm">
                        <p className="font-bold text-gray-700">
                          Dedutível no Livro Caixa?
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Marque se esta despesa abate imposto no LCDPR
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Botão de Toggle do Parcelamento */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowParcelasManual(!showParcelasManual)}
                  className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-4 py-2 rounded-full border border-blue-100"
                >
                  <CalendarDays size={16} />
                  {showParcelasManual
                    ? "Ocultar Parcelamento"
                    : "Adicionar Parcelamento (Opcional)"}
                </button>
              </div>

              {/* Parcelamento Condicional */}
              {showParcelasManual && (
                <div className="bg-blue-50/30 border border-blue-100 p-5 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider">
                        Vencimentos e Parcelas
                      </h3>
                      <p className="text-xs text-blue-600/80">
                        Apenas altere aqui se o pagamento for parcelado ou
                        futuro.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddParcelaManual}
                      className="flex items-center gap-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    >
                      <Plus size={14} /> Adicionar Parcela
                    </button>
                  </div>

                  <div className="space-y-2">
                    {manualParcelas.map((p, index) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 bg-white p-2 rounded-lg border border-blue-100 shadow-sm"
                      >
                        <div className="w-16">
                          <input
                            type="text"
                            value={p.numeroParcela}
                            onChange={(e) => {
                              const novas = [...manualParcelas];
                              novas[index].numeroParcela = e.target.value;
                              setManualParcelas(novas);
                            }}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-center text-xs font-mono outline-none focus:border-blue-400"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="date"
                            value={p.dataVencimento}
                            onChange={(e) => {
                              const novas = [...manualParcelas];
                              novas[index].dataVencimento = e.target.value;
                              setManualParcelas(novas);
                            }}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm outline-none focus:border-blue-400 font-medium text-blue-800"
                          />
                        </div>
                        <div className="flex-1 relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">
                            R$
                          </span>
                          <input
                            type="text"
                            value={p.valor}
                            placeholder="0,00"
                            onChange={(e) => {
                              const novas = [...manualParcelas];
                              novas[index].valor = e.target.value.replace(
                                /[^0-9,.-]/g,
                                "",
                              );
                              setManualParcelas(novas);
                            }}
                            className="w-full pl-7 pr-2 py-1.5 border border-gray-200 rounded text-sm outline-none focus:border-blue-400 font-mono font-bold text-right"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveParcelaManual(p.id)}
                          disabled={manualParcelas.length === 1}
                          className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors disabled:opacity-30"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {manualForm.valorTotal && (
                    <div
                      className={`mt-2 text-right text-xs font-bold ${Math.abs(manualParcelas.reduce((acc, p) => acc + (parseFloat(p.valor.replace(/\./g, "").replace(",", ".")) || 0), 0) - (parseFloat(manualForm.valorTotal.replace(/\./g, "").replace(",", ".")) || 0)) > 0.1 ? "text-amber-600" : "text-emerald-600"}`}
                    >
                      Soma das Parcelas: R${" "}
                      {manualParcelas
                        .reduce(
                          (acc, p) =>
                            acc +
                            (parseFloat(
                              p.valor.replace(/\./g, "").replace(",", "."),
                            ) || 0),
                          0,
                        )
                        .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              )}
            </form>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsManualNotaModalOpen(false)}
                disabled={isUploading}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarNotaManual}
                disabled={isUploading}
                className="px-6 py-2.5 text-sm font-bold text-white bg-agro-secondary hover:bg-agro-primary rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Salvando...
                  </>
                ) : (
                  "Lançar Documento Fiscal"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: APAGAR NOTAS SELECIONADAS */}
      {/* ============================================================== */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-rose-600 flex items-center gap-2">
                <Trash2 /> Apagar Notas Selecionadas
              </h2>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Atenção: Você está prestes a excluir **todas as notas** do
                período selecionado atualmente: <strong>{activePeriod}</strong>.
              </p>
              <div className="bg-rose-50 p-3 rounded-lg border border-rose-100 text-xs text-rose-700 font-medium">
                ⚠️ Aviso: A exclusão abrange todas as notas importadas dentro do
                período selecionado. Esta ação não pode ser desfeita.
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isLoading}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusaoEmMassa}
                disabled={isLoading}
                className="px-5 py-2.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-xl flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Apagando...
                  </>
                ) : (
                  "Confirmar Exclusão"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTAÇÃO (XML) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <UploadCloud className="text-emerald-600" /> Importar XML
              </h2>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setSelectedFiles([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 mx-6 mt-6 rounded-xl flex items-start gap-3 shadow-sm">
              <div className="text-slate-400 mt-0.5">
                <Info size={18} />
              </div>
              <div>
                <p className="text-sm text-slate-700 font-bold">
                  Destino Automático / Manual:
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  O sistema tentará ler a <b>Inscrição Estadual</b> do XML. Se
                  não encontrar, a nota será salva em: <br />
                  <span className="font-bold text-agro-secondary">
                    {currentProperty
                      ? currentProperty.nome
                      : "Propriedade Padrão (Consolidado)"}
                  </span>
                  .
                </p>
              </div>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {uploadMessage.text && (
                <div
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border ${uploadMessage.type === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}
                >
                  {uploadMessage.type === "error" ? (
                    <AlertCircle size={18} />
                  ) : (
                    <CheckCircle size={18} />
                  )}{" "}
                  {uploadMessage.text}
                </div>
              )}
              <label className="border-2 border-dashed border-emerald-200 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-emerald-50/30 hover:bg-emerald-50 transition-colors cursor-pointer group">
                <input
                  type="file"
                  multiple
                  accept=".xml"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText size={28} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-emerald-800">
                    Clique para anexar XMLs
                  </p>
                </div>
              </label>
              {selectedFiles.length > 0 && (
                <div className="mt-4 max-h-40 overflow-y-auto space-y-2 pr-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 border border-gray-100 p-2.5 rounded-lg"
                    >
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {file.name}
                      </span>
                      <button
                        onClick={() =>
                          setSelectedFiles((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                        disabled={isUploading}
                        className="text-gray-400 hover:text-rose-500 p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setSelectedFiles([]);
                }}
                disabled={isUploading}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleUploadXMLs}
                disabled={isUploading || selectedFiles.length === 0}
                className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />{" "}
                    Processando...
                  </>
                ) : (
                  "Iniciar Importação"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RESOLUÇÃO DE DIVERGÊNCIAS */}
      {showDivergentesModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 bg-amber-50">
              <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                <AlertCircle size={24} /> Atenção: Notas com Divergência de
                Titularidade
              </h2>
              <p className="text-sm text-amber-700 mt-2">
                Encontramos <b>{divergentes.length}</b> nota(s) onde o CPF/CNPJ
                do emitente ou destinatário não bate com o produtor atual nem
                com as propriedades vinculadas a ele. Selecione abaixo quais
                notas você quer forçar a entrada mesmo assim.
              </p>
            </div>

            <div className="p-0 overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 sticky top-0 shadow-sm">
                    <th className="px-4 py-3 w-10 text-center">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked)
                            setSelectedDivergentes(
                              new Set(divergentes.map((d) => d.nomeArquivo)),
                            );
                          else setSelectedDivergentes(new Set());
                        }}
                        className="rounded text-agro-secondary"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Nome do Arquivo</th>
                    <th className="px-4 py-3 font-medium">Emitente</th>
                    <th className="px-4 py-3 font-medium">Destinatário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {divergentes.map((div, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedDivergentes.has(div.nomeArquivo)}
                          onChange={(e) => {
                            const next = new Set(selectedDivergentes);
                            if (e.target.checked) next.add(div.nomeArquivo);
                            else next.delete(div.nomeArquivo);
                            setSelectedDivergentes(next);
                          }}
                          className="rounded text-agro-secondary"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {div.nomeArquivo}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {div.emitente}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {div.destinatario}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowDivergentesModal(false);
                  setDivergentes([]);
                  setSelectedFiles([]);
                  buscarNotas(); // Fecha e ignora todas
                }}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={forcarImportacaoDivergentes}
                disabled={selectedDivergentes.size === 0 || isUploading}
                className="px-6 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Importar as Selecionadas (" + selectedDivergentes.size + ")"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: DATA PERSONALIZADA */}
      {/* ============================================================== */}
      {showCustomDateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <CalendarDays size={18} className="text-agro-secondary" />{" "}
                Período Específico
              </h2>
              <button
                onClick={() => setShowCustomDateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">
                  Data de Início
                </label>
                <input
                  type="date"
                  value={tempStartDate}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-agro-secondary"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">
                  Data Final
                </label>
                <input
                  type="date"
                  value={tempEndDate}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-agro-secondary"
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowCustomDateModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={aplicarFiltroPersonalizado}
                className="px-5 py-2.5 text-sm font-bold text-white bg-agro-secondary hover:bg-agro-primary rounded-xl shadow-sm transition-colors"
              >
                Aplicar Filtro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MINI-MODAL: DETALHAMENTO DO NCM */}
      {/* ============================================================== */}
      {ncmModalData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Info size={18} className="text-emerald-600" /> Detalhamento do
                NCM
              </h2>
              <button
                onClick={() => setNcmModalData(null)}
                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 text-emerald-800 font-mono font-bold px-3 py-2 rounded-lg text-center text-lg border border-emerald-100 shadow-sm">
                {ncmModalData.ncm}
              </div>

              <div className="space-y-1.5">
                <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">
                  Capítulo {ncmModalData.cap}
                </p>
                <p className="font-semibold text-gray-800 text-sm leading-relaxed">
                  {ncmModalData.descCap}
                </p>
              </div>

              <div className="w-full h-px bg-gray-100" />

              <div className="space-y-1.5">
                <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">
                  Posição {ncmModalData.pos}
                </p>
                <p className="font-semibold text-gray-800 text-sm leading-relaxed">
                  {ncmModalData.descPos}
                </p>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setNcmModalData(null)}
                className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MINI-MODAL: DETALHAMENTO DO CFOP */}
      {/* ============================================================== */}
      {cfopModalData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Info size={18} className="text-blue-600" /> Regra do CFOP
              </h2>
              <button
                onClick={() => setCfopModalData(null)}
                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div
                className={`font-mono font-bold px-3 py-2 rounded-lg text-center text-lg border shadow-sm ${cfopModalData.cor}`}
              >
                {cfopModalData.cfop}
              </div>

              <div className="space-y-1.5 text-center">
                <span
                  className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfopModalData.cor}`}
                >
                  {cfopModalData.tipo}
                </span>
              </div>

              <div className="w-full h-px bg-gray-100" />

              <div className="space-y-1.5">
                <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">
                  Análise da Operação
                </p>
                <p className="font-semibold text-gray-800 text-sm leading-relaxed">
                  {cfopModalData.descricao}
                </p>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setCfopModalData(null)}
                className="px-6 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-sm transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE ALTERAÇÕES NÃO SALVAS */}
      {showUnsavedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Atenção!</h2>
              <p className="text-sm text-gray-600">
                Você fez alterações na classificação ou nas parcelas desta nota
                e não salvou. Deseja descartar essas alterações?
              </p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowUnsavedModal(false);
                  salvarAlteracoesNota(); // Salva e fecha
                }}
                className="w-full py-2.5 bg-agro-secondary hover:bg-agro-primary text-white font-bold rounded-xl transition-colors"
              >
                Salvar Alterações
              </button>
              <button
                onClick={() => {
                  setShowUnsavedModal(false);
                  setHasUnsavedChanges(false);
                  setSelectedNotaModal(null); // Descarta e fecha a nota
                }}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition-colors"
              >
                Descartar e Sair
              </button>
              <button
                onClick={() => setShowUnsavedModal(false)}
                className="w-full py-2 text-gray-500 hover:bg-gray-200 font-medium rounded-xl transition-colors"
              >
                Cancelar (Voltar à Edição)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
