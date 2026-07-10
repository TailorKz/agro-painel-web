import { useState, useEffect, useMemo } from "react";
import {
  Calculator,
  AlertCircle,
  Info,
  Scale,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import { useProducer } from "../context/ProducerContext";

export function SimuladorIRPR() {
  const { currentProducer } = useProducer();
  const baseUrl = import.meta.env.VITE_API_URL;

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);

  // Estados Base (Puxados do Livro Caixa, mas editáveis)
  const [receitaBruta, setReceitaBruta] = useState("0");
  const [despesasDedutiveis, setDespesasDedutiveis] = useState("0");

  // Estados de Deduções Legais da Pessoa Física
  const [dependentes, setDependentes] = useState("0");
  const [saude, setSaude] = useState("0");
  const [educacao, setEducacao] = useState("0");
  const [inss, setInss] = useState("0");
  const [pgbl, setPgbl] = useState("0");
  const [pensao, setPensao] = useState("0");

  const anosDisponiveis = [
    new Date().getFullYear() - 1,
    new Date().getFullYear(),
    new Date().getFullYear() + 1,
  ];

  const parseCurrency = (value: string) => {
    const numeric = value.replace(/[^0-9,-]/g, "").replace(",", ".");
    return parseFloat(numeric) || 0;
  };

  const formatCurrencyInput = (value: string) => {
    const raw = value.replace(/\D/g, "");
    if (!raw) return "0,00";
    const numeric = (parseInt(raw, 10) / 100).toFixed(2);
    return numeric.replace(".", ",");
  };

  const formatBRL = (valor: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);

  // Simulação de busca na API para preencher Receita e Despesa
  useEffect(() => {
    const carregarTotais = async () => {
      if (!currentProducer) return;
      setIsLoading(true);
      try {
        const token = localStorage.getItem("@AgroPops:token");
        // Futuro endpoint agregado: /api/livro-caixa/{id}/totais?ano=2026
        const response = await fetch(
          `${baseUrl}/livro-caixa/${currentProducer.id}?ano=${selectedYear}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (response.ok) {
          const lancamentos = await response.json();
          let entradas = 0;
          let saidasDedutiveis = 0;

          lancamentos.forEach((l: any) => {
            if (l.tipo === "ENTRADA") entradas += l.valor;
            if (l.tipo === "SAIDA" && l.isDedutivel)
              saidasDedutiveis += l.valor;
          });

          setReceitaBruta(entradas.toFixed(2).replace(".", ","));
          setDespesasDedutiveis(saidasDedutiveis.toFixed(2).replace(".", ","));
        }
      } catch (error) {
        console.error("Erro ao carregar totais", error);
      } finally {
        setIsLoading(false);
      }
    };

    carregarTotais();
  }, [currentProducer, selectedYear, baseUrl]);

  // --- MOTOR DE CÁLCULO TRIBUTÁRIO ---
  const calculos = useMemo(() => {
    const rb = parseCurrency(receitaBruta);
    const dd = parseCurrency(despesasDedutiveis);
    const deps = parseInt(dependentes) || 0;

    // 1. Resultados da Atividade Rural
    const lucroReal = Math.max(0, rb - dd);
    const lucroPresumido = rb * 0.2;

    // 2. Cálculo das Deduções Legais (com aplicação de tetos)
    const deducaoDependentes = deps * 2275.08;
    const tetoEducacao = (deps + 1) * 3561.5; // +1 inclui o titular
    const deducaoEducacao = Math.min(parseCurrency(educacao), tetoEducacao);

    const maxPgblReal = lucroReal * 0.12;
    const maxPgblPresumido = lucroPresumido * 0.12;
    const pgblDigitado = parseCurrency(pgbl);

    const deducaoSaude = parseCurrency(saude);
    const deducaoInss = parseCurrency(inss);
    const deducaoPensao = parseCurrency(pensao);

    // 3. Base de Cálculo do IRPF
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

    // 4. Função da Tabela Progressiva Anual
    const calcularImposto = (base: number) => {
      if (base <= 28467.2) return 0;
      if (base <= 33919.8) return base * 0.075 - 2135.04;
      if (base <= 45012.6) return base * 0.15 - 4679.03;
      if (base <= 55976.16) return base * 0.225 - 8054.97;
      return base * 0.275 - 10853.78;
    };

    const impostoReal = calcularImposto(baseReal);
    const impostoPresumido = calcularImposto(basePresumida);

    return {
      lucroReal,
      lucroPresumido,
      impostoReal,
      impostoPresumido,
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

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calculator className="text-agro-secondary" />
            Calculadora de IRPF Rural
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Planejamento tributário, compare o Regime Completo com o
            Lucro Presumido.
          </p>
        </div>

        <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-1">
          {anosDisponiveis.map((ano) => (
            <button
              key={ano}
              onClick={() => setSelectedYear(ano)}
              disabled={isLoading}
              className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                selectedYear === ano
                  ? "bg-agro-secondary text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-100"
              } disabled:opacity-50`}
            >
              {ano}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA: ENTRADA DE DADOS */}
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800 uppercase tracking-wider">
                Atividade Rural
              </h2>
              {isLoading ? (
                <Loader2 size={16} className="animate-spin text-agro-light" />
              ) : (
                <span title="Dados sincronizados do Livro Caixa">
                  <RefreshCw size={16} className="text-gray-400" />
                </span>
              )}
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
              <h2 className="text-base font-bold text-gray-800 uppercase tracking-wider">
                Deduções Pessoais
              </h2>
              <span title="As deduções abatem a base de cálculo nos dois regimes.">
                <Info size={16} className="text-gray-400" />
              </span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase">
                  Nº de Dependentes
                </label>
                <input
                  type="number"
                  min="0"
                  value={dependentes}
                  onChange={(e) => setDependentes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm font-bold text-gray-800 focus:border-agro-secondary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-600 uppercase">
                    Saúde (S/ Limite)
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
                    Educação (C/ Limite)
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
                    PGBL (Até 12%)
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

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase">
                  Pensão Alimentícia (Judicial)
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

        {/* COLUNA DIREITA: CARDS COMPARATIVOS */}
        <div className="xl:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CARD: RESULTADO REAL */}
            <div
              className={`relative overflow-hidden p-6 rounded-2xl border-2 transition-all ${calculos.impostoReal <= calculos.impostoPresumido ? "bg-emerald-50 border-emerald-500 shadow-lg" : "bg-white border-gray-200"}`}
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
                  <span className="text-gray-500">Alíquota Efetiva:</span>
                  <span className="font-mono font-bold text-gray-800">
                    {calculos.aliquotaEfetivaReal.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="bg-white/60 p-4 rounded-xl border border-gray-100">
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
              className={`relative overflow-hidden p-6 rounded-2xl border-2 transition-all ${calculos.impostoPresumido < calculos.impostoReal ? "bg-blue-50 border-blue-500 shadow-lg" : "bg-white border-gray-200"}`}
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
                Sem necessidade de comprovar as despesas de custeio.
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Lucro da Atividade:</span>
                  <span className="font-mono font-bold text-gray-800">
                    {formatBRL(calculos.lucroPresumido)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Alíquota Efetiva:</span>
                  <span className="font-mono font-bold text-gray-800">
                    {calculos.aliquotaEfetivaPresumida.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="bg-white/60 p-4 rounded-xl border border-gray-100">
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

          {/* AVISO LEGAL */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle
              size={20}
              className="text-amber-600 flex-shrink-0 mt-0.5"
            />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1">
                Limites e Regras Aplicadas Automaticamente:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li>
                  O limite de educação aplicado foi de R$ 3.561,50 por pessoa
                  (Titular + Dependentes).
                </li>
                <li>
                  O abatimento do PGBL está travado no limite máximo de 12% da
                  Base de Cálculo.
                </li>
                <li>
                  As faixas de IR e deduções utilizadas são referentes ao modelo
                  anual oficial da Receita Federal.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
