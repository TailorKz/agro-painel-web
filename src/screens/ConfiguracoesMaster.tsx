import { useState, useEffect } from "react";
import {
  Save,
  Lock,
  Loader2,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

export function ConfiguracoesMaster() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("@AgroPops:token");

  const [activeTab, setActiveTab] = useState<
    "perfil" | "senha" | "novo_admin" | "sistema"
  >("perfil");

  //Controle do ano dos parâmetros
  const [anoParametro, setAnoParametro] = useState(new Date().getFullYear());

  const [irprConfig, setIrprConfig] = useState({
    faturamentoMinimo: 177920.0,
    limiteLcdpr: 4800000.0,
    lucroPresumido: 20.0,
    bensTotais: 800000.0,
    faixasIrpf: [
      { id: 1, ate: 28467.2, aliquota: 0, deducao: 0 },
      { id: 2, ate: 33919.8, aliquota: 7.5, deducao: 2135.04 },
      { id: 3, ate: 45012.6, aliquota: 15.0, deducao: 4679.03 },
      { id: 4, ate: 55976.16, aliquota: 22.5, deducao: 8054.97 },
      { id: 5, ate: null, aliquota: 27.5, deducao: 10853.78 }, // null = "Acima de"
    ],
  });

  // FUNÇÕES DE MÁSCARA (Transforma números em R$ e % visualmente)
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

  const [admin, setAdmin] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // ... (o resto do código continua igual)

  // Senhas
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  // Novo Admin
  const [formNovoAdmin, setFormNovoAdmin] = useState({
    nome: "",
    email: "",
    senha: "",
  });

  useEffect(() => {
    const userStorage = localStorage.getItem("@AgroPops:user");
    if (userStorage) setAdmin(JSON.parse(userStorage));
  }, []);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
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
        showMessage("Conta Mestra atualizada!", "success");
      } else {
        showMessage("Erro ao atualizar.", "error");
      }
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
        showMessage("Palavra-passe alterada com segurança!", "success");
        setSenhaAtual("");
        setNovaSenha("");
        setConfirmarSenha("");
      } else {
        const erro = await res.text();
        showMessage(erro || "Erro ao alterar palavra-passe.", "error");
      }
    } catch (err) {
      showMessage("Erro de conexão.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCriarNovoAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formNovoAdmin.senha.length < 6)
      return showMessage(
        "A senha precisa ter no mínimo 6 caracteres.",
        "error",
      );

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
        showMessage(
          `Administrador ${formNovoAdmin.nome} criado com sucesso!`,
          "success",
        );
        setFormNovoAdmin({ nome: "", email: "", senha: "" }); // Reseta form
      } else {
        const erro = await res.text();
        showMessage(erro || "Erro ao criar administrador.", "error");
      }
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

      // 1. Busca para ver se já existe uma regra salva para este ano
      const resBusca = await fetch(`${baseUrl}/admins/regras-globais`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resBusca.ok) {
        const regras = await resBusca.json();
        const regraExistente = regras.find(
          (r: any) => r.codigo === codigoRegra,
        );

        // 2. Se existir, deleta a antiga (pois vamos substituir pela nova edição)
        if (regraExistente) {
          await fetch(`${baseUrl}/admins/regras-globais/${regraExistente.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }

      // 3. Cria o pacote com o JSON atualizado da tela
      const payload = {
        tipo: "SISTEMA",
        codigo: codigoRegra,
        descricao: JSON.stringify(irprConfig),
        isDedutivel: false,
      };

      // 4. Salva no banco de dados
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
          `Regras de ${anoParametro} publicadas com sucesso!`,
          "success",
        );
      } else {
        showMessage("Erro ao salvar as regras no banco.", "error");
      }
    } catch (err) {
      showMessage("Erro de conexão com o servidor.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!admin) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gerencie a sua conta e atribua acessos.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* TABS DE NAVEGAÇÃO */}
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
            <UserPlus size={18} /> Novo Administrador
          </button>
          <button
            onClick={() => setActiveTab("sistema")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === "sistema" ? "text-amber-600 border-b-2 border-amber-600 bg-white" : "text-gray-500 hover:text-gray-800"}`}
          >
            Parâmetros (IRPR)
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
                  Nome do Administrador
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
                  Guardar Alterações
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
                  Palavra-passe Atual
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
                  Nova Palavra-passe
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
                  Confirmar Nova Palavra-passe
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
                  Atualizar Segurança
                </button>
              </div>
            </form>
          )}

          {activeTab === "novo_admin" && (
            <form
              onSubmit={handleCriarNovoAdmin}
              className="space-y-6 max-w-xl mx-auto"
            >
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6">
                <p className="text-sm text-blue-800 font-medium">
                  Crie acessos de administração. Os novos administradores terão
                  as mesmas permissões para gerir a plataforma e os contadores.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  placeholder="Nome do administrador..."
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
                  E-mail de Login
                </label>
                <input
                  type="email"
                  placeholder="e-mail"
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
                  Palavra-passe Inicial
                </label>
                <input
                  type="text"
                  placeholder="Defina a senha inicial..."
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
                  Cadastrar Administrador
                </button>
              </div>
            </form>
          )}
          {activeTab === "sistema" && (
            <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-top-2">
              {/* CABEÇALHO COM SELETOR DE ANO */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-50 border border-amber-100 p-5 rounded-xl shadow-sm">
                <div>
                  <h2 className="text-lg font-black text-amber-900">
                    Parâmetros Anuais da Receita Federal
                  </h2>
                  <p className="text-sm text-amber-800/80 font-medium mt-1">
                    As simulações do IRPR e LCDPR respeitarão as regras do ano
                    selecionado.
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-amber-200 shadow-sm shrink-0">
                  <label className="text-xs font-bold text-amber-700 uppercase tracking-wider pl-2">
                    Ano-Base:
                  </label>
                  <select
                    value={anoParametro}
                    onChange={(e) => setAnoParametro(Number(e.target.value))}
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

              {/* BLOCO 1: LIMITES GERAIS */}
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

              {/* BLOCO 2: TABELA PROGRESSIVA IRPF */}
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
                  disabled={isSaving}
                  className="px-8 py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md shadow-slate-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  Publicar Novas Regras de {anoParametro}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
