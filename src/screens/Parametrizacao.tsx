import { useState } from 'react';
import { Plus, Search, MoreVertical, SlidersHorizontal, Check, X } from 'lucide-react';

// Tipagem das regras fiscais
type NcmRule = {
  id: string;
  ncm: string;
  description: string;
  category: string;
  isDeductible: boolean;
};

// Dados mockados simulando a tabela real do contador
const initialRules: NcmRule[] = [
  { id: '1', ncm: '3105.10.00', description: 'Fertilizantes e Adubos Minerais', category: 'Insumos', isDeductible: true },
  { id: '2', ncm: '3808.91.00', description: 'Inseticidas e Defensivos Agrícolas', category: 'Insumos', isDeductible: true },
  { id: '3', ncm: '2710.19.21', description: 'Óleo Diesel (Combustível)', category: 'Uso e Consumo', isDeductible: true },
  { id: '4', ncm: '8701.90.90', description: 'Tratores Agrícolas', category: 'Máquinas', isDeductible: true },
  { id: '5', ncm: '8528.72.00', description: 'Aparelhos Receptores de Televisão', category: 'Despesa Pessoal', isDeductible: false },
  { id: '6', ncm: '2203.00.00', description: 'Cerveja de Malte', category: 'Despesa Pessoal', isDeductible: false },
];

export function Parametrizacao() {
  const [searchTerm, setSearchTerm] = useState('');
  const [rules, setRules] = useState<NcmRule[]>(initialRules);

  // Função para alternar entre Dedutível e Não Dedutível
  const toggleDeductible = (id: string) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, isDeductible: !rule.isDeductible } : rule
    ));
  };

  // Filtra a lista com base na busca do contador
  const filteredRules = rules.filter(rule => 
    rule.ncm.includes(searchTerm) || 
    rule.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER DA TELA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Regras de NCM (LCDPR)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure a classificação automática para o Livro Caixa do Produtor.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-agro-secondary hover:bg-agro-primary text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm">
          <Plus size={20} />
          Nova Regra Fiscal
        </button>
      </div>

      {/* BARRA DE BUSCA E FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Pesquisar por código NCM ou descrição do produto..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-agro-light focus:ring-2 focus:ring-agro-light/20 transition-all text-sm"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          <SlidersHorizontal size={16} />
          Filtros
        </button>
      </div>

      {/* TABELA DE REGRAS (NCM) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
              <th className="px-6 py-4 font-medium">Código NCM</th>
              <th className="px-6 py-4 font-medium">Descrição do Produto</th>
              <th className="px-6 py-4 font-medium">Categoria</th>
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
                  <p className="text-sm font-medium text-gray-700">{rule.description}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {rule.category}
                  </span>
                </td>
                
                {/* COLUNA DO SWITCH DE DEDUTIBILIDADE */}
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <button
                      onClick={() => toggleDeductible(rule.id)}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                        rule.isDeductible ? 'bg-agro-secondary' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-300 flex items-center justify-center shadow-sm ${
                          rule.isDeductible ? 'translate-x-8' : 'translate-x-1'
                        }`}
                      >
                        {rule.isDeductible ? (
                          <Check size={12} className="text-agro-secondary" />
                        ) : (
                          <X size={12} className="text-gray-400" />
                        )}
                      </span>
                    </button>
                  </div>
                </td>

                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* MENSAGEM DE LISTA VAZIA */}
        {filteredRules.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Nenhuma regra encontrada para "{searchTerm}".
          </div>
        )}
      </div>
    </div>
  );
}