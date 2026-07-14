import { useState, useEffect } from "react";
import { Users, Building, Activity, Loader2, X, Link, Mail, Phone } from "lucide-react";

export function VisaoGeralSaaS() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("@AgroPops:token");
  
  const [metricas, setMetricas] = useState({ contadoresAtivos: 0, produtoresAtivos: 0, statusSistema: "Verificando..." });
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para os Modais de Listagem
  const [showContadoresModal, setShowContadoresModal] = useState(false);
  const [showProdutoresModal, setShowProdutoresModal] = useState(false);
  
  const [listaContadores, setListaContadores] = useState<any[]>([]);
  const [listaProdutores, setListaProdutores] = useState<any[]>([]);
  const [isLoadingLista, setIsLoadingLista] = useState(false);
  
  // Estado para gerenciar vinculação (carregamento por linha)
  const [isLinkingId, setIsLinkingId] = useState<number | null>(null);

  const fetchMetricas = async () => {
    try {
      const response = await fetch(`${baseUrl}/admins/metricas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) setMetricas(await response.json());
    } catch (error) {
      setMetricas(prev => ({ ...prev, statusSistema: "Instabilidade na Rede" }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricas();
  }, [baseUrl, token]);

  const abrirContadores = async () => {
    setShowContadoresModal(true);
    setIsLoadingLista(true);
    try {
      const res = await fetch(`${baseUrl}/admins/contadores`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setListaContadores(await res.json());
    } catch (err) { console.error(err); } finally { setIsLoadingLista(false); }
  };

  const abrirProdutores = async () => {
    setShowProdutoresModal(true);
    setIsLoadingLista(true);
    try {
      // Busca produtores e contadores (precisamos dos contadores para o dropdown de vínculo)
      const resProd = await fetch(`${baseUrl}/admins/produtores`, { headers: { Authorization: `Bearer ${token}` } });
      const resCont = await fetch(`${baseUrl}/admins/contadores`, { headers: { Authorization: `Bearer ${token}` } });
      
      if (resProd.ok) setListaProdutores(await resProd.json());
      if (resCont.ok) setListaContadores(await resCont.json());
    } catch (err) { console.error(err); } finally { setIsLoadingLista(false); }
  };

  const handleVincularProdutor = async (produtorId: number, novoContadorId: string) => {
    if (!novoContadorId) return;
    setIsLinkingId(produtorId);
    try {
      const res = await fetch(`${baseUrl}/admins/transferir-produtor/${produtorId}/${novoContadorId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        // Atualiza a lista local para refletir a mudança
        const contadorSelecionado = listaContadores.find(c => c.id.toString() === novoContadorId);
        setListaProdutores(prev => prev.map(p => 
          p.id === produtorId 
            ? { ...p, contadorId: parseInt(novoContadorId), contadorNome: contadorSelecionado?.nomeEscritorio } 
            : p
        ));
      } else {
        alert("Erro ao vincular produtor.");
      }
    } catch (error) {
      alert("Falha de conexão.");
    } finally {
      setIsLinkingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Métricas da Plataforma</h1>
        <p className="text-sm text-gray-500 mt-1">Visão global de todos os contadores e produtores.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Contadores */}
        <div 
          onClick={abrirContadores}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-blue-200 hover:-translate-y-1 transition-all group"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Building size={20} />
            </div>
            <h3 className="font-bold text-gray-700">Contadores Ativos</h3>
          </div>
          <div className="text-3xl font-black text-gray-800">
            {isLoading ? <Loader2 size={28} className="animate-spin text-gray-300" /> : metricas.contadoresAtivos}
          </div>
          <p className="text-[10px] uppercase font-bold text-blue-400 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">Ver Lista Completa →</p>
        </div>

        {/* Card Produtores */}
        <div 
          onClick={abrirProdutores}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-emerald-200 hover:-translate-y-1 transition-all group"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Users size={20} />
            </div>
            <h3 className="font-bold text-gray-700">Produtores Ativos</h3>
          </div>
          <div className="text-3xl font-black text-gray-800">
            {isLoading ? <Loader2 size={28} className="animate-spin text-gray-300" /> : metricas.produtoresAtivos}
          </div>
          <p className="text-[10px] uppercase font-bold text-emerald-400 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">Ver Lista Completa →</p>
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

      {/* ======================================================== */}
      {/* MODAL LISTA DE CONTADORES */}
      {showContadoresModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Building className="text-blue-600" /> Escritórios Cadastrados</h2>
              <button onClick={() => setShowContadoresModal(false)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-0 overflow-y-auto flex-1 bg-white">
              {isLoadingLista ? (
                 <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 font-bold">Escritório / Responsável</th>
                      <th className="px-6 py-3 font-bold">Contato</th>
                      <th className="px-6 py-3 font-bold text-right">CRC / Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {listaContadores.map(c => (
                      <tr key={c.id} className="hover:bg-blue-50/30">
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-800">{c.nomeEscritorio}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{c.nomeResponsavel}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-700 flex items-center gap-1.5"><Mail size={14} className="text-gray-400"/> {c.email}</p>
                          <p className="text-sm text-gray-700 flex items-center gap-1.5 mt-1"><Phone size={14} className="text-gray-400"/> {c.telefone}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-mono text-sm text-gray-800">{c.crc}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{c.estado}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL LISTA DE PRODUTORES E VÍNCULOS */}
      {showProdutoresModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Users className="text-emerald-600" /> Produtores e Vínculos</h2>
              <button onClick={() => setShowProdutoresModal(false)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-0 overflow-y-auto flex-1 bg-white">
              {isLoadingLista ? (
                 <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 font-bold">Produtor Rural</th>
                      <th className="px-6 py-3 font-bold">Documentos</th>
                      <th className="px-6 py-3 font-bold">Escritório Vinculado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {listaProdutores.map(p => (
                      <tr key={p.id} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-800">{p.nome}</p>
                        </td>
                        <td className="px-6 py-4 space-y-1">
                          <p className="text-xs font-mono text-gray-600"><span className="font-bold text-gray-400">CPF:</span> {p.cpfCnpj}</p>
                          {p.cnpj && <p className="text-xs font-mono text-gray-600"><span className="font-bold text-gray-400">CNPJ:</span> {p.cnpj}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <select 
                              className={`text-sm font-semibold p-2 rounded-lg border outline-none cursor-pointer flex-1 transition-all ${
                                !p.contadorId 
                                  ? "bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400" 
                                  : "bg-gray-50 text-gray-700 border-gray-200 hover:border-emerald-300"
                              }`}
                              value={p.contadorId || ""}
                              onChange={(e) => handleVincularProdutor(p.id, e.target.value)}
                              disabled={isLinkingId === p.id}
                            >
                              {!p.contadorId && <option value="" disabled>Sem Vínculo (Selecione)</option>}
                              {listaContadores.map(c => (
                                <option key={c.id} value={c.id}>{c.nomeEscritorio}</option>
                              ))}
                            </select>
                            {isLinkingId === p.id && <Loader2 size={18} className="animate-spin text-emerald-600 shrink-0" />}
                            {!p.contadorId && isLinkingId !== p.id && <Link size={16} className="text-amber-500 shrink-0" title="Produtor Independente" />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}