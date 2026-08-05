import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Plus,
  FileSpreadsheet,
  Loader2,
  X,
  AlertCircle,
  CheckCircle,
  Trash2,
  RotateCcw,
  Calendar,
  Info,
  FileText,
  Edit3,
  Save,
  ArrowRightLeft,
  ListOrdered,
  CalendarDays,
  HelpCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { useProducer } from "../context/ProducerContext";
import { NCM_CAPITULOS, NCM_POSICOES } from "../utils/dicionarioNcm";

type Lancamento = {
  id: string;
  data: string;
  documento: string;
  historico: string;
  origem: "NFE" | "AVULSO" | "SISTEMA";
  tipo: "ENTRADA" | "SAIDA";
  valor: number;
  isDedutivel: boolean;
  notaId?: number;
  percDedutivel: number;
  valorDedutivel: number;
};

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const TIPOS_DOCUMENTO = [
  { id: "1", label: "1 - Nota Fiscal" },
  { id: "2", label: "2 - Fatura" },
  { id: "3", label: "3 - Recibo" },
  { id: "4", label: "4 - Contrato" },
  { id: "5", label: "5 - Folha de Pagamento" },
  { id: "6", label: "6 - Outros (Taxas/Guias)" },
];

// ==========================================
// MOTOR DE ANÁLISE DE CFOP (BASEADO NO SUFIXO)
// ==========================================
const getCFOPInfo = (cfopStr?: string) => {
  if (!cfopStr || cfopStr.length < 4)
    return {
      tipo: "Desconhecido",
      descricao: "CFOP inválido ou não informado.",
      cor: "bg-gray-100 text-gray-700 border-gray-200",
    };

  // Ignora o primeiro dígito (5 ou 6) e pega os últimos 3
  const sufixo = cfopStr.substring(1);

  // GRUPO 1: Dedutibilidade Automática 🟢
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

  // GRUPO 2: Bloqueio Automático (Não Dedutíveis) 🔴
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
      desc = "Remessas para demonstração, doação, brinde mostruário ou feiras.";
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

  // GRUPO 3: Alerta para Análise Humana 🟡
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

export function LivroCaixa() {
  const { currentProducer, currentProperty } = useProducer();
  const baseUrl = import.meta.env.VITE_API_URL;

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showInfoEstorno, setShowInfoEstorno] = useState(false);

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split("T")[0],
    tipo: "SAIDA",
    historico: "",
    valor: "",
    isDedutivel: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ text: "", type: "" });

  const [selectedNotaModal, setSelectedNotaModal] = useState<any | null>(null);
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

  // NOVO ESTADO: Modal do CFOP
  const [cfopModalData, setCfopModalData] = useState<{
    cfop: string;
    tipo: string;
    descricao: string;
    cor: string;
  } | null>(null);

  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  const anosDisponiveis = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    return Array.from({ length: 15 }, (_, i) => anoAtual - 5 + i);
  }, []);

  const botoesAnosRapidos = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    const anos = new Set([anoAtual - 1, anoAtual, anoAtual + 1, selectedYear]);
    return Array.from(anos).sort((a, b) => a - b);
  }, [selectedYear]);

  const formatBRL = (valor: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [ano, mes, dia] = dateStr.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const toggleMonth = (monthIndex: number) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthIndex)) next.delete(monthIndex);
      else next.add(monthIndex);
      return next;
    });
  };

  const buscarLancamentos = useCallback(async () => {
    if (!currentProducer) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("@AgroPops:token");
      const response = await fetch(
        `${baseUrl}/livro-caixa/${currentProducer.id}?ano=${selectedYear}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        setLancamentos(await response.json());
      } else {
        setLancamentos([]);
      }
    } catch (error) {
      console.error(error);
      setLancamentos([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentProducer, selectedYear, baseUrl]);

  useEffect(() => {
    buscarLancamentos();
  }, [buscarLancamentos]);

  const dadosPorMes = useMemo(() => {
    const agrupado = MESES.map(() => ({
      lancamentos: [] as Lancamento[],
      totalEntradas: 0,
      totalDedutivel: 0,
      saldoMes: 0,
      saldoAcumulado: 0,
    }));

    const multiplicador = currentProperty
      ? currentProperty.percentualParticipacao / 100
      : 1;

    lancamentos.forEach((lanc) => {
      const ano = parseInt(lanc.data.split("-")[0]);
      const mes = parseInt(lanc.data.split("-")[1]) - 1;

      if (ano === selectedYear) {
        // Multiplicador da fazenda age sobre tudo!
        const valorRateado = lanc.valor * multiplicador;
        const dedutivelRateado = lanc.valorDedutivel * multiplicador;

        agrupado[mes].lancamentos.push({
          ...lanc,
          valor: valorRateado,
          valorDedutivel: dedutivelRateado,
        });

        if (lanc.tipo === "ENTRADA") {
          agrupado[mes].totalEntradas += valorRateado;
        } else {
          agrupado[mes].totalDedutivel += dedutivelRateado;
        }
      }
    });

    // Calcula Saldo do Mês e Saldo Acumulado Sequencial
    let acumulado = 0;
    for (let i = 0; i < 12; i++) {
      agrupado[i].saldoMes =
        agrupado[i].totalEntradas - agrupado[i].totalDedutivel;
      acumulado += agrupado[i].saldoMes;
      agrupado[i].saldoAcumulado = acumulado;
    }

    return agrupado;
  }, [lancamentos, selectedYear, currentProperty]);

  // Totalizador Anual
  const totaisAno = useMemo(() => {
    return dadosPorMes.reduce(
      (acc, mes) => {
        acc.entradas += mes.totalEntradas;
        acc.dedutiveis += mes.totalDedutivel;
        return acc;
      },
      { entradas: 0, dedutiveis: 0 },
    );
  }, [dadosPorMes]);
  const saldoAnual = totaisAno.entradas - totaisAno.dedutiveis;

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
        itens: selectedNotaModal.itens.map((item: any) =>
          item.id === itemId
            ? { ...item, isDedutivel: !item.isDedutivel }
            : item,
        ),
      };
      setSelectedNotaModal(updatedNota);
    }
  };

  const handleAdicionarParcela = () => {
    if (!selectedNotaModal) return;
    const novaParcela = {
      id: null,
      numeroParcela: String(
        (selectedNotaModal.parcelas?.length || 0) + 1,
      ).padStart(3, "0"),
      dataVencimento: selectedNotaModal.dataEmissao,
      valor: 0,
    };
    setSelectedNotaModal({
      ...selectedNotaModal,
      parcelas: [...(selectedNotaModal.parcelas || []), novaParcela],
    });
  };

  const handleRemoverParcela = (index: number) => {
    if (!selectedNotaModal || !selectedNotaModal.parcelas) return;
    const novasParcelas = [...selectedNotaModal.parcelas];
    novasParcelas.splice(index, 1);
    novasParcelas.forEach(
      (p, i) => (p.numeroParcela = String(i + 1).padStart(3, "0")),
    );
    setSelectedNotaModal({ ...selectedNotaModal, parcelas: novasParcelas });
  };

  const salvarAlteracoesNota = async () => {
    if (!selectedNotaModal) return;

    const somaParcelas =
      selectedNotaModal.parcelas?.reduce(
        (acc: number, p: any) => acc + Number(p.valor),
        0,
      ) || 0;

    if (selectedNotaModal.parcelas && selectedNotaModal.parcelas.length > 0) {
      if (Math.abs(somaParcelas - selectedNotaModal.valorTotal) > 0.1) {
        alert(
          `Atenção: A soma das parcelas (${formatBRL(somaParcelas)}) não confere com o total da nota (${formatBRL(selectedNotaModal.valorTotal)}). Ajuste os valores antes de salvar.`,
        );
        return;
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
      buscarLancamentos();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSalvarAvulso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProducer) return;
    if (!formData.historico || !formData.valor) {
      setFeedback({
        text: "Por favor, preencha o Histórico e o Valor.",
        type: "error",
      });
      return;
    }

    setIsSaving(true);
    setFeedback({ text: "", type: "" });

    try {
      const token = localStorage.getItem("@AgroPops:token");
      const response = await fetch(
        `${baseUrl}/livro-caixa/${currentProducer.id}/avulso`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...formData,
            valor: parseFloat(
              formData.valor.replace(/\./g, "").replace(",", "."),
            ),
            propriedadeId: currentProperty ? currentProperty.id : null,
          }),
        },
      );

      if (response.ok) {
        setFeedback({
          text: "Lançamento registrado com sucesso!",
          type: "success",
        });
        setTimeout(() => {
          setIsModalOpen(false);
          setFormData({
            data: new Date().toISOString().split("T")[0],
            tipo: "SAIDA",
            tipoDocumento: "3",
            documento: "",
            nomeParticipante: "",
            cpfCnpjParticipante: "",
            historico: "",
            valor: "",
            isDedutivel: true,
          });
          setShowInfoEstorno(false);
          setFeedback({ text: "", type: "" });
          buscarLancamentos();
        }, 1500);
      } else {
        const txt = await response.text();
        setFeedback({
          text: txt || "Erro ao salvar lançamento.",
          type: "error",
        });
      }
    } catch (error) {
      setFeedback({
        text: "Erro de comunicação com o servidor.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const fornecedoresFiltrados = useMemo(() => {
    if (!formData.nomeParticipante) return [];
    return fornecedores.filter(
      (f) =>
        f.nome
          .toLowerCase()
          .includes(formData.nomeParticipante.toLowerCase()) ||
        (f.cpfCnpj && f.cpfCnpj.includes(formData.nomeParticipante)),
    );
  }, [fornecedores, formData.nomeParticipante]);

  const handleExcluirAvulso = async (idFrontend: string) => {
    if (!window.confirm("Deseja realmente apagar este lançamento manual?"))
      return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("@AgroPops:token");
      const idReal = idFrontend.replace("AVU-", "");
      const response = await fetch(`${baseUrl}/livro-caixa/avulso/${idReal}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) buscarLancamentos();
      else alert("Erro ao excluir o lançamento.");
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // FUNÇÃO: EXCLUIR NOTA FISCAL
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
        buscarLancamentos();
      } else {
        alert("Erro ao excluir a nota fiscal.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de comunicação com o servidor.");
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileSpreadsheet className="text-agro-secondary" /> Livro Caixa
              (LCDPR)
            </h1>
            {currentProperty && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 mt-1">
                Exibindo Cota-Parte: {currentProperty.percentualParticipacao}%
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Lançamentos em Regime de Caixa agrupados por data de
            pagamento/vencimento.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-1 relative">
            {botoesAnosRapidos.map((ano) => (
              <button
                key={ano}
                onClick={() => setSelectedYear(ano)}
                disabled={isLoading}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${selectedYear === ano ? "bg-agro-secondary text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"} disabled:opacity-50`}
              >
                {ano}
              </button>
            ))}
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <button
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              disabled={isLoading}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${showYearDropdown ? "bg-gray-100 text-gray-800" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"}`}
              title="Explorar mais anos"
            >
              {isLoading ? (
                <Loader2
                  size={18}
                  className="animate-spin text-agro-secondary"
                />
              ) : (
                <Calendar size={18} />
              )}
              <ChevronDown size={14} />
            </button>
            {showYearDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowYearDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 shadow-xl rounded-xl p-3 z-50 w-72">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
                    Selecione o Ano Base
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {anosDisponiveis.map((ano) => (
                      <button
                        key={ano}
                        onClick={() => {
                          setSelectedYear(ano);
                          setShowYearDropdown(false);
                        }}
                        className={`px-2 py-2 text-xs font-bold rounded-lg transition-colors ${selectedYear === ano ? "bg-agro-secondary text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200"}`}
                      >
                        {ano}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <button className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm text-sm">
            <Download size={18} /> Apuração
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-agro-secondary hover:bg-agro-primary text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm text-sm cursor-pointer"
          >
            <Plus size={18} /> Lançamento Avulso
          </button>
        </div>
      </div>

      <div
        className={`bg-white border border-gray-300 shadow-sm rounded-xl overflow-hidden font-sans transition-opacity duration-300 ${isLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}
      >
        <div className="grid grid-cols-12 bg-gray-100 border-b border-gray-300 py-3 px-4 text-[13px] font-black text-gray-600 uppercase tracking-wider">
          <div className="col-span-4">Mês de Apuração</div>
          <div className="col-span-2 text-right">Entradas (Receitas)</div>
          <div className="col-span-2 text-right">Dedutível (LCDPR) Saídas</div>
          <div className="col-span-2 text-right">Saldo do Mês</div>
          <div className="col-span-2 text-right">Saldo Acumulado</div>
        </div>

        <div className="divide-y divide-gray-200">
          {dadosPorMes.map((mesDados, index) => {
            const isExpanded = expandedMonths.has(index);
            const saldoMes = mesDados.totalEntradas - mesDados.totalSaidas;
            const hasData = mesDados.lancamentos.length > 0;

            return (
              <div key={index} className="flex flex-col">
                <button
                  onClick={() => hasData && toggleMonth(index)}
                  disabled={!hasData}
                  className={`grid grid-cols-12 px-4 py-3 items-center text-sm transition-colors ${hasData ? "hover:bg-blue-50/40 cursor-pointer" : "bg-gray-50/30 cursor-not-allowed opacity-60"}`}
                >
                  <div className="col-span-4 flex items-center gap-2 font-bold text-gray-800">
                    <span className="text-gray-400">
                      {isExpanded ? (
                        <ChevronDown size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </span>
                    {MESES[index]} {selectedYear}
                    {!hasData && (
                      <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded ml-2">
                        Sem movimento
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 text-right font-mono text-blue-700 font-medium">
                    {formatBRL(mesDados.totalEntradas)}
                  </div>
                  <div className="col-span-2 text-right font-mono font-bold text-rose-600">
                    {formatBRL(mesDados.totalDedutivel)}
                  </div>
                  <div
                    className={`col-span-2 text-right font-mono font-bold ${mesDados.saldoMes < 0 ? "text-rose-600" : "text-emerald-600"}`}
                  >
                    {formatBRL(mesDados.saldoMes)}
                  </div>
                  <div
                    className={`col-span-2 text-right font-mono font-black ${mesDados.saldoAcumulado < 0 ? "text-rose-700" : "text-emerald-700"}`}
                  >
                    {formatBRL(mesDados.saldoAcumulado)}
                  </div>
                </button>

                {isExpanded && hasData && (
                  <div className="bg-gray-50 border-t border-b border-gray-200 p-4 shadow-inner">
                    <table className="w-full text-left border-collapse bg-white border border-gray-300 text-[13px]">
                      <thead>
                        <tr className="bg-gray-100 text-gray-600 font-bold border-b border-gray-300 [&_th]:border-r [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2">
                          <th className="w-20">Data</th>
                          <th className="w-32">Documento</th>
                          <th>Histórico do Lançamento</th>
                          <th className="w-24 text-center">Origem</th>
                          <th className="w-32 text-center">Classificação</th>
                          <th className="w-32 text-right">Entrada</th>
                          <th className="w-32 text-right">Saída Dedutível</th>
                          <th className="w-12 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {mesDados.lancamentos.map((lanc) => {
                          const isDevolucao = lanc.valor < 0;

                          return (
                            <tr
                              key={lanc.id}
                              onClick={() => abrirNotaVinculada(lanc.notaId)}
                              className={`border-b border-gray-200 [&_td]:border-r [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-1.5 text-gray-700 transition-colors ${lanc.origem === "NFE" ? "hover:bg-blue-50/50 cursor-pointer" : "hover:bg-yellow-50/50"}`}
                            >
                              {/* 1. Data */}
                              <td className="font-mono text-xs">
                                {formatDate(lanc.data)}
                              </td>

                              {/* 2. Documento */}
                              <td
                                className="font-mono text-xs truncate max-w-[120px]"
                                title={lanc.documento}
                              >
                                {lanc.documento}
                              </td>

                              {/* 3. Histórico (Exibe a parcela correta: 002/8) */}
                              <td
                                className="truncate max-w-[250px]"
                                title={lanc.historico}
                              >
                                {lanc.historico}
                              </td>

                              {/* 4. Origem */}
                              <td className="text-center">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide ${lanc.origem === "NFE" ? "bg-blue-100 text-blue-700" : lanc.origem === "SISTEMA" ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-purple-100 text-purple-700"}`}
                                >
                                  {lanc.origem}
                                </span>
                              </td>

                              {/* 5. Classificação (%) */}
                              <td className="text-center">
                                {lanc.tipo === "SAIDA" ? (
                                  <span
                                    title={
                                      lanc.percDedutivel < 100 &&
                                      lanc.percDedutivel > 0
                                        ? `Valor da parcela reduzido. Apenas ${lanc.percDedutivel}% da nota possui itens dedutíveis no LCDPR.`
                                        : "Percentual de dedutibilidade da nota."
                                    }
                                    className={`text-[10px] font-bold px-2.5 py-1 rounded cursor-help transition-all ${
                                      lanc.percDedutivel === 100
                                        ? "bg-emerald-100 text-emerald-700"
                                        : lanc.percDedutivel === 0
                                          ? "bg-rose-100 text-rose-700"
                                          : "bg-amber-100 text-amber-700 border border-amber-200"
                                    }`}
                                  >
                                    {lanc.percDedutivel === 100
                                      ? "SIM (100%)"
                                      : lanc.percDedutivel === 0
                                        ? "NÃO LANÇADO"
                                        : `PARCIAL (${lanc.percDedutivel}%)`}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>

                              {/* 6. Entrada */}
                              <td className="text-right font-mono">
                                {lanc.tipo === "ENTRADA" ? (
                                  isDevolucao ? (
                                    <span
                                      className="text-sky-600 flex items-center justify-end gap-1.5"
                                      title="Estorno/Devolução"
                                    >
                                      <RotateCcw size={12} strokeWidth={3} />{" "}
                                      {formatBRL(Math.abs(lanc.valor))}
                                    </span>
                                  ) : (
                                    <span className="text-blue-600 font-medium">
                                      {formatBRL(lanc.valor)}
                                    </span>
                                  )
                                ) : (
                                  ""
                                )}
                              </td>

                              {/* 7. Saída Dedutível */}
                              <td className="text-right font-mono">
                                {lanc.tipo === "SAIDA" ? (
                                  isDevolucao ? (
                                    <span
                                      className="text-sky-600 flex items-center justify-end gap-1.5"
                                      title="Estorno/Devolução"
                                    >
                                      <RotateCcw size={12} strokeWidth={3} />{" "}
                                      {formatBRL(Math.abs(lanc.valorDedutivel))}
                                    </span>
                                  ) : (
                                    <span className="text-rose-600 font-medium">
                                      {formatBRL(lanc.valorDedutivel)}
                                    </span>
                                  )
                                ) : (
                                  ""
                                )}
                              </td>

                              {/* 8. Ações */}
                              <td className="text-center">
                                {lanc.origem === "AVULSO" ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExcluirAvulso(lanc.id);
                                    }}
                                    className="text-gray-400 hover:text-rose-600 p-1 transition-colors"
                                    title="Apagar Lançamento Manual"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                ) : (
                                  <span
                                    className="text-gray-300"
                                    title="Apague no menu Notas Fiscais"
                                  >
                                    -
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* SOMATÓRIA ANUAL DO LIVRO CAIXA */}
        <div className="grid grid-cols-12 bg-white border-t-2 border-gray-300 py-4 px-4 text-sm tracking-wider items-center shadow-sm">
          <div className="col-span-4 font-black uppercase flex items-center gap-2 text-gray-800">
            <CalendarDays size={18} className="text-agro-secondary" /> Somatória
            Anual ({selectedYear})
          </div>
          <div className="col-span-2 text-right font-mono font-bold text-blue-700">
            {formatBRL(totaisAno.entradas)}
          </div>
          <div className="col-span-2 text-right font-mono font-bold text-rose-600">
            {formatBRL(totaisAno.dedutiveis)}
          </div>
          <div className="col-span-2 text-right font-mono text-gray-400">-</div>
          <div
            className={`col-span-2 text-right font-mono font-black text-lg ${saldoAnual < 0 ? "text-rose-600" : "text-emerald-600"}`}
          >
            {formatBRL(saldoAnual)}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Plus className="text-agro-secondary" /> Novo Lançamento Manual
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-lg text-gray-400"
              >
                <X size={20} />
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3.5 mx-6 mt-6 rounded-xl flex items-start gap-3 shadow-sm">
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
            <form onSubmit={handleSalvarAvulso} className="p-6 space-y-4">
              {feedback.text && (
                <div
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border ${feedback.type === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}
                >
                  {feedback.type === "error" ? (
                    <AlertCircle size={18} />
                  ) : (
                    <CheckCircle size={18} />
                  )}{" "}
                  {feedback.text}
                </div>
              )}
              <div className="flex items-center justify-between gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 shadow-inner">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, tipo: "SAIDA" }))}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${formData.tipo === "SAIDA" ? "bg-rose-600 text-white shadow-md scale-[1.02]" : "bg-rose-100 text-rose-500 hover:bg-rose-200"}`}
                >
                  DESPESA (Saída)
                </button>
                <div className="text-gray-300 shrink-0 px-1">
                  <ArrowRightLeft size={16} />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({ ...p, tipo: "ENTRADA" }))
                  }
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${formData.tipo === "ENTRADA" ? "bg-emerald-600 text-white shadow-md scale-[1.02]" : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"}`}
                >
                  RECEITA (Entrada)
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase">
                  Data da Operação
                </label>
                <input
                  type="date"
                  required
                  value={formData.data}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, data: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm focus:border-agro-secondary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase">
                  Histórico do Lançamento
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Compensação de Prejuízo, Acerto de Juros..."
                  value={formData.historico}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, historico: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm focus:border-agro-secondary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 items-start pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={formData.valor}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        valor: e.target.value.replace(/[^0-9,.-]/g, ""),
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm font-mono font-bold focus:border-agro-secondary text-right text-gray-800"
                  />
                </div>
                {formData.tipo === "SAIDA" ? (
                  <div className="pt-6">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.isDedutivel}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            isDedutivel: e.target.checked,
                          }))
                        }
                        className="rounded border-gray-300 text-agro-secondary focus:ring-agro-secondary h-4 w-4"
                      />
                      <div className="text-xs">
                        <p className="font-bold text-gray-700">
                          Lançar no Livro
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Abate imposto no LCDPR
                        </p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="pt-6 text-xs text-gray-400 font-medium italic">
                    * Receitas entram 100% no bruto.
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-bold text-white bg-agro-secondary hover:bg-agro-primary rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Confirmar Lançamento"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedNotaModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* CABEÇALHO DO MODAL */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
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
                        if (selectedNotaModal.chaveAcesso)
                          navigator.clipboard.writeText(
                            selectedNotaModal.chaveAcesso,
                          );
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
              <button
                onClick={() => setSelectedNotaModal(null)}
                className="p-2 hover:bg-gray-200 rounded-lg text-gray-400 self-start"
              >
                <X size={20} />
              </button>
            </div>

            {/* BARRA DE INFORMAÇÕES DETALHADAS */}
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
                    {formatDate(selectedNotaModal.dataEmissao)}
                  </p>
                </div>
              </div>

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

            {/* ABAS */}
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
                        onClick={() =>
                          abrirNotaVinculada(selectedNotaModal.id, true)
                        }
                        className="flex items-center gap-2 bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 px-3 py-2 rounded-xl text-sm font-bold transition-colors"
                        title="Desfazer alterações e voltar ao estado original da nota"
                      >
                        <RotateCcw size={16} /> Restaurar Original
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

      {/* MINI-MODAL DO DETALHAMENTO DO NCM */}
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

      {/* MINI-MODAL DO DETALHAMENTO DO CFOP */}
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
    </div>
  );
}
