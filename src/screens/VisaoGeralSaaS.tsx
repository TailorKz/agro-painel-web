import { useState, useEffect } from "react";
import { Users, Building, Activity, Loader2 } from "lucide-react";

export function VisaoGeralSaaS() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("@AgroPops:token");

  const [metricas, setMetricas] = useState({ contadoresAtivos: 0, produtoresAtivos: 0, statusSistema: "Verificando..." });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetricas = async () => {
      try {
        const response = await fetch(`${baseUrl}/admins/metricas`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setMetricas(data);
        }
      } catch (error) {
        console.error("Erro ao buscar métricas:", error);
        setMetricas(prev => ({ ...prev, statusSistema: "Instabilidade na Rede" }));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetricas();
  }, [baseUrl, token]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Métricas da Plataforma</h1>
        <p className="text-sm text-gray-500 mt-1">Visão global de todos os contadores e produtores.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Contadores */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building size={20} />
            </div>
            <h3 className="font-bold text-gray-700">Contadores Ativos</h3>
          </div>
          <div className="text-3xl font-black text-gray-800">
            {isLoading ? <Loader2 size={28} className="animate-spin text-gray-300" /> : metricas.contadoresAtivos}
          </div>
        </div>

        {/* Card Produtores */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <h3 className="font-bold text-gray-700">Produtores Ativos</h3>
          </div>
          <div className="text-3xl font-black text-gray-800">
            {isLoading ? <Loader2 size={28} className="animate-spin text-gray-300" /> : metricas.produtoresAtivos}
          </div>
        </div>

        {/* Card Status */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Activity size={20} />
            </div>
            <h3 className="font-bold text-gray-700">Status do Sistema</h3>
          </div>
          <div className={`text-lg font-bold ${metricas.statusSistema.includes("Online") ? "text-emerald-500" : "text-amber-500"}`}>
            {isLoading ? <Loader2 size={24} className="animate-spin text-gray-300" /> : metricas.statusSistema}
          </div>
        </div>
      </div>
    </div>
  );
}