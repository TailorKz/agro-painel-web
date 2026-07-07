import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, Mail, Loader2, ArrowLeft } from "lucide-react";

export function AdminLogin() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${baseUrl}/admins/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      if (response.ok) {
        const data = await response.json();
        
        localStorage.setItem("@AgroPops:token", data.token);
        localStorage.setItem("@AgroPops:user", JSON.stringify(data.admin));
        localStorage.setItem("@AgroPops:userRole", "ADMIN");
        
        navigate("/admin/dashboard");
      } else {
        const errText = await response.text();
        setError(errText || "Credenciais inválidas.");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor central.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decoração de fundo idêntica à identidade AgroPops */}
      <div className="absolute top-0 left-0 w-full h-96 bg-agro-primary rounded-b-[100px] opacity-10 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10">
          
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100">
              <ShieldCheck size={32} className="text-agro-secondary" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">AgroPops <span className="text-agro-secondary">Admin</span></h1>
            <p className="text-gray-500 text-sm mt-1">Acesso restrito à administração.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm font-medium text-center flex items-center justify-center gap-2">
              {error}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-800 rounded-xl outline-none focus:border-agro-light focus:bg-white transition-all placeholder:text-gray-400"
                  placeholder="Digite o e-mail"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-800 rounded-xl outline-none focus:border-agro-light focus:bg-white transition-all placeholder:text-gray-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-agro-secondary hover:bg-agro-primary text-white font-bold rounded-xl transition-colors shadow-md shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : "Acessar Painel"}
            </button>
          </form>
        </div>
        
        <div className="mt-8 flex justify-center">
          <button onClick={() => navigate("/")} className="text-sm font-medium text-gray-500 hover:text-gray-800 flex items-center gap-2 transition-colors">
            <ArrowLeft size={16} /> Voltar para o site principal
          </button>
        </div>
      </div>
    </div>
  );
}