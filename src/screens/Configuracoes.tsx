import { useState, useEffect } from "react";
import { Save, Lock, Building, Loader2, CheckCircle, AlertCircle, User } from "lucide-react";

export function Configuracoes() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("@AgroPops:token");
  
  const [activeTab, setActiveTab] = useState("perfil");
  const [user, setUser] = useState<any>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Campos de Senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  useEffect(() => {
    const userStorage = localStorage.getItem("@AgroPops:user");
    if (userStorage) setUser(JSON.parse(userStorage));
  }, []);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`${baseUrl}/contadores/perfil/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(user)
      });

      if (res.ok) {
        const atualizado = await res.json();
        localStorage.setItem("@AgroPops:user", JSON.stringify(atualizado));
        setUser(atualizado);
        showMessage("Perfil atualizado com sucesso!", "success");
      } else {
        showMessage("Erro ao atualizar perfil.", "error");
      }
    } catch (err) {
      showMessage("Erro de conexão.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSalvarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) {
      return showMessage("As novas palavras-passes não coincidem.", "error");
    }

    setIsSaving(true);
    try {
      const res = await fetch(`${baseUrl}/contadores/senha/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ senhaAtual, novaSenha })
      });

      if (res.ok) {
        showMessage("Palavra-passe alterada com segurança!", "success");
        setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("");
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

  if (!user) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Configurações do Escritório</h1>
        <p className="text-sm text-gray-500 mt-1">Gira as suas credenciais e os dados da sua contabilidade.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          <button onClick={() => setActiveTab("perfil")} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === "perfil" ? "text-agro-secondary border-b-2 border-agro-secondary bg-white" : "text-gray-500 hover:text-gray-800"}`}>
            <Building size={18} /> Dados do Escritório
          </button>
          <button onClick={() => setActiveTab("senha")} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === "senha" ? "text-agro-secondary border-b-2 border-agro-secondary bg-white" : "text-gray-500 hover:text-gray-800"}`}>
            <Lock size={18} /> Segurança
          </button>
        </div>

        <div className="p-8">
          {message.text && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
              {message.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />} {message.text}
            </div>
          )}

          {activeTab === "perfil" ? (
            <form onSubmit={handleSalvarPerfil} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Escritório</label>
                  <input type="text" value={user.nomeEscritorio} onChange={e => setUser({...user, nomeEscritorio: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-agro-light" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Responsável</label>
                  <input type="text" value={user.nomeResponsavel} onChange={e => setUser({...user, nomeResponsavel: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-agro-light" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CRC</label>
                  <input type="text" value={user.crc} onChange={e => setUser({...user, crc: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-agro-light" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                  <input type="text" value={user.estado} onChange={e => setUser({...user, estado: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-agro-light" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                  <input type="text" value={user.telefone} onChange={e => setUser({...user, telefone: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-agro-light" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                  <input type="email" value={user.email} onChange={e => setUser({...user, email: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-agro-light" required />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" disabled={isSaving} className="px-6 py-3 bg-agro-secondary hover:bg-agro-primary text-white font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors">
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Guardar Alterações
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSalvarSenha} className="space-y-6 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Palavra-passe Atual</label>
                <input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-agro-light" placeholder="••••••••" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nova Palavra-passe</label>
                <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-agro-light" placeholder="••••••••" required minLength={6} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Nova Palavra-passe</label>
                <input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-agro-light" placeholder="••••••••" required minLength={6} />
              </div>
              <div className="pt-4">
                <button type="submit" disabled={isSaving} className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors">
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />} Atualizar Segurança
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}