import { useState } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  UploadCloud,
  FileBadge,
  X,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Trash2,
  MapPin
} from "lucide-react";
import { useProducer } from "../context/ProducerContext";

// Tipo auxiliar para a tela
type PropriedadeForm = {
  id: number;
  nome: string;
  inscricaoEstadual: string;
  caepf: string;
  percentualParticipacao: number | string;
};

export function Produtores() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const { producersList, carregarProdutores } = useProducer();

  // Controle do Modal e do Wizard
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Estados do Formulário - Etapa 1
  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");

  // Estados do Formulário - Etapa 2 (Lista Dinâmica)
  const [propriedades, setPropriedades] = useState<PropriedadeForm[]>([
    { id: Date.now(), nome: "Propriedade Principal", inscricaoEstadual: "", caepf: "", percentualParticipacao: 100 }
  ]);

  // Estados do Formulário - Etapa 3
  const [senhaCertificado, setSenhaCertificado] = useState("");
  const [certificado, setCertificado] = useState<File | null>(null);

  // Estados de Carregamento e Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentStep(1);
    setNome("");
    setCpfCnpj("");
    setCnpj("");
    setTelefone("");
    setPropriedades([{ id: Date.now(), nome: "Propriedade Principal", inscricaoEstadual: "", caepf: "", percentualParticipacao: 100 }]);
    setSenhaCertificado("");
    setCertificado(null);
    setMessage({ text: "", type: "" });
  };

  // Funções de manipulação da Lista Dinâmica (Etapa 2)
  const adicionarPropriedade = () => {
    setPropriedades([
      ...propriedades,
      { id: Date.now(), nome: `Propriedade ${propriedades.length + 1}`, inscricaoEstadual: "", caepf: "", percentualParticipacao: 50 }
    ]);
  };

  const removerPropriedade = (id: number) => {
    if (propriedades.length === 1) return; // Não deixa excluir se só tiver 1
    setPropriedades(propriedades.filter(p => p.id !== id));
  };

  const atualizarPropriedade = (id: number, campo: keyof PropriedadeForm, valor: string | number) => {
    setPropriedades(propriedades.map(p => p.id === id ? { ...p, [campo]: valor } : p));
  };

  const avancarEtapa = () => {
    if (currentStep === 1) {
      if (!nome || !cpfCnpj) {
        setMessage({ text: "Preencha Nome e CPF para avançar.", type: "error" });
        return;
      }
    }
    if (currentStep === 2) {
      const temInvalida = propriedades.some(p => !p.nome || !p.percentualParticipacao);
      if (temInvalida) {
        setMessage({ text: "Todas as propriedades precisam de Nome e Percentual (%).", type: "error" });
        return;
      }
    }
    setMessage({ text: "", type: "" });
    setCurrentStep(prev => prev + 1);
  };

  // Conexão com o Spring Boot para Salvar Produtor
  const handleSalvar = async () => {
    const contadorData = localStorage.getItem("@AgroPops:contador");
    if (!contadorData) return;
    
    const contadorId = JSON.parse(contadorData).id;
    const formData = new FormData();
    
    formData.append("nome", nome);
    formData.append("cpfCnpj", cpfCnpj);
    if (cnpj) formData.append("cnpj", cnpj);
    if (telefone) formData.append("telefone", telefone);
    formData.append("contadorId", contadorId);

    // TRUQUE DO JSON: Converte a lista do React em Texto para o Java ler!
    const propriedadesLimpas = propriedades.map(p => ({
      nome: p.nome,
      inscricaoEstadual: p.inscricaoEstadual,
      caepf: p.caepf,
      percentualParticipacao: parseFloat(p.percentualParticipacao.toString())
    }));
    formData.append("propriedades", JSON.stringify(propriedadesLimpas));

    if (senhaCertificado) formData.append("senhaCertificado", senhaCertificado);
    if (certificado) formData.append("certificado", certificado);

    setIsLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const token = localStorage.getItem("@AgroPops:token");
      const response = await fetch(`${baseUrl}/produtores/cadastrar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        setMessage({ text: "Produtor e Fazendas salvos com sucesso!", type: "success" });
        setTimeout(() => {
          handleCloseModal();
          carregarProdutores();
        }, 2000);
      } else {
        const errorMsg = await response.text();
        setMessage({ text: errorMsg, type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Erro de comunicação com o servidor.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER DA TELA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gerenciar Produtores</h1>
          <p className="text-sm text-gray-500 mt-1">Carteira de clientes, imóveis rurais e certificados digitais.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-agro-secondary hover:bg-agro-primary text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus size={20} /> Novo Produtor
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou CNPJ..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-agro-light transition-all text-sm"
          />
        </div>
      </div>

      {/* TABELA DE PRODUTORES */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
              <th className="px-6 py-4 font-medium">Nome / Contato</th>
              <th className="px-6 py-4 font-medium">CPF (Login)</th>
              <th className="px-6 py-4 font-medium">Fazendas/Imóveis</th>
              <th className="px-6 py-4 font-medium">Certificado A1</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {producersList.map((producer: any) => (
              <tr key={producer.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-semibold text-gray-800">{producer.nome || producer.name}</p>
                  {producer.telefone && <p className="text-xs text-gray-500 mt-0.5">{producer.telefone}</p>}
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-600 font-mono">{producer.cpfCnpj || producer.document}</p>
                  {producer.cnpj && <p className="text-xs text-gray-400 font-mono mt-0.5">CNPJ: {producer.cnpj}</p>}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-lg w-fit border border-gray-200">
                    <MapPin size={14} className="text-emerald-600"/>
                    <span className="font-bold">{producer.propriedades?.length || 1}</span> Imóvel(is)
                  </div>
                </td>
                <td className="px-6 py-4">
                  {producer.validadeCertificado ? (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full w-fit">
                      <FileBadge size={14} />
                      <span className="text-xs font-semibold">Ativo</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400 bg-gray-50 px-3 py-1 rounded-full w-fit">
                      <FileBadge size={14} />
                      <span className="text-xs font-semibold">Pendente</span>
                    </div>
                  )}
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

      {/* MODAL WIZARD DE NOVO PRODUTOR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Cabecalho Modal */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Novo Produtor Rural</h2>
                <div className="flex items-center gap-2 mt-2">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${currentStep === step ? 'bg-agro-secondary text-white' : currentStep > step ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                        {currentStep > step ? <CheckCircle size={12} /> : step}
                      </div>
                      {step < 3 && <div className={`w-8 h-1 rounded-full ${currentStep > step ? 'bg-emerald-100' : 'bg-gray-100'}`} />}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                <X size={20} />
              </button>
            </div>

            {/* Conteudo Rolável */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/30">
              
              {message.text && (
                <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border ${message.type === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                  {message.type === "error" ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                  {message.text}
                </div>
              )}

              {/* ETAPA 1: DADOS PESSOAIS */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Passo 1: Dados Pessoais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Nome do Produtor</label>
                      <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-agro-light outline-none" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">CPF (Obrigatório / Login)</label>
                      <input type="text" value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value.replace(/\D/g, ""))} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-agro-light outline-none" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">CNPJ Rural (Opcional)</label>
                      <input type="text" value={cnpj} onChange={(e) => setCnpj(e.target.value.replace(/\D/g, ""))} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-agro-light outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Telefone / WhatsApp</label>
                      <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ""))} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-agro-light outline-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* ETAPA 2: PROPRIEDADES RURAIS */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <MapPin className="text-blue-600 mt-1 shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold text-blue-800">Passo 2: Exploração Conjunta</h3>
                      <p className="text-xs text-blue-700/80 mt-1 leading-relaxed">Cadastre as fazendas e a cota-parte deste produtor (condomínio, arrendamento). As notas fiscais vindas da SEFAZ serão rateadas automaticamente de acordo com o percentual (%).</p>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    {propriedades.map((prop, index) => (
                      <div key={prop.id} className="p-4 bg-white border border-gray-200 rounded-xl relative shadow-sm">
                        {propriedades.length > 1 && (
                          <button onClick={() => removerPropriedade(prop.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors">
                            <X size={12} />
                          </button>
                        )}
                        <div className="grid grid-cols-12 gap-3 items-end">
                          <div className="col-span-12 md:col-span-4">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Nome da Propriedade</label>
                            <input type="text" value={prop.nome} onChange={(e) => atualizarPropriedade(prop.id, 'nome', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-agro-light" />
                          </div>
                          <div className="col-span-6 md:col-span-3">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Inscrição Est. (IE)</label>
                            <input type="text" value={prop.inscricaoEstadual} onChange={(e) => atualizarPropriedade(prop.id, 'inscricaoEstadual', e.target.value.replace(/\D/g, ''))} placeholder="Opcional" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-agro-light" />
                          </div>
                          <div className="col-span-6 md:col-span-3">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">CAEPF</label>
                            <input type="text" value={prop.caepf} onChange={(e) => atualizarPropriedade(prop.id, 'caepf', e.target.value.replace(/\D/g, ''))} placeholder="Opcional" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-agro-light" />
                          </div>
                          <div className="col-span-12 md:col-span-2 relative">
                            <label className="text-[10px] font-bold text-emerald-600 uppercase">Sua Cota %</label>
                            <input type="number" min="0" max="100" value={prop.percentualParticipacao} onChange={(e) => atualizarPropriedade(prop.id, 'percentualParticipacao', e.target.value)} className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50 text-emerald-800 font-bold rounded-lg text-sm outline-none focus:border-emerald-500 text-center" />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button type="button" onClick={adicionarPropriedade} className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 font-semibold rounded-xl hover:border-agro-secondary hover:text-agro-secondary hover:bg-emerald-50/50 transition-all flex items-center justify-center gap-2 text-sm mt-4">
                      <Plus size={16} /> Adicionar Outra Fazenda/Imóvel
                    </button>
                  </div>
                </div>
              )}

              {/* ETAPA 3: CERTIFICADO DIGITAL */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Passo 3: Conexão SEFAZ (Opcional)</h3>
                  
                  <label className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-white hover:bg-gray-50 transition-colors cursor-pointer group">
                    <input type="file" accept=".pfx,.p12" className="hidden" onChange={(e) => setCertificado(e.target.files ? e.target.files[0] : null)} />
                    <div className={`w-14 h-14 rounded-full shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 ${certificado ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                      {certificado ? <CheckCircle size={28} /> : <UploadCloud size={28} />}
                    </div>
                    <div className="text-center">
                      <p className={`text-sm font-bold ${certificado ? "text-emerald-700" : "text-gray-600"}`}>
                        {certificado ? `Anexado: ${certificado.name}` : "Clique para anexar o Certificado A1 (.pfx)"}
                      </p>
                      {!certificado && <p className="text-xs text-gray-500 mt-1">Poderá ser inserido posteriormente nas configurações.</p>}
                    </div>
                  </label>

                  <div className="space-y-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <label className="text-sm font-medium text-gray-700">Senha do Certificado</label>
                    <input
                      type="password"
                      placeholder="Senha do arquivo .pfx..."
                      value={senhaCertificado}
                      onChange={(e) => setSenhaCertificado(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-agro-light outline-none"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* RODAPÉ E BOTÕES DE NAVEGAÇÃO */}
            <div className="p-6 border-t border-gray-100 bg-white flex items-center justify-between">
              {currentStep > 1 ? (
                <button onClick={() => setCurrentStep(prev => prev - 1)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-1">
                  <ChevronLeft size={16} /> Voltar
                </button>
              ) : (
                <button onClick={handleCloseModal} className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
                  Cancelar
                </button>
              )}

              {currentStep < 3 ? (
                <button onClick={avancarEtapa} className="px-6 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors flex items-center gap-2">
                  Próxima Etapa <ChevronRight size={16} />
                </button>
              ) : (
                <button onClick={handleSalvar} disabled={isLoading} className="px-6 py-2.5 text-sm font-bold text-white bg-agro-secondary hover:bg-agro-primary rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
                  {isLoading ? "Salvando..." : "Finalizar Cadastro"} <CheckCircle size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}