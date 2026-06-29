import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, MoreVertical, SlidersHorizontal, Check, X, AlertCircle, Loader2, Trash2, Edit2 } from 'lucide-react';

type RegraNCM = {
  id: number;
  ncm: string;
  descricao: string;
  isDedutivel: boolean;
};

export function Parametrizacao() {
  const [searchTerm, setSearchTerm] = useState('');
  const [rules, setRules] = useState<RegraNCM[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  // Estados do Modal Unificado (Nova/Editar Regra)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null); // <-- NOVO: Controla se estamos a editar
  const [novoNcm, setNovoNcm] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoIsDedutivel, setNovoIsDedutivel] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mensagem, setMensagem] = useState({ text: '', type: '' });

  const contadorData = JSON.parse(localStorage.getItem('@AgroPops:contador') || '{}');
  const contadorId = contadorData.id;
  const baseUrl = import.meta.env.VITE_API_URL;

  const carregarRegras = useCallback(async () => {
    if (!contadorId) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('@AgroPops:token');
      const response = await fetch(`${baseUrl}/regras/listar/${contadorId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const dados = await response.json();
        setRules(dados);
      }
    } catch (error) {
      console.error("Erro ao buscar regras:", error);
    } finally {
      setIsLoading(false);
    }
  }, [contadorId]);

  useEffect(() => {
    carregarRegras();
  }, [carregarRegras]);

  // Função para fechar e limpar o Modal
  const fecharModal = () => {
    setIsModalOpen(false);
    setEditingRuleId(null);
    setNovoNcm('');
    setNovaDescricao('');
    setNovoIsDedutivel(true);
    setMensagem({ text: '', type: '' });
  };

  // Função para abrir o Modal no modo EDIÇÃO
  const abrirModalEdicao = (rule: RegraNCM) => {
    setEditingRuleId(rule.id);
    setNovoNcm(rule.ncm);
    setNovaDescricao(rule.descricao);
    setNovoIsDedutivel(rule.isDedutivel);
    setIsModalOpen(true);
    setMenuOpenId(null); // Fecha o dropdown
  };

  // SALVAR OU ATUALIZAR REGRA
  const handleSalvarRegra = async () => {
    if (!novoNcm || !novaDescricao) {
      setMensagem({ text: 'Preencha o NCM e a Descrição.', type: 'error' });
      return;
    }

    setIsSaving(true);
    setMensagem({ text: '', type: '' });

    try {
      const token = localStorage.getItem('@AgroPops:token');
      const isEditing = editingRuleId !== null;
      
      // Define a rota e o método dependendo se esta editando ou criando
      const url = isEditing 
        ? `${baseUrl}/regras/editar/${editingRuleId}`
        : `${baseUrl}/regras/cadastrar/${contadorId}`;
        
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          ncm: novoNcm,
          descricao: novaDescricao,
          isDedutivel: novoIsDedutivel
        })
      });

      if (response.ok) {
        setMensagem({ text: isEditing ? 'Regra atualizada com sucesso!' : 'Regra salva com sucesso!', type: 'success' });
        setTimeout(() => {
          fecharModal();
          carregarRegras();
        }, 1500);
      } else {
        const erroMsg = await response.text();
        setMensagem({ text: erroMsg, type: 'error' });
      }
    } catch (error) {
      setMensagem({ text: 'Erro de comunicação com o servidor.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // EXCLUIR REGRA
  const handleExcluirRegra = async (id: number) => {
    if (!window.confirm("Tem a certeza que deseja excluir esta regra?")) return;
    try {
      const token = localStorage.getItem('@AgroPops:token');
      const response = await fetch(`${baseUrl}/regras/excluir/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        carregarRegras();
      } else {
        alert("Erro ao excluir a regra.");
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const filteredRules = rules.filter(rule => 
    rule.ncm.includes(searchTerm) || 
    rule.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Regras de NCM (LCDPR)</h1>
          <p className="text-sm text-gray-500 mt-1">Configure a classificação automática para o Livro Caixa do Produtor.</p>
        </div>
        <button 
          onClick={() => { fecharModal(); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-agro-secondary hover:bg-agro-primary text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus size={20} />
          Nova Regra Fiscal
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" placeholder="Pesquisar por código NCM ou descrição do produto..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-agro-light focus:ring-2 focus:ring-agro-light/20 transition-all text-sm"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          <SlidersHorizontal size={16} /> Filtros
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Buscando regras no servidor...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                <th className="px-6 py-4 font-medium">Código NCM</th>
                <th className="px-6 py-4 font-medium">Descrição do Produto</th>
                <th className="px-6 py-4 font-medium text-center">Abate Imposto? (Dedutível)</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                      {rule.ncm}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-700">{rule.descricao}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${rule.isDedutivel ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {rule.isDedutivel ? <Check size={14} /> : <X size={14} />}
                        {rule.isDedutivel ? 'Dedutível' : 'Não Dedutível'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-block text-left">
                      <button 
                        onClick={() => setMenuOpenId(menuOpenId === rule.id ? null : rule.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {menuOpenId === rule.id && (
                        <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden flex flex-col">
                          <button 
                            onClick={() => abrirModalEdicao(rule)}
                            className="px-4 py-2.5 text-sm text-left font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                          >
                            <Edit2 size={16} /> Editar Regra
                          </button>
                          <div className="h-px bg-gray-100 w-full" />
                          <button 
                            onClick={() => { setMenuOpenId(null); handleExcluirRegra(rule.id); }}
                            className="px-4 py-2.5 text-sm text-left font-medium text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2"
                          >
                            <Trash2 size={16} /> Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        {!isLoading && filteredRules.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Nenhuma regra encontrada. Adicione uma nova regra para classificar as notas automaticamente.
          </div>
        )}
      </div>

      {/* MODAL UNIFICADO (NOVA / EDITAR REGRA) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                {editingRuleId ? 'Editar Regra de NCM' : 'Nova Regra de NCM'}
              </h2>
              <button onClick={fecharModal} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {mensagem.text && (
                <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border ${mensagem.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  <AlertCircle size={18} /> {mensagem.text}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Código NCM (Apenas números)</label>
                <input 
                  type="text" placeholder="Ex: 31051000" value={novoNcm}
                  onChange={(e) => setNovoNcm(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-agro-light focus:ring-2"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Descrição do Produto</label>
                <input 
                  type="text" placeholder="Ex: Fertilizantes e Adubos Minerais" value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-agro-light focus:ring-2"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${novoIsDedutivel ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 shadow-sm ${novoIsDedutivel ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Abate Imposto (Dedutível)</p>
                    <p className="text-xs text-gray-500">A nota entrará como despesa no Livro Caixa.</p>
                  </div>
                  <input 
                    type="checkbox" className="hidden" 
                    checked={novoIsDedutivel}
                    onChange={() => setNovoIsDedutivel(!novoIsDedutivel)}
                  />
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
              <button 
                onClick={fecharModal} disabled={isSaving}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSalvarRegra} disabled={isSaving}
                className="px-5 py-2.5 text-sm font-medium text-white bg-agro-secondary hover:bg-agro-primary rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? <><Loader2 size={18} className="animate-spin" /> Salvando...</> : (editingRuleId ? 'Atualizar Regra' : 'Salvar Regra')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}