import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Eye,
  EyeOff,
  FileText,
  Calendar,
  ArrowRight,
  Receipt,
} from "lucide-react";
import { useProducer } from "../context/ProducerContext";

// NOVOS TIPOS ATUALIZADOS COM O BACKEND
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
  itens: ItemNota[];
};

export function VisaoGeral() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const { currentProducer } = useProducer();
  const navigate = useNavigate();
  const [showValues, setShowValues] = useState(true);
  const [activeFilter, setActiveFilter] = useState("Este Mês");
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const filters = ["Hoje", "Este Mês", "Este Ano", "Tudo"];

  const obterParametrosDeData = (filtro: string) => {
    const hoje = new Date();
    const formatarISO = (data: Date) => {
      const tzOffset = data.getTimezoneOffset() * 60000;
      return new Date(data.getTime() - tzOffset).toISOString().split("T")[0];
    };

    if (filtro === "Hoje")
      return `?inicio=${formatarISO(hoje)}&fim=${formatarISO(hoje)}`;
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

  useEffect(() => {
    const buscarNotas = async () => {
      if (!currentProducer) {
        setNotas([]);
        return;
      }
      setIsLoading(true);
      try {
        const token = localStorage.getItem("@AgroPops:token");
        const parametros = obterParametrosDeData(activeFilter);

        const response = await fetch(
          `${baseUrl}notas/listar/${currentProducer.id}${parametros}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (response.ok) {
          const dados = await response.json();
          setNotas(dados);
        }
      } catch (error) {
        console.error("Erro ao buscar notas:", error);
      } finally {
        setIsLoading(false);
      }
    };
    buscarNotas();
  }, [currentProducer, activeFilter]);

  // NOVOS CÁLCULOS FINANCEIROS
  const totalEntradas = notas
    .filter((n) => n.tipo === "ENTRADA")
    .reduce((acc, curr) => acc + curr.valorTotal, 0);
  const totalSaidas = notas
    .filter((n) => n.tipo === "SAIDA")
    .reduce((acc, curr) => acc + curr.valorTotal, 0);
  const saldo = totalEntradas - totalSaidas;

  // A MAGIA DOS ITENS: Soma dedutibilidade linha a linha de cada XML
  let totalDedutivel = 0;
  let totalNaoDedutivel = 0;

  notas
    .filter((n) => n.tipo === "SAIDA")
    .forEach((nota) => {
      nota.itens.forEach((item) => {
        if (item.isDedutivel) {
          totalDedutivel += item.valor;
        } else {
          totalNaoDedutivel += item.valor;
        }
      });
    });

  const porcentagemDedutivel =
    totalSaidas > 0 ? Math.round((totalDedutivel / totalSaidas) * 100) : 0;

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

  const ultimasNotas = notas.slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Visão Geral{" "}
            {currentProducer ? `- ${(currentProducer.name || currentProducer.nome || "").split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Resumo financeiro e fiscal atualizado em tempo real via SEFAZ.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeFilter === filter
                  ? "bg-agro-secondary text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {filter === "Tudo" ? (
                <Calendar size={16} className="inline-block" />
              ) : (
                filter
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Wallet size={20} />
              </div>
              <span className="font-semibold text-gray-500">Saldo Geral</span>
            </div>
            <button
              onClick={() => setShowValues(!showValues)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              {showValues ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>
          <div className="mt-4">
            <h2
              className={`text-3xl font-bold ${saldo < 0 ? "text-rose-600" : "text-gray-800"}`}
            >
              {showValues ? formatBRL(saldo) : "R$ •••••••"}
            </h2>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <span className="font-semibold text-gray-500">
              Total de Entradas
            </span>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-bold text-emerald-600">
              {showValues ? formatBRL(totalEntradas) : "R$ •••••••"}
            </h2>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown size={20} />
            </div>
            <span className="font-semibold text-gray-500">Total de Saídas</span>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-bold text-rose-600">
              {showValues ? formatBRL(totalSaidas) : "R$ •••••••"}
            </h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FileText size={20} className="text-agro-secondary" />
              Classificação LCDPR (Detalhada por Item)
            </h3>
            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
              {activeFilter}
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {isLoading ? (
              <div className="flex justify-center items-center h-full text-gray-400">
                Processando Livro Caixa...
              </div>
            ) : (
              <>
                <div className="mb-2 flex justify-between text-sm font-semibold">
                  <span className="text-emerald-600">
                    Dedutível ({porcentagemDedutivel}%)
                  </span>
                  <span className="text-rose-500">
                    Não Dedutível ({100 - porcentagemDedutivel}%)
                  </span>
                </div>
                <div className="w-full h-4 bg-rose-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 rounded-r-none transition-all"
                    style={{ width: `${porcentagemDedutivel}%` }}
                  />
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <p className="text-sm text-gray-500 font-medium">
                      Abate Imposto (Itens)
                    </p>
                    <p className="text-xl font-bold text-emerald-700 mt-1">
                      {showValues ? formatBRL(totalDedutivel) : "••••••"}
                    </p>
                  </div>
                  <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100">
                    <p className="text-sm text-gray-500 font-medium">
                      Despesa Pessoal (Itens)
                    </p>
                    <p className="text-xl font-bold text-rose-700 mt-1">
                      {showValues ? formatBRL(totalNaoDedutivel) : "••••••"}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Receipt size={20} className="text-gray-400" />
              Últimas Notas Importadas
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-10 text-gray-400 text-sm">
                Carregando...
              </div>
            ) : ultimasNotas.length === 0 ? (
              <div className="flex justify-center py-10 text-gray-400 text-sm">
                Nenhuma nota encontrada.
              </div>
            ) : (
              ultimasNotas.map((nota) => (
                <div
                  key={nota.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${nota.tipo === "ENTRADA" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}
                    >
                      {nota.tipo === "ENTRADA" ? (
                        <TrendingUp size={18} />
                      ) : (
                        <TrendingDown size={18} />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-800">
                        {nota.empresaEnvolvida}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatarData(nota.dataEmissao)} • {nota.itens.length}{" "}
                        itens
                      </p>
                    </div>
                  </div>
                  <div
                    className={`font-bold text-sm ${nota.tipo === "ENTRADA" ? "text-emerald-600" : "text-gray-700"}`}
                  >
                    {nota.tipo === "ENTRADA" ? "+" : "-"}{" "}
                    {showValues ? formatBRL(nota.valorTotal) : "••••••"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
