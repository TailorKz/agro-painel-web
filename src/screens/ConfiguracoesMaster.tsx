import { useState, useEffect, useCallback } from "react";
import {
  Save,
  Lock,
  Loader2,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  UserPlus,
  Scale,
} from "lucide-react";

// PADRÃO DE SEGURANÇA FORA DO COMPONENTE PARA RESET IMEDIATO
const getDefaultConfig = () => ({
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
});

export function ConfiguracoesMaster() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("@AgroPops:token");

  const [activeTab, setActiveTab] = useState<
    "perfil" | "senha" | "novo_admin" | "sistema"
  >("perfil");
  const [admin, setAdmin] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRegras, setIsLoadingRegras] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [formNovoAdmin, setFormNovoAdmin] = useState({
    nome: "",
    email: "",
    senha: "",
  });

  const [anoParametro, setAnoParametro] = useState(new Date().getFullYear());
  const [irprConfig, setIrprConfig] = useState(getDefaultConfig());

  useEffect(() => {
    const userStorage = localStorage.getItem("@AgroPops:user");
    if (userStorage) setAdmin(JSON.parse(userStorage));
  }, []);

  const buscarRegrasDoBanco = useCallback(
    async (ano: number) => {
      setIsLoadingRegras(true);
      try {
        const res = await fetch(
          `${baseUrl}/admins/regras-globais?t=${Date.now()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );
        if (res.ok) {
          const regras = await res.json();
          const regraDoAno = regras.find(
            (r: any) => r.codigo === `IRPR_LIMITES_${ano}`,
          );
          if (regraDoAno && regraDoAno.descricao) {
            setIrprConfig(JSON.parse(regraDoAno.descricao));
            return;
          }
        }
        setIrprConfig(getDefaultConfig());
      } catch (err) {
        console.error("Erro ao puxar regras", err);
        setIrprConfig(getDefaultConfig());
      } finally {
        setIsLoadingRegras(false);
      }
    },
    [baseUrl, token],
  );

  // CARREGA A REGRA APENAS NA PRIMEIRA VEZ OU QUANDO A ABA ABRIR
  useEffect(() => {
    if (activeTab === "sistema" && token) {
      buscarRegrasDoBanco(anoParametro);
    }
  }, [activeTab, token, buscarRegrasDoBanco]); // <-- Note que removemos o anoParametro daqui para evitar re-renders fantasma!

  // ESTA É A FUNÇÃO MÁGICA QUE ZERA A TELA NA HORA DE TROCAR O ANO
  const handleYearChange = (newYear: number) => {
    setAnoParametro(newYear);
    setIrprConfig(getDefaultConfig()); // Zera a tela no mesmo milissegundo para os valores padrão
    buscarRegrasDoBanco(newYear); // Depois pergunta ao banco se tem algo para preencher
  };

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 6000);
  };

  const formatMoney = (val: number | null) => {
    if (val === null) return "";
    return val.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleMoneyChange = (val: string, field: string) => {
    const numericValue = parseFloat(val.replace(/\D/g, "")) / 100 || 0;
    setIrprConfig({ ...irprConfig, [field]: numericValue });
  };

  const handleFaixaChange = (id: number, field: string, val: string) => {
    const numericValue = parseFloat(val.replace(/\D/g, "")) / 100 || 0;
    const novasFaixas = irprConfig.faixasIrpf.map((f) =>
      f.id === id ? { ...f, [field]: numericValue } : f,
    );
    setIrprConfig({ ...irprConfig, faixasIrpf: novasFaixas });
  };

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`${baseUrl}/admins/perfil/${admin.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(admin),
      });
      if (res.ok) {
        const atualizado = await res.json();
        localStorage.setItem("@AgroPops:user", JSON.stringify(atualizado));
        setAdmin(atualizado);
        showMessage("Conta atualizada!", "success");
      } else showMessage("Erro ao atualizar.", "error");
    } catch (err) {
      showMessage("Erro de conexão.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSalvarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmarSenha)
      return showMessage("Senhas não coincidem.", "error");
    setIsSaving(true);
    try {
      const res = await fetch(`${baseUrl}/admins/senha/${admin.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });
      if (res.ok) {
        showMessage("Palavra-passe alterada!", "success");
        setSenhaAtual("");
        setNovaSenha("");
        setConfirmarSenha("");
      } else showMessage("Erro ao alterar palavra-passe.", "error");
    } catch (err) {
      showMessage("Erro de conexão.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCriarNovoAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formNovoAdmin.senha.length < 6)
      return showMessage("Mínimo 6 caracteres.", "error");
    setIsSaving(true);
    try {
      const res = await fetch(`${baseUrl}/admins/novo-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formNovoAdmin),
      });
      if (res.ok) {
        showMessage(`Admin criado!`, "success");
        setFormNovoAdmin({ nome: "", email: "", senha: "" });
      } else showMessage("Erro ao criar admin.", "error");
    } catch (err) {
      showMessage("Erro de conexão.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSalvarParametros = async () => {
    setIsSaving(true);
    try {
      const codigoRegra = `IRPR_LIMITES_${anoParametro}`;

      const resBusca = await fetch(
        `${baseUrl}/admins/regras-globais?t=${Date.now()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );

      if (resBusca.ok) {
        const regras = await resBusca.json();
        const regraExistente = regras.find(
          (r: any) => r.codigo === codigoRegra,
        );
        if (regraExistente) {
          await fetch(`${baseUrl}/admins/regras-globais/${regraExistente.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }

      const payload = {
        tipo: "SISTEMA",
        codigo: codigoRegra,
        descricao: JSON.stringify(irprConfig),
        isDedutivel: false,
      };

      const resSave = await fetch(`${baseUrl}/admins/regras-globais`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (resSave.ok) {
        showMessage(
          `Regras do ano ${anoParametro} salvas com sucesso!`,
          "success",
        );
      } else {
        const erroMsg = await resSave.text();
        showMessage(`Erro ao salvar no banco: ${erroMsg}`, "error");
      }
    } catch (err) {
      showMessage("Erro de conexão.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!admin) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Configurações do Master
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Gerencie a sua conta e os parâmetros globais da plataforma.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50/50 flex-wrap">
          <button
            onClick={() => setActiveTab("perfil")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === "perfil" ? "text-slate-800 border-b-2 border-slate-800 bg-white" : "text-gray-500 hover:text-gray-800"}`}
          >
            <ShieldCheck size={18} /> Seus Dados
          </button>
          <button
            onClick={() => setActiveTab("senha")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === "senha" ? "text-slate-800 border-b-2 border-slate-800 bg-white" : "text-gray-500 hover:text-gray-800"}`}
          >
            <Lock size={18} /> Segurança
          </button>
          <button
            onClick={() => setActiveTab("novo_admin")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === "novo_admin" ? "text-blue-600 border-b-2 border-blue-600 bg-white" : "text-gray-500 hover:text-gray-800"}`}
          >
            <UserPlus size={18} /> Novo Admin
          </button>
          <button
            onClick={() => setActiveTab("sistema")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === "sistema" ? "text-amber-600 border-b-2 border-amber-600 bg-white" : "text-gray-500 hover:text-gray-800"}`}
          >
            <Scale size={18} /> Parâmetros (IRPR)
          </button>
        </div>

        <div className="p-8">
          {message.text && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}
            >
              {message.type === "success" ? (
                <CheckCircle size={18} />
              ) : (
                <AlertCircle size={18} />
              )}{" "}
              {message.text}
            </div>
          )}

          {activeTab === "perfil" && (
            <form
              onSubmit={handleSalvarPerfil}
              className="space-y-6 max-w-xl mx-auto"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={admin.nome}
                  onChange={(e) => setAdmin({ ...admin, nome: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  value={admin.email}
                  onChange={(e) =>
                    setAdmin({ ...admin, email: e.target.value })
                  }
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-slate-800"
                  required
                />
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors"
                >
                  {isSaving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}{" "}
                  Guardar
                </button>
              </div>
            </form>
          )}

          {activeTab === "senha" && (
            <form
              onSubmit={handleSalvarSenha}
              className="space-y-6 max-w-xl mx-auto"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Atual
                </label>
                <input
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova
                </label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-slate-800"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar
                </label>
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-slate-800"
                  required
                  minLength={6}
                />
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors"
                >
                  {isSaving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Lock size={18} />
                  )}{" "}
                  Atualizar
                </button>
              </div>
            </form>
          )}

          {activeTab === "novo_admin" && (
            <form
              onSubmit={handleCriarNovoAdmin}
              className="space-y-6 max-w-xl mx-auto"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={formNovoAdmin.nome}
                  onChange={(e) =>
                    setFormNovoAdmin({ ...formNovoAdmin, nome: e.target.value })
                  }
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  value={formNovoAdmin.email}
                  onChange={(e) =>
                    setFormNovoAdmin({
                      ...formNovoAdmin,
                      email: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha Inicial
                </label>
                <input
                  type="text"
                  value={formNovoAdmin.senha}
                  onChange={(e) =>
                    setFormNovoAdmin({
                      ...formNovoAdmin,
                      senha: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                  required
                  minLength={6}
                />
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors"
                >
                  {isSaving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <UserPlus size={18} />
                  )}{" "}
                  Cadastrar
                </button>
              </div>
            </form>
          )}

          {activeTab === "sistema" && (
            <div
              className={`space-y-8 max-w-4xl mx-auto transition-opacity duration-300 ${isLoadingRegras ? "opacity-40 pointer-events-none" : "opacity-100"}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-50 border border-amber-100 p-5 rounded-xl shadow-sm">
                <div>
                  <h2 className="text-lg font-black text-amber-900 flex items-center gap-2">
                    {isLoadingRegras && (
                      <Loader2
                        size={16}
                        className="animate-spin text-amber-600"
                      />
                    )}
                    Parâmetros Anuais da Receita Federal
                  </h2>
                  <p className="text-sm text-amber-800/80 font-medium mt-1">
                    As simulações respeitarão as regras do ano selecionado.
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-amber-200 shadow-sm shrink-0">
                  <label className="text-xs font-bold text-amber-700 uppercase tracking-wider pl-2">
                    Ano-Base:
                  </label>
                  <select
                    value={anoParametro}
                    onChange={(e) => handleYearChange(Number(e.target.value))}
                    className="bg-amber-50 text-amber-900 font-black text-base px-3 py-1.5 rounded outline-none border border-amber-100 cursor-pointer"
                  >
                    {[2023, 2024, 2025, 2026, 2027, 2028].map((ano) => (
                      <option key={ano} value={ano}>
                        {ano}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                  Limites e Obrigatoriedades ({anoParametro})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">
                      Obrigatoriedade IR (R$)
                    </label>
                    <input
                      type="text"
                      value={formatMoney(irprConfig.faturamentoMinimo)}
                      onChange={(e) =>
                        handleMoneyChange(e.target.value, "faturamentoMinimo")
                      }
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-amber-500 font-mono text-right text-gray-800 font-bold shadow-inner"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">
                      Obrigatoriedade LCDPR (R$)
                    </label>
                    <input
                      type="text"
                      value={formatMoney(irprConfig.limiteLcdpr)}
                      onChange={(e) =>
                        handleMoneyChange(e.target.value, "limiteLcdpr")
                      }
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-amber-500 font-mono text-right text-gray-800 font-bold shadow-inner"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">
                      Lucro Presumido (%)
                    </label>
                    <input
                      type="text"
                      value={formatMoney(irprConfig.lucroPresumido)}
                      onChange={(e) =>
                        handleMoneyChange(e.target.value, "lucroPresumido")
                      }
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-amber-500 font-mono text-right text-gray-800 font-bold shadow-inner"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">
                      Limite Bens e Direitos (R$)
                    </label>
                    <input
                      type="text"
                      value={formatMoney(irprConfig.bensTotais)}
                      onChange={(e) =>
                        handleMoneyChange(e.target.value, "bensTotais")
                      }
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-amber-500 font-mono text-right text-gray-800 font-bold shadow-inner"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                  Tabela Progressiva Anual (Cálculo do Imposto)
                </h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left bg-white">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 font-medium">
                          Faixa de Base de Cálculo (Até R$)
                        </th>
                        <th className="px-4 py-3 font-medium text-center">
                          Alíquota (%)
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          Parcela a Deduzir (R$)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {irprConfig.faixasIrpf.map((faixa, index) => (
                        <tr
                          key={faixa.id}
                          className="hover:bg-amber-50/30 transition-colors"
                        >
                          <td className="px-4 py-2">
                            {faixa.ate === null ? (
                              <span className="text-sm font-bold text-gray-500 px-3">
                                Acima de{" "}
                                {formatMoney(
                                  irprConfig.faixasIrpf[index - 1].ate,
                                )}
                              </span>
                            ) : (
                              <input
                                type="text"
                                value={formatMoney(faixa.ate)}
                                onChange={(e) =>
                                  handleFaixaChange(
                                    faixa.id,
                                    "ate",
                                    e.target.value,
                                  )
                                }
                                className="w-full p-2 border border-gray-200 rounded outline-none focus:border-amber-400 font-mono text-sm bg-gray-50 text-gray-700 font-bold"
                              />
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={formatMoney(faixa.aliquota)}
                              onChange={(e) =>
                                handleFaixaChange(
                                  faixa.id,
                                  "aliquota",
                                  e.target.value,
                                )
                              }
                              className="w-full p-2 border border-gray-200 rounded outline-none focus:border-amber-400 font-mono text-sm bg-gray-50 text-center text-amber-700 font-bold"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={formatMoney(faixa.deducao)}
                              onChange={(e) =>
                                handleFaixaChange(
                                  faixa.id,
                                  "deducao",
                                  e.target.value,
                                )
                              }
                              className="w-full p-2 border border-gray-200 rounded outline-none focus:border-amber-400 font-mono text-sm bg-gray-50 text-right text-rose-600 font-bold"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-4 flex justify-end border-t border-gray-100">
                <button
                  onClick={handleSalvarParametros}
                  disabled={isSaving || isLoadingRegras}
                  className="px-8 py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md shadow-slate-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}{" "}
                  Publicar Regras de {anoParametro}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
