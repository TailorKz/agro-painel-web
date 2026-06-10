import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Search,
  MoreVertical,
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
} from "lucide-react";

type NotaFiscal = {
  id: string;
  data: string;
  descricao: string;
  empresa: string;
  tipo: "entrada" | "saida";
  valor: string;
  isDedutivel: boolean;
};

const mockNotasCompletas: NotaFiscal[] = [
  {
    id: "1",
    data: "08/06/2026",
    descricao: "Venda de Soja (Sacas)",
    empresa: "Cooperativa AgroAlfa",
    tipo: "entrada",
    valor: "R$ 35.000,00",
    isDedutivel: true,
  },
  {
    id: "2",
    data: "05/06/2026",
    descricao: "Adubo NPK e Defensivos",
    empresa: "Agropecuária Sul Ltda",
    tipo: "saida",
    valor: "R$ 8.500,00",
    isDedutivel: true,
  },
  {
    id: "3",
    data: "02/06/2026",
    descricao: "Manutenção Trator John Deere",
    empresa: "Mecânica Agrícola Silva",
    tipo: "saida",
    valor: "R$ 3.200,00",
    isDedutivel: true,
  },
  {
    id: "4",
    data: "28/05/2026",
    descricao: "Venda de Milho (A Granel)",
    empresa: "Moinho do Campo",
    tipo: "entrada",
    valor: "R$ 18.400,00",
    isDedutivel: true,
  },
  {
    id: "5",
    data: "25/05/2026",
    descricao: "Sementes de Milho Híbrido",
    empresa: "Sementes Campeã",
    tipo: "saida",
    valor: "R$ 5.070,00",
    isDedutivel: true,
  },
  {
    id: "6",
    data: "24/05/2026",
    descricao: "Supermercado da Família",
    empresa: "Supermercado Celeiro",
    tipo: "saida",
    valor: "R$ 1.200,00",
    isDedutivel: false,
  },
  {
    id: "7",
    data: "20/05/2026",
    descricao: "Manutenção Carro de Passeio",
    empresa: "Auto Mecânica Centro",
    tipo: "saida",
    valor: "R$ 850,00",
    isDedutivel: false,
  },
];

export function NotasFiscais() {
  const location = useLocation();

  const navState = location.state as {
    abaInicial?: "todas" | "entrada" | "saida";
    filtroFiscal?: "todos" | "dedutivel" | "nao-dedutivel";
  } | null;

  const [searchTerm, setSearchTerm] = useState("");

  const [activeTab, setActiveTab] = useState<"todas" | "entrada" | "saida">(
    navState?.abaInicial || "todas",
  );
  const [fiscalFilter, setFiscalFilter] = useState<
    "todos" | "dedutivel" | "nao-dedutivel"
  >(navState?.filtroFiscal || "todos");

  // Lógica de filtragem encadeada (Abas + Busca por Texto + Filtro Fiscal)
  const notasFiltradas = mockNotasCompletas.filter((nota) => {
    const matchesTab = activeTab === "todas" || nota.tipo === activeTab;
    const matchesSearch =
      nota.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nota.empresa.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFiscal =
      fiscalFilter === "todos" ||
      (fiscalFilter === "dedutivel" && nota.isDedutivel) ||
      (fiscalFilter === "nao-dedutivel" && !nota.isDedutivel);

    return matchesTab && matchesSearch && matchesFiscal;
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Livro de Notas Fiscais
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Repositório completo de entradas, saídas e categorizações do
            produtor.
          </p>
        </div>
      </div>

      {/* ABAS ESTILO BANCO DIGITAL */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab("todas")}
          className={`pb-3 text-sm font-semibold transition-all px-2 relative ${
            activeTab === "todas"
              ? "text-agro-secondary font-bold"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Todas as Notas
          {activeTab === "todas" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-agro-secondary rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("entrada")}
          className={`pb-3 text-sm font-semibold transition-all px-2 relative ${
            activeTab === "entrada"
              ? "text-agro-secondary font-bold"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Entradas (Receitas)
          {activeTab === "entrada" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-agro-secondary rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("saida")}
          className={`pb-3 text-sm font-semibold transition-all px-2 relative ${
            activeTab === "saida"
              ? "text-agro-secondary font-bold"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Saídas (Despesas)
          {activeTab === "saida" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-agro-secondary rounded-full" />
          )}
        </button>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por descrição da nota ou nome do emitente/empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-agro-light focus:ring-2 focus:ring-agro-light/20 transition-all text-sm"
          />
        </div>

        {/* Filtro Dropdown Fiscal */}
        <div className="w-full md:w-auto flex items-center gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
            Classificação:
          </label>
          <select
            value={fiscalFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFiscalFilter(e.target.value as any)
            }
            className="bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700 rounded-lg px-3 py-2 outline-none focus:border-agro-secondary cursor-pointer"
          >
            <option value="todos">Todos os lançamentos</option>
            <option value="dedutivel">Dedutível (Atividade Agro)</option>
            <option value="nao-dedutivel">Não Dedutível (Pessoal)</option>
          </select>
        </div>
      </div>

      {/* LISTAGEM EM TABELA */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
              <th className="px-6 py-4 font-medium">Data</th>
              <th className="px-6 py-4 font-medium text-center">Fluxo</th>
              <th className="px-6 py-4 font-medium">Descrição / Empresa</th>
              <th className="px-6 py-4 font-medium">Classificação Fiscal</th>
              <th className="px-6 py-4 font-medium">Valor</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {notasFiltradas.map((nota) => (
              <tr
                key={nota.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                {/* Data */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                    <Calendar size={16} className="text-gray-400" />
                    {nota.data}
                  </div>
                </td>

                {/* Tipo Fluxo (Entrada / Saída) */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex justify-center">
                    {nota.tipo === "entrada" ? (
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 title='Entrada'">
                        <TrendingUp size={16} />
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 title='Saída'">
                        <TrendingDown size={16} />
                      </div>
                    )}
                  </div>
                </td>

                {/* Descrição e Empresa */}
                <td className="px-6 py-4">
                  <p className="font-semibold text-gray-800 text-sm">
                    {nota.descricao}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{nota.empresa}</p>
                </td>

                {/* Dedutibilidade */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {nota.isDedutivel ? (
                    <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-100 w-fit">
                      <CheckCircle size={12} />
                      DEDUTÍVEL
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full text-xs font-bold border border-rose-100 w-fit">
                      <XCircle size={12} />
                      NÃO DEDUTÍVEL
                    </div>
                  )}
                </td>

                {/* Valor */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`text-sm font-bold font-mono ${
                      nota.tipo === "entrada"
                        ? "text-emerald-600"
                        : "text-gray-800"
                    }`}
                  >
                    {nota.tipo === "entrada" ? "+" : "-"} {nota.valor}
                  </span>
                </td>

                {/* Três pontinhos (Ações) */}
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Feedback de lista vazia */}
        {notasFiltradas.length === 0 && (
          <div className="p-12 text-center text-sm text-gray-400 font-medium">
            Nenhum lançamento fiscal corresponde aos filtros selecionados.
          </div>
        )}
      </div>
    </div>
  );
}
