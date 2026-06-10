import { useState } from 'react';
import { Plus, Search, MoreVertical, UploadCloud, FileBadge, X } from 'lucide-react';
import { useProducer } from '../context/ProducerContext';

export function Produtores() {
  const { producersList } = useProducer();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* HEADER DA TELA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gerenciar Produtores</h1>
          <p className="text-sm text-gray-500 mt-1">Carteira de clientes e certificados digitais.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-agro-secondary hover:bg-agro-primary text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus size={20} />
          Novo Produtor
        </button>
      </div>

      {/* BARRA DE BUSCA E FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por nome, CPF ou CNPJ..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-agro-light focus:ring-2 focus:ring-agro-light/20 transition-all text-sm"
          />
        </div>
        <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Filtros Avançados
        </button>
      </div>

      {/* TABELA DE PRODUTORES */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
              <th className="px-6 py-4 font-medium">Nome / Propriedade</th>
              <th className="px-6 py-4 font-medium">Documento</th>
              <th className="px-6 py-4 font-medium">Inscrição Estadual</th>
              <th className="px-6 py-4 font-medium">Certificado A1</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {producersList.map((producer) => (
              <tr key={producer.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-semibold text-gray-800">{producer.name}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600 font-mono">{producer.document}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600 font-mono">{producer.ie}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full w-fit">
                    <FileBadge size={14} />
                    <span className="text-xs font-semibold">Ativo (Vence em 120 dias)</span>
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
      </div>

      {/* MODAL DE NOVO PRODUTOR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Cadastrar Novo Produtor</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Dados Principais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Nome Completo / Propriedade</label>
                    <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-agro-light focus:ring-2 focus:ring-agro-light/20 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">CPF ou CNPJ</label>
                    <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-agro-light focus:ring-2 focus:ring-agro-light/20 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Inscrição Estadual (Obrigatório)</label>
                    <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-agro-light focus:ring-2 focus:ring-agro-light/20 outline-none" />
                  </div>
                </div>
              </div>

              {/* Upload de Certificado */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Integração SEFAZ</h3>
                
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group">
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-agro-secondary group-hover:scale-110 transition-transform">
                    <UploadCloud size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-800">Clique ou arraste o Certificado A1 (.pfx)</p>
                    <p className="text-xs text-gray-500 mt-1">Necessário para importar XMLs e emitir notas.</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Senha do Certificado</label>
                  <input type="password" placeholder="••••••••" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-agro-light focus:ring-2 focus:ring-agro-light/20 outline-none" />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                Cancelar
              </button>
              <button className="px-5 py-2.5 text-sm font-medium text-white bg-agro-secondary hover:bg-agro-primary rounded-xl transition-colors shadow-sm">
                Salvar e Sincronizar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}