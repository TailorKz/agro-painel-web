import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Calculator,
  AlertCircle,
  Info,
  Scale,
  TrendingDown,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
  ArrowRight,
  FileDown,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { useProducer } from "../context/ProducerContext";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";

export function SimuladorIRPR() {
  const { currentProducer, currentProperty } = useProducer();
  const baseUrl = import.meta.env.VITE_API_URL;
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const colDadosRef = useRef<HTMLDivElement>(null);
  const colResultadosRef = useRef<HTMLDivElement>(null);

  const [receitaBruta, setReceitaBruta] = useState("0,00");
  const [despesasDedutiveis, setDespesasDedutiveis] = useState("0,00");
  const [dependentes, setDependentes] = useState("0");
  const [saude, setSaude] = useState("0,00");
  const [educacao, setEducacao] = useState("0,00");
  const [inss, setInss] = useState("0,00");
  const [pgbl, setPgbl] = useState("0,00");
  const [pensao, setPensao] = useState("0,00");

  const anosDisponiveis = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    return Array.from({ length: 15 }, (_, i) => anoAtual - 5 + i);
  }, []);

  const botoesAnosRapidos = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    const anos = new Set([anoAtual - 1, anoAtual, anoAtual + 1, selectedYear]);
    return Array.from(anos).sort((a, b) => a - b);
  }, [selectedYear]);

  const parseCurrency = (value: string) => {
    const numeric = value.replace(/[^0-9,-]/g, "").replace(",", ".");
    return parseFloat(numeric) || 0;
  };

  const formatCurrencyInput = (value: string) => {
    const raw = value.replace(/\D/g, "");
    if (!raw) return "0,00";
    const numeric = parseInt(raw, 10) / 100;
    return numeric.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatBRL = (valor: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);

  const sincronizarDados = useCallback(async () => {
    if (!currentProducer) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("@AgroPops:token");
      const response = await fetch(
        `${baseUrl}/livro-caixa/${currentProducer.id}/totais?ano=${selectedYear}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.ok) {
        const totais = await response.json();
        const multiplicador = currentProperty
          ? currentProperty.percentualParticipacao / 100
          : 1;

        // CORREÇÃO CIRÚRGICA DA FORMATAÇÃO DO VALOR DO BANCO
        setReceitaBruta(
          formatCurrencyInput(
            (totais.totalReceitas * multiplicador).toFixed(2),
          ),
        );
        setDespesasDedutiveis(
          formatCurrencyInput(
            (totais.totalDespesasDedutiveis * multiplicador).toFixed(2),
          ),
        );
      } else {
        setReceitaBruta("0,00");
        setDespesasDedutiveis("0,00");
      }
    } catch (error) {
      console.error("Erro ao carregar totais da API", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentProducer, currentProperty, selectedYear, baseUrl]);

  useEffect(() => {
    sincronizarDados();
  }, [sincronizarDados]);

  const gerarRelatorioPDF = async () => {
    const elDados = colDadosRef.current;
    const elResultados = colResultadosRef.current;
    if (!elDados || !elResultados || !currentProducer) return;
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const margin = 10;
      const availableWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const capturarEImprimir = async (
        elemento: HTMLElement,
        isNovaPagina: boolean,
      ) => {
        const dataUrl = await toPng(elemento, {
          quality: 1.0,
          backgroundColor: "#F5F7FA",
          pixelRatio: 2,
          fontEmbedCSS: "",
        });
        if (isNovaPagina) pdf.addPage();
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text(
          `Planejamento Tributário Rural - ${selectedYear}`,
          margin,
          margin + 5,
        );
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(
          `Produtor: ${currentProducer.name} | CPF/CNPJ: ${currentProducer.document}`,
          margin,
          margin + 12,
        );
        const imgProps = pdf.getImageProperties(dataUrl);
        const calcHeight = (imgProps.height * availableWidth) / imgProps.width;
        pdf.addImage(
          dataUrl,
          "PNG",
          margin,
          margin + 18,
          availableWidth,
          calcHeight,
        );
      };
      await capturarEImprimir(elDados, false);
      await capturarEImprimir(elResultados, true);
      pdf.save(
        `Planejamento_IRPF_${currentProducer.name.split(" ")[0]}_${selectedYear}.pdf`,
      );
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const calculos = useMemo(() => {
    const rb = parseCurrency(receitaBruta);
    const dd = parseCurrency(despesasDedutiveis);
    const deps = parseInt(dependentes) || 0;
    const lucroReal = Math.max(0, rb - dd);
    const lucroPresumido = rb * 0.2;
    const deducaoDependentes = deps * 2275.08;
    const tetoEducacao = (deps + 1) * 3561.5;
    const deducaoEducacao = Math.min(parseCurrency(educacao), tetoEducacao);
    const maxPgblReal = lucroReal * 0.12;
    const maxPgblPresumido = lucroPresumido * 0.12;
    const pgblDigitado = parseCurrency(pgbl);
    const deducaoSaude = parseCurrency(saude);
    const deducaoInss = parseCurrency(inss);
    const deducaoPensao = parseCurrency(pensao);
    const baseReal = Math.max(
      0,
      lucroReal -
        deducaoDependentes -
        deducaoEducacao -
        deducaoSaude -
        deducaoInss -
        Math.min(pgblDigitado, maxPgblReal) -
        deducaoPensao,
    );
    const basePresumida = Math.max(
      0,
      lucroPresumido -
        deducaoDependentes -
        deducaoEducacao -
        deducaoSaude -
        deducaoInss -
        Math.min(pgblDigitado, maxPgblPresumido) -
        deducaoPensao,
    );
    const getFaixaIndex = (base: number) => {
      if (base <= 28467.2) return 0;
      if (base <= 33919.8) return 1;
      if (base <= 45012.6) return 2;
      if (base <= 55976.16) return 3;
      return 4;
    };
    const calcularImposto = (base: number, faixaIndex: number) => {
      if (faixaIndex === 0) return 0;
      if (faixaIndex === 1) return base * 0.075 - 2135.04;
      if (faixaIndex === 2) return base * 0.15 - 4679.03;
      if (faixaIndex === 3) return base * 0.225 - 8054.97;
      return base * 0.275 - 10853.78;
    };
    const faixaReal = getFaixaIndex(baseReal);
    const faixaPresumida = getFaixaIndex(basePresumida);
    const impostoReal = calcularImposto(baseReal, faixaReal);
    const impostoPresumido = calcularImposto(basePresumida, faixaPresumida);
    return {
      lucroReal,
      lucroPresumido,
      impostoReal,
      impostoPresumido,
      faixaReal,
      faixaPresumida,
      tetoEducacao,
      maxPgblReal,
      economiaReal: impostoPresumido - impostoReal,
      economiaPresumida: impostoReal - impostoPresumido,
      aliquotaEfetivaReal: rb > 0 ? (impostoReal / rb) * 100 : 0,
      aliquotaEfetivaPresumida: rb > 0 ? (impostoPresumido / rb) * 100 : 0,
    };
  }, [
    receitaBruta,
    despesasDedutiveis,
    dependentes,
    saude,
    educacao,
    inss,
    pgbl,
    pensao,
  ]);

  const getFaixaLabel = (index: number) => {
    const faixas = ["Isento (0%)", "7,50%", "15,00%", "22,50%", "27,50%"];
    return faixas[index] || "Isento (0%)";
  };

  return (
    <div className="space-y-6 pb-10">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calculator className="text-agro-secondary" />
            Simulador de IRPF Rural
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Planejamento tributário interativo. Compare o Regime Completo com o
            Lucro Presumido.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* NOVO SELETOR DE ANOS */}
          <div className="bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-1 relative z-50">
            {botoesAnosRapidos.map((ano) => (
              <button
                key={ano}
                onClick={() => setSelectedYear(ano)}
                disabled={isLoading || isGeneratingPdf}
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
              disabled={isLoading || isGeneratingPdf}
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
            {/* Dropdown Menu do Calendário */}
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
          <button
            onClick={gerarRelatorioPDF}
            disabled={isGeneratingPdf}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <FileDown size={18} />
            )}
            Gerar Relatório (PDF)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div ref={colDadosRef} className="xl:col-span-4 space-y-4 p-2 -m-2">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-800 uppercase tracking-wider">
                    Atividade Rural
                  </h2>
                  {currentProperty && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">
                      Cota: {currentProperty.percentualParticipacao}%
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Pode ser alterado manualmente para testes.
                </p>
              </div>
              <button
                onClick={sincronizarDados}
                disabled={isLoading}
                title="Puxar dados reais do banco de dados"
                className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <span title="Dados sincronizados do Livro Caixa">
                    <RefreshCw size={16} />
                  </span>
                )}
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase">
                  Receita Bruta (Entradas)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                    R$
                  </span>
                  <input
                    type="text"
                    value={receitaBruta}
                    onChange={(e) =>
                      setReceitaBruta(formatCurrencyInput(e.target.value))
                    }
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg outline-none text-sm font-mono font-bold text-gray-800 focus:border-agro-secondary"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase">
                  Despesas Comprovadas (Saídas)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                    R$
                  </span>
                  <input
                    type="text"
                    value={despesasDedutiveis}
                    onChange={(e) =>
                      setDespesasDedutiveis(formatCurrencyInput(e.target.value))
                    }
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg outline-none text-sm font-mono font-bold text-gray-800 focus:border-agro-secondary"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-800 uppercase tracking-wider">
                  Deduções Pessoais
                </h2>
                <p className="text-[10px] text-gray-400">
                  Aplicadas após o cálculo do Lucro da Atividade.
                </p>
              </div>
            </div>
            <div className="space-y-5">
              <div className="space-y-1">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    Nº de Dependentes
                  </label>
                  <span className="text-[9px] font-bold text-emerald-600">
                    Deduz {formatBRL(parseInt(dependentes) * 2275.08 || 0)}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={dependentes}
                  onChange={(e) => setDependentes(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm font-bold text-gray-800 focus:border-agro-secondary"
                />
                <p className="text-[10px] text-gray-400 leading-tight">
                  Valor fixo de R$ 2.275,08 por dependente legal/ano.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-600 uppercase">
                    Saúde
                  </label>
                  <input
                    type="text"
                    value={saude}
                    onChange={(e) =>
                      setSaude(formatCurrencyInput(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm font-mono text-gray-800 focus:border-agro-secondary"
                  />
                  <p className="text-[9px] text-gray-400">Sem limite legal.</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-600 uppercase">
                    Educação
                  </label>
                  <input
                    type="text"
                    value={educacao}
                    onChange={(e) =>
                      setEducacao(formatCurrencyInput(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm font-mono text-gray-800 focus:border-agro-secondary"
                  />
                  <p className="text-[9px] text-emerald-600 font-semibold">
                    Teto: {formatBRL(calculos.tetoEducacao)}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-600 uppercase">
                    INSS (Oficial)
                  </label>
                  <input
                    type="text"
                    value={inss}
                    onChange={(e) =>
                      setInss(formatCurrencyInput(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm font-mono text-gray-800 focus:border-agro-secondary"
                  />
                  <p className="text-[9px] text-gray-400">Sem limite legal.</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-600 uppercase">
                    PGBL (Privada)
                  </label>
                  <input
                    type="text"
                    value={pgbl}
                    onChange={(e) =>
                      setPgbl(formatCurrencyInput(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm font-mono text-gray-800 focus:border-agro-secondary"
                  />
                  <p className="text-[9px] text-emerald-600 font-semibold">
                    Max (Real): {formatBRL(calculos.maxPgblReal)}
                  </p>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-xs font-bold text-gray-600 uppercase">
                  Pensão Alimentícia
                </label>
                <input
                  type="text"
                  value={pensao}
                  onChange={(e) =>
                    setPensao(formatCurrencyInput(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm font-mono text-gray-800 focus:border-agro-secondary"
                />
                <p className="text-[10px] text-gray-400">
                  Sem limite, desde que estabelecida por decisão judicial.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={colResultadosRef}
          className="xl:col-span-8 space-y-6 p-2 -m-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CARD: RESULTADO REAL */}
            <div
              className={`relative overflow-hidden p-6 rounded-2xl border-2 transition-all ${calculos.impostoReal <= calculos.impostoPresumido ? "bg-emerald-50 border-emerald-500 shadow-lg" : "bg-white border-gray-200 opacity-90"}`}
            >
              {calculos.impostoReal <= calculos.impostoPresumido && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl">
                  Mais Vantajoso
                </div>
              )}
              <h3 className="text-lg font-black text-gray-800 mb-1 flex items-center gap-2">
                <FileSpreadsheet
                  size={20}
                  className={
                    calculos.impostoReal <= calculos.impostoPresumido
                      ? "text-emerald-600"
                      : "text-gray-400"
                  }
                />
                Regime Completo (Real)
              </h3>
              <p className="text-xs text-gray-500 mb-6 border-b border-gray-200 pb-4">
                Apuração exata via Livro Caixa Documentado.
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Lucro da Atividade:</span>
                  <span className="font-mono font-bold text-gray-800">
                    {formatBRL(calculos.lucroReal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Faixa Aplicada (IR):</span>
                  <span className="font-mono font-bold text-gray-800">
                    {getFaixaLabel(calculos.faixaReal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm bg-gray-100/50 p-1.5 rounded-lg">
                  <span className="text-gray-500 font-semibold">
                    Alíquota Efetiva:
                  </span>
                  <span className="font-mono font-bold text-emerald-700">
                    {calculos.aliquotaEfetivaReal.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="bg-white/60 p-4 rounded-xl border border-gray-100 shadow-inner">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Imposto a Pagar
                </p>
                <p
                  className={`text-3xl font-black font-mono ${calculos.impostoReal === 0 ? "text-emerald-600" : "text-gray-900"}`}
                >
                  {formatBRL(calculos.impostoReal)}
                </p>
              </div>

              {calculos.economiaReal > 0 && (
                <div className="mt-4 flex items-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-100/50 p-2.5 rounded-lg border border-emerald-200">
                  <TrendingDown size={16} /> Economia de{" "}
                  {formatBRL(calculos.economiaReal)}
                </div>
              )}
            </div>

            {/* CARD: LUCRO PRESUMIDO */}
            <div
              className={`relative overflow-hidden p-6 rounded-2xl border-2 transition-all ${calculos.impostoPresumido < calculos.impostoReal ? "bg-blue-50 border-blue-500 shadow-lg" : "bg-white border-gray-200 opacity-90"}`}
            >
              {calculos.impostoPresumido < calculos.impostoReal && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl">
                  Mais Vantajoso
                </div>
              )}
              <h3 className="text-lg font-black text-gray-800 mb-1 flex items-center gap-2">
                <Scale
                  size={20}
                  className={
                    calculos.impostoPresumido < calculos.impostoReal
                      ? "text-blue-600"
                      : "text-gray-400"
                  }
                />
                Lucro Presumido (20%)
              </h3>
              <p className="text-xs text-gray-500 mb-6 border-b border-gray-200 pb-4">
                Isenção de comprovação das despesas de custeio.
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Lucro da Atividade:</span>
                  <span className="font-mono font-bold text-gray-800">
                    {formatBRL(calculos.lucroPresumido)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Faixa Aplicada (IR):</span>
                  <span className="font-mono font-bold text-gray-800">
                    {getFaixaLabel(calculos.faixaPresumida)}
                  </span>
                </div>
                <div className="flex justify-between text-sm bg-gray-100/50 p-1.5 rounded-lg">
                  <span className="text-gray-500 font-semibold">
                    Alíquota Efetiva:
                  </span>
                  <span className="font-mono font-bold text-blue-700">
                    {calculos.aliquotaEfetivaPresumida.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="bg-white/60 p-4 rounded-xl border border-gray-100 shadow-inner">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Imposto a Pagar
                </p>
                <p
                  className={`text-3xl font-black font-mono ${calculos.impostoPresumido === 0 ? "text-blue-600" : "text-gray-900"}`}
                >
                  {formatBRL(calculos.impostoPresumido)}
                </p>
              </div>

              {calculos.economiaPresumida > 0 && (
                <div className="mt-4 flex items-center gap-2 text-blue-600 text-sm font-bold bg-blue-100/50 p-2.5 rounded-lg border border-blue-200">
                  <TrendingDown size={16} /> Economia de{" "}
                  {formatBRL(calculos.economiaPresumida)}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <span title="As deduções abatem a base de cálculo nos dois regimes.">
                <Info size={18} className="text-gray-400" />
              </span>
              <h3 className="text-base font-bold text-gray-800 uppercase tracking-wider">
                Tabela Progressiva Anual de IRPF
              </h3>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left border-collapse bg-white text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                    <th className="px-4 py-3">
                      Faixa de Base de Cálculo Anual
                    </th>
                    <th className="px-4 py-3 text-center">Alíquota</th>
                    <th className="px-4 py-3 text-right">Parcela a Deduzir</th>
                    <th className="px-4 py-3 text-center">Enquadramento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono text-gray-700">
                  <tr
                    className={`hover:bg-gray-50 transition-colors ${calculos.faixaReal === 0 || calculos.faixaPresumida === 0 ? "bg-yellow-50/30" : ""}`}
                  >
                    <td className="px-4 py-3">Até R$ 28.467,20</td>
                    <td className="px-4 py-3 text-center text-gray-400">-</td>
                    <td className="px-4 py-3 text-right text-gray-400">-</td>
                    <td className="px-4 py-3 flex justify-center gap-2">
                      {calculos.faixaReal === 0 && (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-sans font-bold flex items-center gap-1">
                          <FileSpreadsheet size={10} /> REAL
                        </span>
                      )}
                      {calculos.faixaPresumida === 0 && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-sans font-bold flex items-center gap-1">
                          <Scale size={10} /> PRESUMIDO
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr
                    className={`hover:bg-gray-50 transition-colors ${calculos.faixaReal === 1 || calculos.faixaPresumida === 1 ? "bg-yellow-50/30" : ""}`}
                  >
                    <td className="px-4 py-3">
                      De R$ 28.467,21 até R$ 33.919,80
                    </td>
                    <td className="px-4 py-3 text-center">7,50%</td>
                    <td className="px-4 py-3 text-right">R$ 2.135,04</td>
                    <td className="px-4 py-3 flex justify-center gap-2">
                      {calculos.faixaReal === 1 && (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-sans font-bold flex items-center gap-1">
                          <FileSpreadsheet size={10} /> REAL
                        </span>
                      )}
                      {calculos.faixaPresumida === 1 && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-sans font-bold flex items-center gap-1">
                          <Scale size={10} /> PRESUMIDO
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr
                    className={`hover:bg-gray-50 transition-colors ${calculos.faixaReal === 2 || calculos.faixaPresumida === 2 ? "bg-yellow-50/30" : ""}`}
                  >
                    <td className="px-4 py-3">
                      De R$ 33.919,81 até R$ 45.012,60
                    </td>
                    <td className="px-4 py-3 text-center">15,00%</td>
                    <td className="px-4 py-3 text-right">R$ 4.679,03</td>
                    <td className="px-4 py-3 flex justify-center gap-2">
                      {calculos.faixaReal === 2 && (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-sans font-bold flex items-center gap-1">
                          <FileSpreadsheet size={10} /> REAL
                        </span>
                      )}
                      {calculos.faixaPresumida === 2 && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-sans font-bold flex items-center gap-1">
                          <Scale size={10} /> PRESUMIDO
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr
                    className={`hover:bg-gray-50 transition-colors ${calculos.faixaReal === 3 || calculos.faixaPresumida === 3 ? "bg-yellow-50/30" : ""}`}
                  >
                    <td className="px-4 py-3">
                      De R$ 45.012,61 até R$ 55.976,16
                    </td>
                    <td className="px-4 py-3 text-center">22,50%</td>
                    <td className="px-4 py-3 text-right">R$ 8.054,97</td>
                    <td className="px-4 py-3 flex justify-center gap-2">
                      {calculos.faixaReal === 3 && (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-sans font-bold flex items-center gap-1">
                          <FileSpreadsheet size={10} /> REAL
                        </span>
                      )}
                      {calculos.faixaPresumida === 3 && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-sans font-bold flex items-center gap-1">
                          <Scale size={10} /> PRESUMIDO
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr
                    className={`hover:bg-gray-50 transition-colors ${calculos.faixaReal === 4 || calculos.faixaPresumida === 4 ? "bg-yellow-50/30" : ""}`}
                  >
                    <td className="px-4 py-3">Acima de R$ 55.976,16</td>
                    <td className="px-4 py-3 text-center">27,50%</td>
                    <td className="px-4 py-3 text-right">R$ 10.853,78</td>
                    <td className="px-4 py-3 flex justify-center gap-2">
                      {calculos.faixaReal === 4 && (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-sans font-bold flex items-center gap-1">
                          <FileSpreadsheet size={10} /> REAL
                        </span>
                      )}
                      {calculos.faixaPresumida === 4 && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-sans font-bold flex items-center gap-1">
                          <Scale size={10} /> PRESUMIDO
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
              <ArrowRight size={10} /> A base de cálculo final do IRPF é o Lucro
              da Atividade (Real ou Presumido) reduzido de todas as Deduções
              Pessoais informadas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
