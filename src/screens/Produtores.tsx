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
  Building2,
  Edit2,
  UserMinus,
} from "lucide-react";
import { useProducer } from "../context/ProducerContext";

type PropriedadeForm = {
  id: number;
  nome: string;
  cpfCnpj: string;
  inscricaoEstadual: string;
  caepf: string;
  percentualParticipacao: number | string;
};

// --- MÁSCARAS E VALIDAÇÕES ---
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

const maskPhone = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length <= 10) {
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d{4})(\d)/, "$1-$2");
  } else {
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d{5})(\d)/, "$1-$2");
  }
  return v;
};

const validarCpfCnpjAlgoritmo = (val: string) => {
  const doc = val.replace(/\D/g, "");
  if (doc.length === 11) {
    if (/^(\d)\1+$/.test(doc)) return false;
    let soma = 0,
      resto;
    for (let i = 1; i <= 9; i++)
      soma += parseInt(doc.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(doc.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++)
      soma += parseInt(doc.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(doc.substring(10, 11))) return false;
    return true;
  }
  if (doc.length === 14) {
    if (/^(\d)\1+$/.test(doc)) return false;
    let tamanho = doc.length - 2;
    let numeros = doc.substring(0, tamanho);
    const digitos = doc.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) return false;
    tamanho = tamanho + 1;
    numeros = doc.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(1))) return false;
    return true;
  }
  return false;
};

export function Produtores() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const { producersList, carregarProdutores } = useProducer();

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // NOVO ESTADO: Controle de Edição
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estados do Formulário - Etapa 1
  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");

  // Estados do Formulário - Etapa 2
  const [propriedades, setPropriedades] = useState<PropriedadeForm[]>([
    {
      id: Date.now(),
      nome: "Empreendimento Principal",
      cpfCnpj: "",
      inscricaoEstadual: "",
      caepf: "",
      percentualParticipacao: 100,
    },
  ]);

  // Estados do Formulário - Etapa 3
  const [senhaCertificado, setSenhaCertificado] = useState("");
  const [certificado, setCertificado] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // A BUSCA FUNCIONAL E CORRIGIDA EM TEMPO REAL
  const produtoresFiltrados = producersList.filter((p) => {
    if (!searchTerm) return true; // Se o campo estiver vazio, mostra todos

    const searchLower = searchTerm.toLowerCase();
    const searchDigits = searchTerm.replace(/\D/g, ""); // Extrai só números da pesquisa

    // Tratamos tanto "nome" quanto "name" porque depende de como vem da API/Contexto
    const nomeString = (p.nome || p.name || "").toLowerCase();
    const docString = (p.cpfCnpj || p.document || "").replace(/\D/g, "");

    const matchesName = nomeString.includes(searchLower);
    // Se a pessoa digitou apenas letras, o searchDigits fica vazio. Então não comparamos documento.
    const matchesDoc =
      searchDigits !== "" ? docString.includes(searchDigits) : false;

    return matchesName || matchesDoc;
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setCurrentStep(1);
    setNome("");
    setCpfCnpj("");
    setCnpj("");
    setTelefone("");
    setEndereco("");
    setPropriedades([
      {
        id: Date.now(),
        nome: "Empreendimento Principal",
        cpfCnpj: "",
        inscricaoEstadual: "",
        caepf: "",
        percentualParticipacao: 100,
      },
    ]);
    setSenhaCertificado("");
    setCertificado(null);
    setMessage({ text: "", type: "" });
  };

  // --- NOVA FUNÇÃO: POPULAR O FORMULÁRIO COM OS DADOS PARA EDIÇÃO ---
  const handleEditar = (producer: any) => {
    setEditingId(producer.id);
    setNome(producer.nome || producer.name || "");
    setCpfCnpj(maskCpfCnpj(producer.cpfCnpj || producer.document || ""));
    setCnpj(producer.cnpj ? maskCpfCnpj(producer.cnpj) : "");
    setTelefone(producer.telefone ? maskPhone(producer.telefone) : "");
    setEndereco(producer.endereco || "");

    // Puxa os empreendimentos do banco de dados
    if (producer.propriedades && producer.propriedades.length > 0) {
      setPropriedades(
        producer.propriedades.map((p: any) => ({
          id: p.id || Date.now() + Math.random(),
          nome: p.nome,
          cpfCnpj: p.cpfCnpj ? maskCpfCnpj(p.cpfCnpj) : "",
          inscricaoEstadual: p.inscricaoEstadual || "",
          caepf: p.caepf || "",
          percentualParticipacao: p.percentualParticipacao,
        })),
      );
    } else {
      setPropriedades([
        {
          id: Date.now(),
          nome: "Empreendimento Principal",
          cpfCnpj: "",
          inscricaoEstadual: "",
          caepf: "",
          percentualParticipacao: 100,
        },
      ]);
    }

    setCurrentStep(1);
    setIsModalOpen(true);
    setMenuOpenId(null);
  };

  // --- NOVA FUNÇÃO: DESVINCULAR DA CARTEIRA ---
  const handleDesvincular = async (id: string) => {
    if (
      !window.confirm(
        "Atenção: Deseja remover este produtor da sua carteira?\n\nEle não será apagado do sistema, apenas se tornará Independente.",
      )
    )
      return;

    try {
      const token = localStorage.getItem("@AgroPops:token");
      const response = await fetch(`${baseUrl}/produtores/desvincular/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        carregarProdutores();
        setMenuOpenId(null);
      } else {
        alert("Erro ao remover da carteira.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const adicionarPropriedade = () => {
    setPropriedades([
      ...propriedades,
      {
        id: Date.now(),
        nome: `Empreendimento ${propriedades.length + 1}`,
        cpfCnpj: "",
        inscricaoEstadual: "",
        caepf: "",
        percentualParticipacao: 50,
      },
    ]);
  };

  const removerPropriedade = (id: number) => {
    if (propriedades.length === 1) return;
    setPropriedades(propriedades.filter((p) => p.id !== id));
  };

  const atualizarPropriedade = (
    id: number,
    campo: keyof PropriedadeForm,
    valor: string | number,
  ) => {
    setPropriedades(
      propriedades.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)),
    );
  };

  const avancarEtapa = () => {
    if (currentStep === 1) {
      if (!nome || !cpfCnpj)
        return setMessage({
          text: "Preencha Nome e CPF para avançar.",
          type: "error",
        });
      if (nome.trim().split(/\s+/).length < 2)
        return setMessage({
          text: "O nome deve conter pelo menos 2 palavras (Nome e Sobrenome/Razão).",
          type: "error",
        });
      if (!validarCpfCnpjAlgoritmo(cpfCnpj))
        return setMessage({
          text: "O CPF/CNPJ principal informado é inválido.",
          type: "error",
        });
      if (cnpj && !validarCpfCnpjAlgoritmo(cnpj))
        return setMessage({
          text: "O CNPJ Secundário informado é inválido.",
          type: "error",
        });
    }
    if (currentStep === 2) {
      const temInvalida = propriedades.some(
        (p) => !p.nome || !p.percentualParticipacao,
      );
      if (temInvalida)
        return setMessage({
          text: "Todos os empreendimentos precisam de Nome e Percentual (%).",
          type: "error",
        });
    }
    setMessage({ text: "", type: "" });
    setCurrentStep((prev) => prev + 1);
  };

  const handleSalvar = async () => {
    const contadorData = localStorage.getItem("@AgroPops:contador");
    if (!contadorData) return;
    const contadorId = JSON.parse(contadorData).id;

    const formData = new FormData();

    // Se for modo edição, envia o ID
    if (editingId) formData.append("id", editingId);

    formData.append("nome", nome);
    formData.append("cpfCnpj", cpfCnpj.replace(/\D/g, ""));
    if (cnpj) formData.append("cnpj", cnpj.replace(/\D/g, ""));
    if (telefone) formData.append("telefone", telefone);
    if (endereco) formData.append("endereco", endereco);
    formData.append("contadorId", contadorId);

    const propriedadesLimpas = propriedades.map((p) => ({
      nome: p.nome,
      cpfCnpj: p.cpfCnpj.replace(/\D/g, ""), // Limpa máscara antes de enviar
      inscricaoEstadual: p.inscricaoEstadual,
      caepf: p.caepf,
      percentualParticipacao: parseFloat(p.percentualParticipacao.toString()),
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
        setMessage({
          text: editingId
            ? "Dados atualizados com sucesso!"
            : "Produtor cadastrado com sucesso!",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Gerenciar Produtores
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sua carteira de clientes, empreendimentos e certificados.
          </p>
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
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar produtor por nome ou documento (em tempo real)..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-agro-light transition-all text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden pb-32">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
              <th className="px-6 py-4 font-medium">Nome / Contato</th>
              <th className="px-6 py-4 font-medium">CPF (Login)</th>
              <th className="px-6 py-4 font-medium">Empreendimentos</th>
              <th className="px-6 py-4 font-medium">Certificado A1</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {produtoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  Nenhum produtor localizado para a pesquisa.
                </td>
              </tr>
            ) : (
              produtoresFiltrados.map((producer: any) => (
                <tr
                  key={producer.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-800">
                      {producer.nome || producer.name}
                    </p>
                    {producer.telefone && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {maskPhone(producer.telefone)}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600 font-mono">
                      {maskCpfCnpj(producer.cpfCnpj || producer.document || "")}
                    </p>
                    {producer.cnpj && (
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        CNPJ: {maskCpfCnpj(producer.cnpj)}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-lg w-fit border border-gray-200">
                      <Building2 size={14} className="text-emerald-600" />
                      <span className="font-bold">
                        {producer.propriedades?.length || 1}
                      </span>{" "}
                      Unidade(s)
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
                  <td className="px-6 py-4 text-right relative">
                    <button
                      onClick={() =>
                        setMenuOpenId(
                          menuOpenId === producer.id ? null : producer.id,
                        )
                      }
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {menuOpenId === producer.id && (
                      <div className="absolute right-6 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden flex flex-col text-left">
                        <button
                          onClick={() => handleEditar(producer)}
                          className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                          <Edit2 size={16} /> Editar Dados
                        </button>
                        <div className="h-px bg-gray-100 w-full" />
                        <button
                          onClick={() => handleDesvincular(producer.id)}
                          className="px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                        >
                          <UserMinus size={16} /> Remover da Carteira
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {editingId ? "Editar Produtor" : "Novo Produtor Rural"}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${currentStep === step ? "bg-agro-secondary text-white" : currentStep > step ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"}`}
                      >
                        {currentStep > step ? <CheckCircle size={12} /> : step}
                      </div>
                      {step < 3 && (
                        <div
                          className={`w-8 h-1 rounded-full ${currentStep > step ? "bg-emerald-100" : "bg-gray-100"}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white">
              {message.text && (
                <div
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border ${message.type === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}
                >
                  {message.type === "error" ? (
                    <AlertCircle size={18} />
                  ) : (
                    <CheckCircle size={18} />
                  )}{" "}
                  {message.text}
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                    Passo 1: Dados Pessoais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-600 uppercase">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        placeholder="Nome e Sobrenome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-agro-light outline-none text-sm"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-600 uppercase">
                        CPF (Login)
                      </label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={cpfCnpj}
                        onChange={(e) =>
                          setCpfCnpj(maskCpfCnpj(e.target.value))
                        }
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-agro-light outline-none font-mono text-sm"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-600 uppercase">
                        CNPJ Rural (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="00.000.000/0000-00"
                        value={cnpj}
                        onChange={(e) => setCnpj(maskCpfCnpj(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-agro-light outline-none font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-600 uppercase">
                        Telefone / WhatsApp
                      </label>
                      <input
                        type="text"
                        placeholder="(00) 00000-0000"
                        value={telefone}
                        onChange={(e) => setTelefone(maskPhone(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-agro-light outline-none font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold text-gray-600 uppercase">
                        Endereço Completo (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Rua, Número, Bairro, Cidade - UF"
                        value={endereco}
                        onChange={(e) => setEndereco(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-agro-light outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-5 bg-blue-50 border border-blue-100 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-blue-800">
                        Empreendimentos / Propriedades
                      </h3>
                      <p className="text-sm text-blue-700/80 mt-1 leading-relaxed">
                        Cadastre as unidades produtivas (Fazendas,
                        Arrendamentos). O sistema rateará automaticamente as
                        notas fiscais recebidas da SEFAZ com base na Cota de
                        Participação (%).
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    {propriedades.map((prop) => (
                      <div
                        key={prop.id}
                        className="p-5 bg-gray-50 border border-gray-200 rounded-xl relative shadow-sm space-y-4"
                      >
                        {propriedades.length > 1 && (
                          <button
                            onClick={() => removerPropriedade(prop.id)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors z-10"
                          >
                            <X size={12} />
                          </button>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">
                              Nome do Empreendimento
                            </label>
                            <input
                              type="text"
                              value={prop.nome}
                              onChange={(e) =>
                                atualizarPropriedade(
                                  prop.id,
                                  "nome",
                                  e.target.value,
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-agro-light"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">
                              CPF / CNPJ (Opcional)
                            </label>
                            <input
                              type="text"
                              placeholder="Apenas números"
                              value={prop.cpfCnpj}
                              onChange={(e) =>
                                atualizarPropriedade(
                                  prop.id,
                                  "cpfCnpj",
                                  maskCpfCnpj(e.target.value),
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono outline-none focus:border-agro-light"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">
                              Inscrição Est. (IE)
                            </label>
                            <input
                              type="text"
                              value={prop.inscricaoEstadual}
                              onChange={(e) =>
                                atualizarPropriedade(
                                  prop.id,
                                  "inscricaoEstadual",
                                  e.target.value.replace(/\D/g, ""),
                                )
                              }
                              placeholder="Opcional"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-agro-light font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">
                              CAEPF
                            </label>
                            <input
                              type="text"
                              value={prop.caepf}
                              onChange={(e) =>
                                atualizarPropriedade(
                                  prop.id,
                                  "caepf",
                                  e.target.value.replace(/\D/g, ""),
                                )
                              }
                              placeholder="Opcional"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-agro-light font-mono"
                            />
                          </div>
                          <div className="space-y-1 relative">
                            <label className="text-xs font-bold text-emerald-600 uppercase">
                              Sua Cota %
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={prop.percentualParticipacao}
                              onChange={(e) =>
                                atualizarPropriedade(
                                  prop.id,
                                  "percentualParticipacao",
                                  e.target.value,
                                )
                              }
                              className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50 text-emerald-800 font-bold rounded-lg text-sm outline-none focus:border-emerald-500 text-center"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={adicionarPropriedade}
                      className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 font-semibold rounded-xl hover:border-agro-secondary hover:text-agro-secondary hover:bg-emerald-50/50 transition-all flex items-center justify-center gap-2 text-sm mt-4"
                    >
                      <Plus size={16} /> Adicionar Novo Empreendimento
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                    Passo 3: Conexão SEFAZ (Opcional)
                  </h3>
                  <label className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-gray-50 hover:bg-emerald-50/50 transition-colors cursor-pointer group">
                    <input
                      type="file"
                      accept=".pfx,.p12"
                      className="hidden"
                      onChange={(e) =>
                        setCertificado(
                          e.target.files ? e.target.files[0] : null,
                        )
                      }
                    />
                    <div
                      className={`w-14 h-14 rounded-full shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 ${certificado ? "bg-emerald-100 text-emerald-600" : "bg-white border border-gray-200 text-gray-400"}`}
                    >
                      {certificado ? (
                        <CheckCircle size={28} />
                      ) : (
                        <UploadCloud size={28} />
                      )}
                    </div>
                    <div className="text-center">
                      <p
                        className={`text-sm font-bold ${certificado ? "text-emerald-700" : "text-gray-600"}`}
                      >
                        {certificado
                          ? `Anexado: ${certificado.name}`
                          : "Clique para anexar o Certificado A1 (.pfx)"}
                      </p>
                      {!certificado && (
                        <p className="text-xs text-gray-500 mt-1">
                          Pode ser atualizado posteriormente.
                        </p>
                      )}
                    </div>
                  </label>
                  <div className="space-y-1 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                    <label className="text-xs font-bold text-gray-600 uppercase">
                      Senha do Certificado
                    </label>
                    <input
                      type="password"
                      placeholder="Senha do arquivo .pfx..."
                      value={senhaCertificado}
                      onChange={(e) => setSenhaCertificado(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-agro-light outline-none text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-1"
                >
                  <ChevronLeft size={16} /> Voltar
                </button>
              ) : (
                <button
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              )}

              {currentStep < 3 ? (
                <button
                  onClick={avancarEtapa}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                >
                  Próxima Etapa <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSalvar}
                  disabled={isLoading}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-agro-secondary hover:bg-agro-primary rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading
                    ? "Salvando..."
                    : editingId
                      ? "Atualizar Cadastro"
                      : "Finalizar Cadastro"}{" "}
                  <CheckCircle size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
