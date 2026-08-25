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

interface IrprConfig {
  faturamentoMinimo: number;
  limiteLcdpr: number;
  lucroPresumido: number;
  bensTotais: number;
  faixasIrpf: {
    id: number;
    ate: number | null;
    aliquota: number;
    deducao: number;
  }[];
}

const fallbackConfig: IrprConfig = {
  faturamentoMinimo: 177920.0,
  limiteLcdpr: 4800000.0,
  lucroPresumido: 20.0,
  bensTotais: 800000.0,
  faixasIrpf: [
    { id: 1, ate: 28467.2, aliquota: 0, deducao: 0 },
    { id: 2, ate: 33919.8, aliquota: 7.5, deducao: 2135.04 },
    { id: 3, ate: 45012.6, aliquota: 15.0, deducao: 4679.03 },
    { id: 4, ate: 55976.16, aliquota: 22.5, deducao: 8054.97 },
    { id: 5, ate: null, aliquota: 27.5, deducao: 10853.78 },
  ],
};

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

  const [configAno, setConfigAno] = useState<IrprConfig>(fallbackConfig);

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
    if (!value) return 0;
    const cleanString = value.split(".").join("").replace(",", ".");
    return parseFloat(cleanString) || 0;
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

      // 1. Busca os totais do Livro Caixa
      const response = await fetch(
        `${baseUrl}/livro-caixa/${currentProducer.id}/totais?ano=${selectedYear}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        const totais = await response.json();
        const multiplicador = currentProperty
          ? currentProperty.percentualParticipacao / 100
          : 1;
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

      // 2. Busca a Tabela e Parâmetros (SEM CACHE)
      const resRegras = await fetch(
        `${baseUrl}/admins/regras-globais?t=${Date.now()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );

      if (resRegras.ok) {
        const regrasGlobais = await resRegras.json();
        const regraDoAno = regrasGlobais.find(
          (r: any) => r.codigo === `IRPR_LIMITES_${selectedYear}`,
        );

        if (regraDoAno && regraDoAno.descricao) {
          try {
            setConfigAno(JSON.parse(regraDoAno.descricao));
          } catch (e) {
            setConfigAno(fallbackConfig);
          }
        } else {
          setConfigAno(fallbackConfig);
        }
      } else {
        setConfigAno(fallbackConfig);
      }
    } catch (error) {
      console.error("Erro ao carregar da API", error);
      setConfigAno(fallbackConfig);
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
          `Produtor: ${currentProducer.nome} | CPF/CNPJ: ${currentProducer.cpfCnpj}`,
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
        `Planejamento_IRPF_${currentProducer.nome.split(" ")[0]}_${selectedYear}.pdf`,
      );
    } catch (error) {
      console.error("Erro PDF:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const calculos = useMemo(() => {
    const rb = parseCurrency(receitaBruta);
    const dd = parseCurrency(despesasDedutiveis);
    const deps = parseInt(dependentes) || 0;
    const lucroReal = Math.max(0, rb - dd);

    // BLINDAGEM DOS 2000%: Garante que 20.00 vire 0.20 para a matemática.
    const percentualPresumido =
      configAno.lucroPresumido > 1
        ? configAno.lucroPresumido / 100
        : configAno.lucroPresumido;
    const lucroPresumido = rb * percentualPresumido;

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
      let index = configAno.faixasIrpf.length - 1;
      for (let i = 0; i < configAno.faixasIrpf.length; i++) {
        if (
          configAno.faixasIrpf[i].ate !== null &&
          base <= configAno.faixasIrpf[i].ate!
        ) {
          return i;
        }
      }
      return index;
    };

    const calcularImposto = (base: number, faixaIndex: number) => {
      const faixa = configAno.faixasIrpf[faixaIndex];
      if (!faixa || faixa.aliquota === 0) return 0;
      return base * (faixa.aliquota / 100) - faixa.deducao;
    };

    const faixaReal = getFaixaIndex(baseReal);
    const faixaPresumida = getFaixaIndex(basePresumida);
    let impostoReal = Math.max(0, calcularImposto(baseReal, faixaReal));
    let impostoPresumido = Math.max(
      0,
      calcularImposto(basePresumida, faixaPresumida),
    );

    // A REGRA DA ISENÇÃO VOLTOU! Se não atingiu o teto, zera o imposto cobrado
    const isObrigadoDeclarar = rb >= configAno.faturamentoMinimo;
    if (!isObrigadoDeclarar) {
      impostoReal = 0;
      impostoPresumido = 0;
    }

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
      aliquotaEfetivaReal:
        rb > 0 && isObrigadoDeclarar ? (impostoReal / rb) * 100 : 0,
      aliquotaEfetivaPresumida:
        rb > 0 && isObrigadoDeclarar ? (impostoPresumido / rb) * 100 : 0,
      isObrigadoDeclarar,
      isObrigadoLcdpr: rb >= configAno.limiteLcdpr,
      percentualPresumido, // Usado no visual do card
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
    configAno,
  ]);

  const getFaixaLabel = (index: number) => {
    const faixa = configAno.faixasIrpf[index];
    if (!faixa) return "N/A";
    if (faixa.aliquota === 0) return "Isento (0%)";
    return `${faixa.aliquota.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`;
  };

  return (
    <div
      className={`space-y-6 pb-10 transition-opacity duration-300 ${isLoading ? "opacity-40 pointer-events-none" : "opacity-100"}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calculator className="text-agro-secondary" /> Simulador de IRPF
            Rural
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Planejamento tributário interativo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-1 relative z-50">
            {botoesAnosRapidos.map((ano) => (
              <button
                key={ano}
                onClick={() => setSelectedYear(ano)}
                disabled={isLoading || isGeneratingPdf}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${selectedYear === ano ? "bg-agro-secondary text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}
              >
                {ano}
              </button>
            ))}
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <button
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              disabled={isLoading || isGeneratingPdf}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${showYearDropdown ? "bg-gray-100 text-gray-800" : "text-gray-500 hover:bg-gray-100"}`}
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
                        className={`px-2 py-2 text-xs font-bold rounded-lg transition-colors ${selectedYear === ano ? "bg-agro-secondary text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 border border-transparent"}`}
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
            )}{" "}
            Gerar Relatório
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${calculos.isObrigadoDeclarar ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}
        >
          <AlertCircle size={24} className="shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">
              Obrigatoriedade de IRPF ({selectedYear})
            </h3>
            <p className="text-xs mt-1 opacity-90 leading-relaxed">
              {calculos.isObrigadoDeclarar
                ? `Atenção: O faturamento ultrapassou o teto da Receita Federal (${formatBRL(configAno.faturamentoMinimo)}). A declaração de ajuste anual é obrigatória.`
                : `O faturamento bruto atual está abaixo do limite de isenção (${formatBRL(configAno.faturamentoMinimo)}). A declaração pela receita não é obrigatória por este critério.`}
            </p>
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${calculos.isObrigadoLcdpr ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-slate-50 border-slate-200 text-slate-700"}`}
        >
          <Scale size={24} className="shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">Obrigatoriedade do LCDPR</h3>
            <p className="text-xs mt-1 opacity-90 leading-relaxed">
              {calculos.isObrigadoLcdpr
                ? `O faturamento atingiu a super-regra de ${formatBRL(configAno.limiteLcdpr)}. É obrigatória a entrega do arquivo digital estruturado.`
                : `Faturamento dentro do limite normal. A apuração pode ser mantida de forma simplificada sem entrega do arquivo digital.`}
            </p>
          </div>
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
              </div>
              <button
                onClick={sincronizarDados}
                disabled={isLoading}
                className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
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
              </div>
            </div>
          </div>
        </div>

        <div
          ref={colResultadosRef}
          className="xl:col-span-8 space-y-6 p-2 -m-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CARTÃO REGIME REAL */}
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
                Apuração exata via Livro Caixa.
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Lucro da Atividade:</span>
                  <span className="font-mono font-bold text-gray-800">
                    {formatBRL(calculos.lucroReal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Faixa Aplicada:</span>
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
                  {!calculos.isObrigadoDeclarar
                    ? "ISENTO"
                    : formatBRL(calculos.impostoReal)}
                </p>
              </div>
            </div>

            {/* CARTÃO LUCRO PRESUMIDO */}
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
                Lucro Presumido (
                {(calculos.percentualPresumido * 100).toFixed(0)}%)
              </h3>
              <p className="text-xs text-gray-500 mb-6 border-b border-gray-200 pb-4">
                Isenção de comprovação das despesas.
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Lucro da Atividade:</span>
                  <span className="font-mono font-bold text-gray-800">
                    {formatBRL(calculos.lucroPresumido)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Faixa Aplicada:</span>
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
                  {!calculos.isObrigadoDeclarar
                    ? "ISENTO"
                    : formatBRL(calculos.impostoPresumido)}
                </p>
              </div>
            </div>
          </div>

          {/* TABELA PROGRESSIVA */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <Info size={18} className="text-gray-400" />
              <h3 className="text-base font-bold text-gray-800 uppercase tracking-wider">
                Tabela Progressiva Anual ({selectedYear})
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
                  {configAno.faixasIrpf.map((faixa, index) => {
                    const isRealEnquadrado = calculos.faixaReal === index;
                    const isPresumidoEnquadrado =
                      calculos.faixaPresumida === index;

                    let labelFaixa = "";
                    if (index === 0) {
                      labelFaixa = `Até R$ ${faixa.ate?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
                    } else if (faixa.ate === null) {
                      labelFaixa = `Acima de R$ ${configAno.faixasIrpf[index - 1].ate?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
                    } else {
                      labelFaixa = `De R$ ${(configAno.faixasIrpf[index - 1].ate! + 0.01).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} até R$ ${faixa.ate.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
                    }

                    return (
                      <tr
                        key={faixa.id}
                        className={`hover:bg-gray-50 transition-colors ${isRealEnquadrado || isPresumidoEnquadrado ? "bg-yellow-50/30" : ""}`}
                      >
                        <td className="px-4 py-3">{labelFaixa}</td>
                        <td className="px-4 py-3 text-center">
                          {faixa.aliquota > 0 ? (
                            `${faixa.aliquota.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {faixa.deducao > 0 ? (
                            formatBRL(faixa.deducao)
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 flex justify-center gap-2">
                          {isRealEnquadrado && (
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-sans font-bold flex items-center gap-1">
                              <FileSpreadsheet size={10} /> REAL
                            </span>
                          )}
                          {isPresumidoEnquadrado && (
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-sans font-bold flex items-center gap-1">
                              <Scale size={10} /> PRESUMIDO
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
