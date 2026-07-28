import { useState, useEffect, useCallback } from "react";
import { Save, Lock, Building, Loader2, CheckCircle, AlertCircle, Truck, Trash2, Plus, X } from "lucide-react";

export function Configuracoes() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("@AgroPops:token");
  const [activeTab, setActiveTab] = useState("perfil");
  const [user, setUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  // Agenda de Fornecedores
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [isFornecedorModalOpen, setIsFornecedorModalOpen] = useState(false);
  const [formFornecedor, setFormFornecedor] = useState({
    nome: "",
    fantasia: "",
    email: "",
    cpfCnpj: "",
    inscricaoEstadual: "",
    endereco: ""
  });
  const [isLoadingFornecedores, setIsLoadingFornecedores] = useState(false);

  useEffect(() => {
    const userStorage = localStorage.getItem("@AgroPops:user");
    if (userStorage) setUser(JSON.parse(userStorage));
  }, []);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const carregarFornecedores = useCallback(async () => {
    if (!user) return;
    setIsLoadingFornecedores(true);
    try {
      const res = await fetch(`${baseUrl}/fornecedores/listar/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setFornecedores(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingFornecedores(false);
    }
  }, [user, baseUrl, token]);

  useEffect(() => {
    if (activeTab === "fornecedores") carregarFornecedores();
  }, [activeTab, carregarFornecedores]);

  // Máscara Universal de CPF/CNPJ
  const maskCpfCnpj = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length <= 11) {
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      v = v.replace(/^(\d{2})(\d)/, "$1.$2");
      v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
      v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
      v = v.replace(/(\d{4})(\d{1,2})$/, "$1-$2");
    }
    return v;
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
    if (novaSenha !== confirmarSenha) return showMessage("As senhas não coincidem.", "error");
    setIsSaving(true);
    try {
      const res = await fetch(`${baseUrl}/contadores/senha/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ senhaAtual, novaSenha })
      });
      if (res.ok) {
        showMessage("Senha alterada!", "success");
        setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("");
      } else {
        showMessage("Erro ao alterar senha.", "error");
      }
    } catch (err) { showMessage("Erro de conexão.", "error"); } finally { setIsSaving(false); }
  };

  const handleAdicionarFornecedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFornecedor.nome) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${baseUrl}/fornecedores/cadastrar/${user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formFornecedor)
      });
      if (res.ok) {
        showMessage("Cadastro salvo com sucesso!", "success");
        setIsFornecedorModalOpen(false);
        setFormFornecedor({ nome: "", fantasia: "", email: "", cpfCnpj: "", inscricaoEstadual: "", endereco: "" });
        carregarFornecedores();
      } else {
        showMessage("Erro ao cadastrar.", "error");
      }
    } catch (err) { showMessage("Erro de conexão.", "error"); } finally { setIsSaving(false); }
  };

  const handleRemoverFornecedor = async (id: number) => {
    if (!window.confirm("Deseja remover este cadastro da agenda?")) return;
    try {
      const res = await fetch(`${baseUrl}/fornecedores/deletar/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setFornecedores(prev => prev.filter(f => f.id !== id));
    } catch (err) { console.error(err); }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Configurações do Escritório</h1>
        <p className="text-sm text-gray-500 mt-1">Gira suas credenciais, segurança e agenda de contatos.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50/50 overflow-x-auto">
          <button onClick={() => setActiveTab("perfil")} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors shrink-0 ${activeTab === "perfil" ? "text-agro-secondary border-b-2 border-agro-secondary bg-white" : "text-gray-500 hover:text-gray-800"}`}>
            <Building size={18} /> Dados do Escritório
          </button>
          <button onClick={() => setActiveTab("senha")} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors shrink-0 ${activeTab === "senha" ? "text-agro-secondary border-b-2 border-agro-secondary bg-white" : "text-gray-500 hover:text-gray-800"}`}>
            <Lock size={18} /> Segurança
          </button>
          <button onClick={() => setActiveTab("fornecedores")} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors shrink-0 ${activeTab === "fornecedores" ? "text-agro-secondary border-b-2 border-agro-secondary bg-white" : "text-gray-500 hover:text-gray-800"}`}>
            <Truck size={18} /> Cadastros (Clientes/Fornecedores)
          </button>
        </div>

        <div className="p-8">
          {message.text && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
              {message.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />} {message.text}
            </div>
          )}

          {activeTab === "perfil" && (
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
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" disabled={isSaving} className="px-6 py-3 bg-agro-secondary hover:bg-agro-primary text-white font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors">
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Guardar Alterações
                </button>
              </div>
            </form>
          )}

          {activeTab === "senha" && (
            <form onSubmit={handleSalvarSenha} className="space-y-6 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nova Palavra-passe</label>
                <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-agro-light" required minLength={6} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Nova Palavra-passe</label>
                <input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-agro-light" required minLength={6} />
              </div>
              <div className="pt-4">
                <button type="submit" disabled={isSaving} className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors">
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />} Atualizar Segurança
                </button>
              </div>
            </form>
          )}

          {activeTab === "fornecedores" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50 border border-emerald-100 p-5 rounded-xl">
                <div>
                  <h3 className="font-bold text-emerald-800 text-sm">Agenda de Clientes e Fornecedores</h3>
                  <p className="text-xs text-emerald-700/80 mt-1">Eles ficarão disponíveis como Sugestões Automáticas no Livro Caixa.</p>
                </div>
                <button 
                  onClick={() => setIsFornecedorModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 shrink-0"
                >
                  <Plus size={16} /> Novo Cadastro
                </button>
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden mt-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-5 py-3 font-medium">Nome / Razão Social</th>
                      <th className="px-5 py-3 font-medium">CPF / CNPJ</th>
                      <th className="px-5 py-3 font-medium text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoadingFornecedores ? (
                      <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400"><Loader2 className="animate-spin inline mr-2" size={18} /> Carregando agenda...</td></tr>
                    ) : fornecedores.length === 0 ? (
                      <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">Nenhum cadastro realizado.</td></tr>
                    ) : (
                      fornecedores.map(f => (
                        <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 text-sm font-bold text-gray-700">
                            {f.nome}
                            {f.fantasia && <span className="block text-xs font-normal text-gray-400 mt-0.5">{f.fantasia}</span>}
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-500 font-mono">{f.cpfCnpj ? maskCpfCnpj(f.cpfCnpj) : "-"}</td>
                          <td className="px-5 py-3 text-right">
                            <button onClick={() => handleRemoverFornecedor(f.id)} className="text-gray-400 hover:text-rose-500 p-1.5 rounded-md hover:bg-rose-50 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MODAL DE NOVO FORNECEDOR/CLIENTE */}
      {isFornecedorModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Truck className="text-emerald-600" /> Cadastrar Cliente/Fornecedor
              </h2>
              <button onClick={() => setIsFornecedorModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-400">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAdicionarFornecedor} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase">Nome ou Razão Social</label>
                <input type="text" required placeholder="Ex: Cooperativa Agro S/A" value={formFornecedor.nome} onChange={e => setFormFornecedor({...formFornecedor, nome: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-emerald-500 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase">Nome Fantasia (Opcional)</label>
                <input type="text" placeholder="Ex: AgroLoja" value={formFornecedor.fantasia} onChange={e => setFormFornecedor({...formFornecedor, fantasia: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-emerald-500 text-sm" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">CPF ou CNPJ</label>
                  <input type="text" placeholder="Apenas números" value={formFornecedor.cpfCnpj} onChange={e => setFormFornecedor({...formFornecedor, cpfCnpj: maskCpfCnpj(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-emerald-500 font-mono text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Insc. Estadual (Opcional)</label>
                  <input type="text" placeholder="Apenas números" value={formFornecedor.inscricaoEstadual} onChange={e => setFormFornecedor({...formFornecedor, inscricaoEstadual: e.target.value.replace(/\D/g, '')})} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-emerald-500 font-mono text-sm" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase">E-mail (Opcional)</label>
                <input type="email" placeholder="contato@empresa.com" value={formFornecedor.email} onChange={e => setFormFornecedor({...formFornecedor, email: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-emerald-500 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase">Endereço Completo (Opcional)</label>
                <input type="text" placeholder="Rua, Número, Cidade - Estado" value={formFornecedor.endereco} onChange={e => setFormFornecedor({...formFornecedor, endereco: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-emerald-500 text-sm" />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsFornecedorModalOpen(false)} disabled={isSaving} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm flex items-center gap-2">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : "Salvar Cadastro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}