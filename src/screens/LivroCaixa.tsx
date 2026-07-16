import { useState, useMemo, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { useProducer } from "../context/ProducerContext";

type Lancamento = {
  id: string;
  data: string;
  documento: string;
  historico: string;
  origem: "NFE" | "AVULSO";
  tipo: "ENTRADA" | "SAIDA";
  valor: number;
  isDedutivel: boolean;
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

export function LivroCaixa() {
  const { currentProducer, currentProperty } = useProducer();
  const baseUrl = import.meta.env.VITE_API_URL;

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Controle para exibir a caixa de ajuda de estornos
  const [showInfoEstorno, setShowInfoEstorno] = useState(false);

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split("T")[0],
    tipo: "SAIDA",
    tipoDocumento: "3",
    documento: "",
    cpfCnpjParticipante: "",
    historico: "",
    valor: "",
    isDedutivel: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ text: "", type: "" });

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
        const dados = await response.json();
        setLancamentos(dados);
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
      totalSaidas: 0,
      totalDedutivel: 0,
    }));

    const multiplicador = currentProperty
      ? currentProperty.percentualParticipacao / 100
      : 1;

    lancamentos.forEach((lanc) => {
      const ano = parseInt(lanc.data.split("-")[0]);
      const mes = parseInt(lanc.data.split("-")[1]) - 1;

      if (ano === selectedYear) {
        // Multiplica o valor do lançamento pela Cota-Parte
        const valorRateado = lanc.valor * multiplicador;

        // Cria uma cópia do lançamento para a tela com o valor ajustado
        agrupado[mes].lancamentos.push({ ...lanc, valor: valorRateado });

        if (lanc.tipo === "ENTRADA") {
          agrupado[mes].totalEntradas += valorRateado;
        } else {
          agrupado[mes].totalSaidas += valorRateado;
          if (lanc.isDedutivel) {
            agrupado[mes].totalDedutivel += valorRateado;
          }
        }
      }
    });
    return agrupado;
  }, [lancamentos, selectedYear, currentProperty]);

  const handleSalvarAvulso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProducer) return;
    if (!formData.documento || !formData.historico || !formData.valor) {
      setFeedback({
        text: "Por favor, preencha Documento, Histórico e Valor.",
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
            cpfCnpjParticipante: "",
            historico: "",
            valor: "",
            isDedutivel: true,
          });
          setShowInfoEstorno(false); // reseta o modal ao fechar
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

      if (response.ok) {
        buscarLancamentos();
      } else {
        alert("Erro ao excluir o lançamento.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

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
            Lançamentos detalhados do produtor organizados por ano-calendário.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-1 relative">
            {botoesAnosRapidos.map((ano) => (
              <button
                key={ano}
                onClick={() => setSelectedYear(ano)}
                disabled={isLoading}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                  selectedYear === ano
                    ? "bg-agro-secondary text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-100"
                } disabled:opacity-50`}
              >
                {ano}
              </button>
            ))}
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <button
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              disabled={isLoading}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${
                showYearDropdown
                  ? "bg-gray-100 text-gray-800"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              }`}
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
                        className={`px-2 py-2 text-xs font-bold rounded-lg transition-colors ${
                          selectedYear === ano
                            ? "bg-agro-secondary text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200"
                        }`}
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

      {/* TABELA PRINCIPAL */}
      <div
        className={`bg-white border border-gray-300 shadow-sm rounded-xl overflow-hidden font-sans transition-opacity duration-300 ${isLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}
      >
        <div className="grid grid-cols-12 bg-gray-100 border-b border-gray-300 py-3 px-4 text-[13px] font-black text-gray-600 uppercase tracking-wider">
          <div className="col-span-4">Mês de Apuração</div>
          <div className="col-span-2 text-right">Entradas (Receitas)</div>
          <div className="col-span-2 text-right">Saídas (Despesas)</div>
          <div className="col-span-2 text-right">Dedutível (LCDPR)</div>
          <div className="col-span-2 text-right">Saldo do Mês</div>
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
                  <div className="col-span-2 text-right font-mono text-gray-700">
                    {formatBRL(mesDados.totalEntradas)}
                  </div>
                  <div className="col-span-2 text-right font-mono text-gray-700">
                    {formatBRL(mesDados.totalSaidas)}
                  </div>
                  <div className="col-span-2 text-right font-mono font-bold text-emerald-600">
                    {formatBRL(mesDados.totalDedutivel)}
                  </div>
                  <div
                    className={`col-span-2 text-right font-mono font-bold ${saldoMes < 0 ? "text-rose-600" : "text-blue-600"}`}
                  >
                    {formatBRL(saldoMes)}
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
                          <th className="w-24 text-center">Dedutível?</th>
                          <th className="w-32 text-right">Entrada</th>
                          <th className="w-32 text-right">Saída</th>
                          <th className="w-12 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mesDados.lancamentos.map((lanc) => {
                          const isDevolucao = lanc.valor < 0;
                          const valorAbsoluto = Math.abs(lanc.valor);

                          return (
                            <tr
                              key={lanc.id}
                              className="border-b border-gray-200 hover:bg-yellow-50/50 [&_td]:border-r [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-1.5 text-gray-700"
                            >
                              <td className="font-mono text-xs">
                                {formatDate(lanc.data)}
                              </td>
                              <td
                                className="font-mono text-xs truncate max-w-[120px]"
                                title={lanc.documento}
                              >
                                {lanc.documento}
                              </td>
                              <td
                                className="truncate max-w-[250px]"
                                title={lanc.historico}
                              >
                                {lanc.historico}
                              </td>
                              <td className="text-center">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide ${
                                    lanc.origem === "NFE"
                                      ? "bg-blue-100 text-blue-700"
                                      : lanc.origem === "SISTEMA"
                                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                                        : "bg-purple-100 text-purple-700"
                                  }`}
                                >
                                  {lanc.origem}
                                </span>
                              </td>
                              <td className="text-center">
                                {lanc.tipo === "SAIDA" ? (
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${lanc.isDedutivel ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                                  >
                                    {lanc.isDedutivel ? "SIM" : "NÃO"}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>

                              <td className="text-right font-mono">
                                {lanc.tipo === "ENTRADA" ? (
                                  isDevolucao ? (
                                    <span
                                      className="text-sky-600 flex items-center justify-end gap-1.5"
                                      title="Estorno/Devolução"
                                    >
                                      <RotateCcw size={12} strokeWidth={3} />{" "}
                                      {formatBRL(valorAbsoluto)}
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
                              <td className="text-right font-mono">
                                {lanc.tipo === "SAIDA" ? (
                                  isDevolucao ? (
                                    <span
                                      className="text-sky-600 flex items-center justify-end gap-1.5"
                                      title="Estorno/Devolução"
                                    >
                                      <RotateCcw size={12} strokeWidth={3} />{" "}
                                      {formatBRL(valorAbsoluto)}
                                    </span>
                                  ) : (
                                    <span className="text-rose-600 font-medium">
                                      {formatBRL(lanc.valor)}
                                    </span>
                                  )
                                ) : (
                                  ""
                                )}
                              </td>

                              <td className="text-center">
                                {lanc.origem === "AVULSO" ? (
                                  <button
                                    onClick={() => handleExcluirAvulso(lanc.id)}
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
      </div>

      {/* MODAL DE CADASTRO AVULSO */}
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

              <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, tipo: "SAIDA" }))}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${formData.tipo === "SAIDA" ? "bg-rose-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  DESPESA (Saída)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({ ...p, tipo: "ENTRADA" }))
                  }
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${formData.tipo === "ENTRADA" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  RECEITA (Entrada)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    Tipo de Documento
                  </label>
                  <select
                    value={formData.tipoDocumento}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        tipoDocumento: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg outline-none text-sm focus:border-agro-secondary font-medium text-gray-700"
                  >
                    {TIPOS_DOCUMENTO.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    Número do Documento
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Recibo 45"
                    value={formData.documento}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, documento: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm focus:border-agro-secondary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    CPF / CNPJ
                  </label>
                  <input
                    type="text"
                    placeholder="Apenas números"
                    value={formData.cpfCnpjParticipante}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        cpfCnpjParticipante: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm focus:border-agro-secondary font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase">
                  Histórico do Lançamento
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pagamento folha de salários"
                  value={formData.historico}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, historico: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm focus:border-agro-secondary"
                />
              </div>

              {/* BLOCO FINANCEIRO ATUALIZADO COM O BOTÃO DE INFO */}
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
                  <div className="flex items-center justify-end gap-1 pt-1">
                    <p className="text-[10px] text-gray-400">
                      Pode usar sinal - para estornos.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowInfoEstorno(!showInfoEstorno)}
                      className="text-gray-400 hover:text-sky-600 transition-colors focus:outline-none"
                      title="Como lançar devoluções"
                    >
                      <Info size={14} />
                    </button>
                  </div>
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
                          Despesa Dedutível
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

                {/* CAIXA DE EXPLICAÇÃO EXPANSÍVEL (OCUPA AS DUAS COLUNAS DO GRID) */}
                {showInfoEstorno && (
                  <div className="col-span-2 p-3 mt-1 bg-sky-50 border border-sky-100 rounded-lg text-xs text-sky-800 leading-relaxed shadow-inner">
                    <p className="mb-2">
                      <strong>
                        Se o produtor devolve dinheiro ao cliente (Anular
                        Venda):
                      </strong>{" "}
                      Lance como <strong>ENTRADA</strong> e coloque o valor
                      negativo (ex: -10.000). O sistema entende que ele
                      "desfaturou" esse valor, reduzindo a Receita Bruta.
                    </p>
                    <p>
                      <strong>
                        Se o fornecedor devolve o dinheiro ao produtor (Anular
                        Compra):
                      </strong>{" "}
                      Lance como <strong>SAÍDA</strong> e coloque o valor
                      negativo (ex: -5.000). O sistema entende que aquela
                      despesa não existe mais, reduzindo as Despesas Dedutíveis.
                    </p>
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
    </div>
  );
}
