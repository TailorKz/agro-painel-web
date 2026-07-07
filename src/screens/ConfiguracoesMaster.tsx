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

  const [activeTab, setActiveTab] = useState<"perfil" | "senha" | "novo_admin">(
    "perfil",
  );
  const [admin, setAdmin] = useState<any>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

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

  if (!admin) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Configurações
        </h1>
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
                  Crie acessos de administração. Os novos
                  administradores terão as mesmas permissões para gerir a
                  plataforma e os contadores.
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
        </div>
      </div>
    </div>
  );
}
