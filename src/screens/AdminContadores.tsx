import { useState, useEffect } from "react";
import {
  Building,
  Users,
  ArrowRightLeft,
  Search,
  Mail,
  Phone,
  ChevronRight,
  X,
  Loader2,
  Key,
  UserCheck,
  AlertTriangle,
  Plus,
  Trash2,
  MoreVertical,
} from "lucide-react";

type Contador = {
  id: number;
  nomeEscritorio: string;
  nomeResponsavel: string;
  email: string;
  telefone: string;
  crc: string;
  estado: string;
};
type Produtor = {
  id: number;
  nome: string;
  cpfCnpj: string;
  inscricaoEstadual: string;
};

export function AdminContadores() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("@AgroPops:token");

  const [contadores, setContadores] = useState<Contador[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [selectedContador, setSelectedContador] = useState<Contador | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"produtores" | "admin">(
    "produtores",
  );
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [isLoadingProdutores, setIsLoadingProdutores] = useState(false);

  // Modais
  const [modalNovoContador, setModalNovoContador] = useState(false);
  const [modalNovoProdutor, setModalNovoProdutor] = useState(false);

  // Ações Individuais (Menu 3 pontos)
  const [menuProdutorAberto, setMenuProdutorAberto] = useState<number | null>(
    null,
  );
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [senhaProdutorModalOpen, setSenhaProdutorModalOpen] = useState(false);
  const [produtorAlvo, setProdutorAlvo] = useState<Produtor | null>(null);

  const [novaSenha, setNovaSenha] = useState("");
  const [targetContadorId, setTargetContadorId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Formulários
  const [formContador, setFormContador] = useState({
    nomeEscritorio: "",
    crc: "",
    estado: "",
    nomeResponsavel: "",
    telefone: "",
    email: "",
    senha: "",
  });

  // AGORA O FORM DE PRODUTOR TEM A SENHA E O CONTADOR_ID DINÂMICO
  const [formProdutor, setFormProdutor] = useState({
    nome: "",
    cpfCnpj: "",
    cnpj: "",
    inscricaoEstadual: "",
    senha: "",
    contadorId: "",
  });

  const fetchContadores = async () => {
    try {
      const res = await fetch(`${baseUrl}/admins/contadores`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setContadores(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContadores();
  }, []);

  const abrirDetalhesContador = async (contador: Contador) => {
    setSelectedContador(contador);
    setActiveTab("produtores");
    setIsLoadingProdutores(true);
    setNovaSenha("");
    try {
      const res = await fetch(`${baseUrl}/produtores/listar/${contador.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProdutores(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingProdutores(false);
    }
  };

  const handleImpersonate = async () => {
    if (!selectedContador) return;
    if (
      !window.confirm(
        `Entrar no painel de ${selectedContador.nomeResponsavel}?`,
      )
    )
      return;
    setIsProcessing(true);
    try {
      const res = await fetch(
        `${baseUrl}/admins/impersonate?tipoUsuario=CONTADOR&usuarioId=${selectedContador.id}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("@AgroPops:adminBackupToken", token!);
        localStorage.setItem(
          "@AgroPops:adminBackupUser",
          localStorage.getItem("@AgroPops:user")!,
        );

        localStorage.setItem("@AgroPops:contador", JSON.stringify(data.user));
        localStorage.setItem("@AgroPops:token", data.token);
        localStorage.setItem("@AgroPops:userRole", "CONTADOR");
        window.location.href = "/app";
      }
    } catch (err) {
      alert("Falha ao gerar sessão.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetSenhaContador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContador || novaSenha.length < 6) return;
    setIsProcessing(true);
    try {
      const res = await fetch(
        `${baseUrl}/admins/reset-senha?tipoUsuario=CONTADOR&usuarioId=${selectedContador.id}&novaSenha=${encodeURIComponent(novaSenha)}`,
        { method: "PUT", headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        alert("Senha do contador redefinida!");
        setNovaSenha("");
      }
    } catch (err) {
      alert("Erro de conexão.");
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmarTransferencia = async () => {
    if (!produtorAlvo || !targetContadorId) return;
    setIsProcessing(true);
    try {
      const res = await fetch(
        `${baseUrl}/admins/transferir-produtor/${produtorAlvo.id}/${targetContadorId}`,
        { method: "PUT", headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        setTransferModalOpen(false);
        setProdutores((prev) => prev.filter((p) => p.id !== produtorAlvo.id));
        alert("Produtor transferido com sucesso!");
      }
    } catch (err) {
      alert("Erro.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetSenhaProdutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtorAlvo || novaSenha.length < 6) return;
    setIsProcessing(true);
    try {
      const res = await fetch(
        `${baseUrl}/admins/reset-senha?tipoUsuario=PRODUTOR&usuarioId=${produtorAlvo.id}&novaSenha=${encodeURIComponent(novaSenha)}`,
        { method: "PUT", headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        alert("Senha do produtor redefinida!");
        setSenhaProdutorModalOpen(false);
        setNovaSenha("");
      }
    } catch (err) {
      alert("Erro de conexão.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoverProdutor = async (produtor: Produtor) => {
    if (
      !window.confirm(
        `ATENÇÃO: Deseja apagar definitivamente o produtor ${produtor.nome} do sistema?`,
      )
    )
      return;
    try {
      const res = await fetch(
        `${baseUrl}/admins/deletar-produtor/${produtor.id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        setProdutores((prev) => prev.filter((p) => p.id !== produtor.id));
      }
    } catch (err) {
      alert("Erro ao excluir.");
    }
  };

  const criarContador = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch(`${baseUrl}/contadores/registrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formContador),
      });
      if (res.ok) {
        alert("Escritório criado!");
        setModalNovoContador(false);
        fetchContadores();
      } else {
        alert(await res.text());
      }
    } catch (err) {
      alert("Erro ao criar.");
    } finally {
      setIsProcessing(false);
    }
  };

  // FUNÇÃO ÚNICA PARA CRIAR PRODUTORES (Independentes ou Vinculados)
  const abrirModalCriacaoProdutor = (idContador?: number) => {
    setFormProdutor({
      nome: "",
      cpfCnpj: "",
      inscricaoEstadual: "",
      senha: "",
      contadorId: idContador ? idContador.toString() : "",
    });
    setModalNovoProdutor(true);
  };

  const criarProdutor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("nome", formProdutor.nome);
      formData.append("cpfCnpj", formProdutor.cpfCnpj);
      if (formProdutor.cnpj) formData.append("cnpj", formProdutor.cnpj);
      formData.append("inscricaoEstadual", formProdutor.inscricaoEstadual);
      if (formProdutor.senha) formData.append("senha", formProdutor.senha);
      if (formProdutor.contadorId)
        formData.append("contadorId", formProdutor.contadorId);

      const res = await fetch(`${baseUrl}/produtores/cadastrar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        alert("Produtor criado com sucesso!");
        setModalNovoProdutor(false);
        if (formProdutor.contadorId && selectedContador)
          abrirDetalhesContador(selectedContador);
      } else {
        alert(await res.text());
      }
    } catch (err) {
      alert("Erro ao criar.");
    } finally {
      setIsProcessing(false);
    }
  };

  const contadoresFiltrados = contadores.filter((c) =>
    c.nomeEscritorio.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* CABEÇALHO GLOBAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Gestão de Escritórios e Produtores
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Girencie carteiras, produtores e acesse o sistema.
          </p>
        </div>

        {/* NOVOS BOTÕES GLOBAIS */}
        <div className="flex gap-3">
          <button
            onClick={() => abrirModalCriacaoProdutor()}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-50 shadow-sm"
          >
            <Plus size={18} /> Novo Produtor (Independente)
          </button>
          <button
            onClick={() => setModalNovoContador(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Plus size={18} /> Novo Escritório
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[70vh]">
        {/* ESQUERDA: LISTA CONTADORES */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Buscar escritório..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg outline-none text-sm focus:border-slate-800"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">Carregando...</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {contadoresFiltrados.map((contador) => (
                  <li
                    key={contador.id}
                    onClick={() => abrirDetalhesContador(contador)}
                    className={`p-4 cursor-pointer transition-colors flex items-center justify-between ${selectedContador?.id === contador.id ? "bg-emerald-50/50 border-l-4 border-l-emerald-600" : "hover:bg-gray-50 border-l-4 border-l-transparent"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center">
                        <Building size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">
                          {contador.nomeEscritorio}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail size={12} /> {contador.email}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-300" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* DIREITA: DETALHES DO CONTADOR SELECIONADO */}
        <div className="flex-[1.5] bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          {!selectedContador ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
              <Users size={48} className="mb-4 opacity-20" />
              <p>Selecione um escritório contábil na lista ao lado.</p>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-gray-100 bg-slate-800 text-white">
                <h2 className="text-xl font-bold">
                  {selectedContador.nomeEscritorio}
                </h2>
                <div className="flex gap-4 mt-2 text-sm text-slate-300">
                  <span className="flex items-center gap-1">
                    <Users size={14} /> Resp: {selectedContador.nomeResponsavel}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone size={14} /> {selectedContador.telefone}
                  </span>
                </div>
              </div>

              <div className="flex border-b border-gray-100 bg-gray-50">
                <button
                  onClick={() => setActiveTab("produtores")}
                  className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === "produtores" ? "text-emerald-700 border-b-2 border-emerald-600 bg-white" : "text-gray-500 hover:bg-gray-100"}`}
                >
                  Carteira de Produtores
                </button>
                <button
                  onClick={() => setActiveTab("admin")}
                  className={`flex-1 py-3 text-sm font-bold transition-colors flex justify-center items-center gap-2 ${activeTab === "admin" ? "text-slate-800 border-b-2 border-slate-800 bg-white" : "text-gray-500 hover:bg-gray-100"}`}
                >
                  <Key size={16} /> Ações do Contador
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                {activeTab === "produtores" && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider px-2">
                        Produtores ({produtores.length})
                      </h3>
                      <button
                        onClick={() =>
                          abrirModalCriacaoProdutor(selectedContador.id)
                        }
                        className="flex items-center gap-1 text-sm font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        <Plus size={16} /> Adicionar à Carteira
                      </button>
                    </div>

                    {isLoadingProdutores ? (
                      <div className="text-center py-8 text-gray-400">
                        <Loader2 className="animate-spin inline mr-2" />{" "}
                        Carregando...
                      </div>
                    ) : produtores.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 bg-white border border-gray-100 rounded-xl">
                        Vazio.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {produtores.map((prod) => (
                          <div
                            key={prod.id}
                            className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm flex justify-between items-center hover:border-emerald-200 transition-colors"
                          >
                            <div>
                              <p className="font-bold text-gray-800">
                                {prod.nome}
                              </p>
                              <p className="text-xs text-gray-500 font-mono">
                                Doc: {prod.cpfCnpj}
                              </p>
                            </div>

                            <div className="relative">
                              <button
                                onClick={() =>
                                  setMenuProdutorAberto(
                                    menuProdutorAberto === prod.id
                                      ? null
                                      : prod.id,
                                  )
                                }
                                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
                              >
                                <MoreVertical size={18} />
                              </button>

                              {menuProdutorAberto === prod.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden flex flex-col">
                                  <button
                                    onClick={() => {
                                      setMenuProdutorAberto(null);
                                      setProdutorAlvo(prod);
                                      setTransferModalOpen(true);
                                    }}
                                    className="px-4 py-2.5 text-sm text-left font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <ArrowRightLeft size={16} /> Transferir
                                  </button>
                                  <button
                                    onClick={() => {
                                      setMenuProdutorAberto(null);
                                      setProdutorAlvo(prod);
                                      setNovaSenha("");
                                      setSenhaProdutorModalOpen(true);
                                    }}
                                    className="px-4 py-2.5 text-sm text-left font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Key size={16} /> Alterar Senha
                                  </button>
                                  <div className="h-px bg-gray-100 w-full" />
                                  <button
                                    onClick={() => {
                                      setMenuProdutorAberto(null);
                                      handleRemoverProdutor(prod);
                                    }}
                                    className="px-4 py-2.5 text-sm text-left font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                  >
                                    <Trash2 size={16} /> Remover
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {activeTab === "admin" && (
                  <div className="space-y-6">
                    <div className="bg-white border border-blue-100 p-6 rounded-2xl shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                          <UserCheck size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">
                            Entrar como Contador
                          </h3>
                          <p className="text-sm text-gray-500 mt-1 mb-4">
                            Acesse o sistema do contador selecionado.
                          </p>
                          <button
                            onClick={handleImpersonate}
                            disabled={isProcessing}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-2"
                          >
                            {isProcessing ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <ArrowRightLeft size={18} />
                            )}{" "}
                            Acessar
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-rose-100 p-6 rounded-2xl shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                          <AlertTriangle size={24} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-800">
                            Alterar Senha do Escritório
                          </h3>
                          <form
                            onSubmit={handleResetSenhaContador}
                            className="flex gap-3 mt-4"
                          >
                            <input
                              type="text"
                              placeholder="Nova senha..."
                              value={novaSenha}
                              onChange={(e) => setNovaSenha(e.target.value)}
                              minLength={6}
                              required
                              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                            />
                            <button
                              type="submit"
                              disabled={isProcessing || novaSenha.length < 6}
                              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-2"
                            >
                              {isProcessing ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <Key size={18} />
                              )}{" "}
                              Redefinir
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ================= MODAIS ================= */}

      {/* 1. Modal Novo Escritório */}
      {modalNovoContador && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">
                Criar Novo Escritório
              </h2>
              <button
                onClick={() => setModalNovoContador(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={criarContador}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Nome Escritório
                    </label>
                    <input
                      type="text"
                      required
                      value={formContador.nomeEscritorio}
                      onChange={(e) =>
                        setFormContador({
                          ...formContador,
                          nomeEscritorio: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Responsável
                    </label>
                    <input
                      type="text"
                      required
                      value={formContador.nomeResponsavel}
                      onChange={(e) =>
                        setFormContador({
                          ...formContador,
                          nomeResponsavel: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      E-mail Login
                    </label>
                    <input
                      type="email"
                      required
                      value={formContador.email}
                      onChange={(e) =>
                        setFormContador({
                          ...formContador,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Senha de Acesso
                    </label>
                    <input
                      type="text"
                      required
                      value={formContador.senha}
                      onChange={(e) =>
                        setFormContador({
                          ...formContador,
                          senha: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      CRC
                    </label>
                    <input
                      type="text"
                      required
                      value={formContador.crc}
                      onChange={(e) =>
                        setFormContador({
                          ...formContador,
                          crc: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Estado
                    </label>
                    <input
                      type="text"
                      required
                      value={formContador.estado}
                      onChange={(e) =>
                        setFormContador({
                          ...formContador,
                          estado: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNovoContador(false)}
                  className="px-4 py-2 text-sm text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 text-sm text-white bg-slate-800 rounded-lg"
                >
                  Criar Escritório
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Novo Produtor (Dinâmico) */}
      {modalNovoProdutor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">
                Criar Nova Conta de Produtor
              </h2>
              <button
                onClick={() => setModalNovoProdutor(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={criarProdutor}>
              <div className="p-6 space-y-4">
                {formProdutor.contadorId ? (
                  <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg border border-emerald-100 text-sm">
                    Vinculando automaticamente ao escritório:{" "}
                    <b>
                      {
                        contadores.find(
                          (c) => c.id.toString() === formProdutor.contadorId,
                        )?.nomeEscritorio
                      }
                    </b>
                  </div>
                ) : (
                  <div className="bg-amber-50 text-amber-700 p-3 rounded-lg border border-amber-100 text-sm">
                    <b>Atenção:</b> Produtor será criado de forma{" "}
                    <b>Independente</b> (Sem vínculo). Ele mesmo deverá aceitar
                    um convite de contador futuramente.
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Nome/Propriedade
                  </label>
                  <input
                    type="text"
                    required
                    value={formProdutor.nome}
                    onChange={(e) =>
                      setFormProdutor({ ...formProdutor, nome: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    CPF/CNPJ
                  </label>
                  <input
                    type="text"
                    required
                    value={formProdutor.cpfCnpj}
                    onChange={(e) =>
                      setFormProdutor({
                        ...formProdutor,
                        cpfCnpj: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Inscrição Estadual
                  </label>
                  <input
                    type="text"
                    required
                    value={formProdutor.inscricaoEstadual}
                    onChange={(e) =>
                      setFormProdutor({
                        ...formProdutor,
                        inscricaoEstadual: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Senha de Acesso
                  </label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={formProdutor.senha}
                    onChange={(e) =>
                      setFormProdutor({
                        ...formProdutor,
                        senha: e.target.value,
                      })
                    }
                    placeholder="Senha do produtor..."
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNovoProdutor(false)}
                  className="px-4 py-2 text-sm text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 text-sm text-white bg-emerald-600 rounded-lg"
                >
                  {isProcessing ? "A criar..." : "Criar Produtor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Alterar Senha Produtor */}
      {senhaProdutorModalOpen && produtorAlvo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">
                Forçar Senha do Produtor
              </h2>
              <button
                onClick={() => setSenhaProdutorModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleResetSenhaProdutor}>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                  Defina uma nova senha de acesso para{" "}
                  <b>{produtorAlvo.nome}</b>.
                </p>
                <input
                  type="text"
                  placeholder="Nova senha provisória..."
                  required
                  minLength={6}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full px-3 py-3 bg-gray-50 border rounded-lg"
                />
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSenhaProdutorModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || novaSenha.length < 6}
                  className="px-5 py-2 text-sm text-white bg-slate-800 rounded-lg"
                >
                  Salvar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal de Transferência */}
      {transferModalOpen && produtorAlvo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <ArrowRightLeft className="text-emerald-600" /> Migração de
                Conta
              </h2>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Transferir{" "}
                <strong className="text-gray-800">{produtorAlvo.nome}</strong>{" "}
                para onde?
              </p>
              <select
                value={targetContadorId}
                onChange={(e) => setTargetContadorId(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl"
              >
                <option value="" disabled>
                  Selecione o novo escritório...
                </option>
                {contadores
                  .filter((c) => c.id !== selectedContador?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nomeEscritorio}
                    </option>
                  ))}
              </select>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setTransferModalOpen(false)}
                className="px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarTransferencia}
                disabled={!targetContadorId || isProcessing}
                className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm flex items-center gap-2"
              >
                {isProcessing ? "Movendo..." : "Confirmar Migração"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
