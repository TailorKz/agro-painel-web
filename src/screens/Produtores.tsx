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
} from "lucide-react";
import { useProducer } from "../context/ProducerContext";

export function Produtores() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const { producersList, carregarProdutores } = useProducer();

  // Controlo do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados do Formulário
  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [senhaCertificado, setSenhaCertificado] = useState("");
  const [certificado, setCertificado] = useState<File | null>(null);

  // Estados de Carregamento e Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" }); // type: 'error' | 'success'

  // Função para limpar o formulário ao fechar
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNome("");
    setCpfCnpj("");
    setInscricaoEstadual("");
    setSenhaCertificado("");
    setCertificado(null);
    setMessage({ text: "", type: "" });
  };

  // Conexão com o Spring Boot para Salvar Produtor e Certificado
  const handleSalvar = async () => {
    // exige apenas os dados cadastrais básicos
    if (!nome || !cpfCnpj || !inscricaoEstadual) {
      setMessage({
        text: "Por favor, preencha os dados principais (Nome, CPF/CNPJ e IE).",
        type: "error",
      });
      return;
    }

   const contadorData = localStorage.getItem("@AgroPops:contador");
    if (!contadorData) {
      setMessage({
        text: "Erro de sessão. Por favor, faça login novamente.",
        type: "error",
      });
      return;
    }
    const contadorId = JSON.parse(contadorData).id;

    const formData = new FormData();
    formData.append("nome", nome);
    formData.append("cpfCnpj", cpfCnpj);
    formData.append("inscricaoEstadual", inscricaoEstadual);
    formData.append("contadorId", contadorId);

    // só envia a senha se o utilizador a tiver preenchido
    if (senhaCertificado) {
      formData.append("senhaCertificado", senhaCertificado);
    }

    // só anexa o ficheiro se ele foi selecionado
    if (certificado) {
      formData.append("certificado", certificado);
    }

    setIsLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const token = localStorage.getItem('@AgroPops:token');
      
      const response = await fetch(`${baseUrl}/produtores/cadastrar`, {
        method: "POST",
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
        },
      );

      if (response.ok) {
        setMessage({
          text: "Produtor e certificado salvos com sucesso!",
          type: "success",
        });
        setTimeout(() => {
          handleCloseModal();
          carregarProdutores();
        }, 2000);
      } else {
        const errorMsg = await response.text();
        setMessage({ text: errorMsg, type: "error" });
      }
    } catch (error) {
      console.error("Erro no envio:", error);
      setMessage({
        text: "Erro de comunicação com o servidor.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER DA TELA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Gerenciar Produtores
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Carteira de clientes e certificados digitais.
          </p>
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
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
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
              <th className="px-6 py-4 font-medium">IE</th>
              <th className="px-6 py-4 font-medium">Certificado A1</th>
              <th className="px-6 py-4 font-medium">Validade</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {producersList.map((producer) => (
              <tr
                key={producer.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <p className="font-semibold text-gray-800">{producer.name || producer.nome}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600 font-mono">
                    {producer.document || producer.cpfCnpj}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600 font-mono">
                    {producer.ie || producer.inscricaoEstadual}
                  </span>
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
                <td className="px-6 py-4">
                  {producer.validadeCertificado ? (
                    <span className="text-sm text-gray-800 font-medium">
                      {new Date(producer.validadeCertificado).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
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

      {/* MODAL DE NOVO PRODUTOR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                Cadastrar Novo Produtor
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Alertas de Feedback */}
              {message.text && (
                <div
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border ${
                    message.type === "error"
                      ? "bg-rose-50 border-rose-200 text-rose-700"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  }`}
                >
                  {message.type === "error" ? (
                    <AlertCircle size={18} />
                  ) : (
                    <CheckCircle size={18} />
                  )}
                  {message.text}
                </div>
              )}

              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                  Dados Principais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      Nome Completo / Propriedade
                    </label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-agro-light focus:ring-2 focus:ring-agro-light/20 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      CPF ou CNPJ
                    </label>
                    <input
                      type="text"
                      value={cpfCnpj}
                      onChange={(e) => setCpfCnpj(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-agro-light focus:ring-2 focus:ring-agro-light/20 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      IE (Inscrição Estadual)
                    </label>
                    <input
                      type="text"
                      value={inscricaoEstadual}
                      onChange={(e) => setInscricaoEstadual(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-agro-light focus:ring-2 focus:ring-agro-light/20 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Upload de Certificado */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                  Integração SEFAZ
                </h3>

                <label className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group">
                  <input
                    type="file"
                    accept=".pfx,.p12"
                    className="hidden"
                    onChange={(e) =>
                      setCertificado(e.target.files ? e.target.files[0] : null)
                    }
                  />
                  <div
                    className={`w-12 h-12 rounded-full shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 ${
                      certificado
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-white text-agro-secondary"
                    }`}
                  >
                    {certificado ? (
                      <CheckCircle size={24} />
                    ) : (
                      <UploadCloud size={24} />
                    )}
                  </div>
                  <div className="text-center">
                    <p
                      className={`text-sm font-medium ${certificado ? "text-emerald-700" : "text-gray-800"}`}
                    >
                      {certificado
                        ? `Ficheiro selecionado: ${certificado.name}`
                        : "Clique para anexar o Certificado A1 (.pfx)"}
                    </p>
                    {!certificado && (
                      <p className="text-xs text-gray-500 mt-1">
                        Opcional agora. Poderá anexar mais tarde para buscar notas automáticas.
                      </p>
                    )}
                  </div>
                </label>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Senha do Certificado <span className="text-gray-400 font-normal text-xs">(Opcional)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={senhaCertificado}
                    onChange={(e) => setSenhaCertificado(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-agro-light focus:ring-2 focus:ring-agro-light/20 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={handleCloseModal}
                disabled={isLoading}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={isLoading}
                className="px-5 py-2.5 text-sm font-medium text-white bg-agro-secondary hover:bg-agro-primary rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? "A gravar..." : "Gravar e Sincronizar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}