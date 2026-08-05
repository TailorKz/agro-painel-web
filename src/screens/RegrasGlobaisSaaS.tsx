import { useState, useEffect, useCallback } from "react";
import {
  Database,
  Plus,
  Search,
  Trash2,
  Info,
  Loader2,
  X,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export function RegrasGlobaisSaaS() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("@AgroPops:token");

  const [regras, setRegras] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"TODOS" | "NCM" | "CFOP">(
    "TODOS",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState({ text: "", type: "" });

  const [formRegra, setFormRegra] = useState({
    tipo: "NCM",
    codigo: "",
    descricao: "",
    isDedutivel: true,
  });

  const carregarRegras = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/admins/regras-globais`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setRegras(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, token]);

  useEffect(() => {
    carregarRegras();
  }, [carregarRegras]);

  const showFeedback = (text: string, type: "success" | "error") => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback({ text: "", type: "" }), 4000);
  };

  const handleSalvarRegra = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/admins/regras-globais`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formRegra),
      });

      if (res.ok) {
        showFeedback("Regra salva com sucesso!", "success");
        setIsModalOpen(false);
        setFormRegra({
          tipo: "CFOP",
          codigo: "",
          descricao: "",
          isDedutivel: true,
        });
        carregarRegras();
      } else {
        showFeedback(
          "Erro: Este código já existe ou dados são inválidos.",
          "error",
        );
      }
    } catch (err) {
      showFeedback("Erro de conexão.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExcluirRegra = async (id: number) => {
    if (!window.confirm("Apagar esta regra global?")) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/admins/regras-globais/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRegras((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const regrasFiltradas = regras.filter((r) => {
    const matchesSearch =
      r.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = filtroTipo === "TODOS" || r.tipo === filtroTipo;
    return matchesSearch && matchesTipo;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Database className="text-blue-600" /> Configurações CFOP/NCM
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Matriz de decisão de CFOP e NCM aplicada globalmente
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Plus size={18} /> Nova Regra Manual
          </button>
        </div>
      </div>

      {feedback.text && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}
        >
          {feedback.type === "success" ? (
            <CheckCircle size={18} />
          ) : (
            <AlertCircle size={18} />
          )}{" "}
          {feedback.text}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-start gap-3">
        <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-blue-800 leading-relaxed">
          As regras cadastradas aqui são injetadas no banco geral. Quando o
          contador importar um XML, o sistema usará essas diretrizes para
          sugerir se a nota abate imposto ou não no LCDPR.
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 relative w-full">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por código ou descrição da regra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200 w-full md:w-auto">
          <button
            onClick={() => setFiltroTipo("TODOS")}
            className={`px-4 py-1.5 text-sm font-bold rounded-lg ${filtroTipo === "TODOS" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
          >
            Todas
          </button>
          <button
            onClick={() => setFiltroTipo("CFOP")}
            className={`px-4 py-1.5 text-sm font-bold rounded-lg ${filtroTipo === "CFOP" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}
          >
            Regras CFOP
          </button>
          <button
            onClick={() => setFiltroTipo("NCM")}
            className={`px-4 py-1.5 text-sm font-bold rounded-lg ${filtroTipo === "NCM" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500"}`}
          >
            Regras NCM
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-4 font-medium w-24">Natureza</th>
              <th className="px-6 py-4 font-medium">Código Aplicado</th>
              <th className="px-6 py-4 font-medium">
                Instrução / Detalhamento
              </th>
              <th className="px-6 py-4 font-medium text-center">
                Decisão LCDPR
              </th>
              <th className="px-6 py-4 font-medium text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && regras.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  <Loader2 className="animate-spin inline mr-2" size={18} />{" "}
                  Carregando base de regras...
                </td>
              </tr>
            ) : regrasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-gray-400">
                  <Database size={32} className="mx-auto mb-3 opacity-20" />
                  <p>
                    O banco de regras está vazio ou nenhum resultado foi
                    encontrado.
                  </p>
                </td>
              </tr>
            ) : (
              regrasFiltradas.map((regra) => (
                <tr
                  key={regra.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span
                      className={`text-[11px] font-black px-2 py-1 rounded-md ${regra.tipo === "CFOP" ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-emerald-100 text-emerald-700 border border-emerald-200"}`}
                    >
                      {regra.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-gray-800 text-sm">
                    {regra.codigo}
                  </td>
                  <td
                    className="px-6 py-4 text-sm text-gray-600 truncate max-w-md"
                    title={regra.descricao}
                  >
                    {regra.descricao}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {regra.isDedutivel ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        Dedutível (Lançar)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-700">
                        Bloquear (Uso Pessoal)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleExcluirRegra(regra.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Plus className="text-blue-600" /> Nova Regra Manual
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-lg text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSalvarRegra} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    Natureza
                  </label>
                  <select
                    value={formRegra.tipo}
                    onChange={(e) =>
                      setFormRegra({ ...formRegra, tipo: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg outline-none text-sm focus:border-blue-500 font-bold"
                  >
                    <option value="CFOP">Final CFOP</option>
                    <option value="NCM">Início NCM</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    Código
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      formRegra.tipo === "CFOP" ? "Ex: 102" : "Ex: 84"
                    }
                    value={formRegra.codigo}
                    onChange={(e) =>
                      setFormRegra({ ...formRegra, codigo: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm font-mono font-bold focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase">
                  Descrição da Regra
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Tratores e aparelhos mecânicos"
                  value={formRegra.descricao}
                  onChange={(e) =>
                    setFormRegra({ ...formRegra, descricao: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm focus:border-blue-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <input
                    type="checkbox"
                    checked={formRegra.isDedutivel}
                    onChange={(e) =>
                      setFormRegra({
                        ...formRegra,
                        isDedutivel: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-600 h-4 w-4"
                  />
                  <div className="text-sm">
                    <p className="font-bold text-gray-800">
                      Ação: Permitir Dedutibilidade
                    </p>
                    <p className="text-xs text-gray-500">
                      Se marcado, o sistema lançará a nota no LCDPR por padrão.
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 -mx-6 -mb-6 p-4 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Gravar Regra"
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
