import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useProducer } from "../context/ProducerContext";
import {
  LayoutDashboard,
  Users,
  FileText,
  Sliders,
  Settings,
  LogOut,
  ChevronDown,
  User,
  Tractor,
  BookText,
  ShieldAlert,
  Search,
  X,
  Building2,
  ChevronRight,
} from "lucide-react";

export function DashboardLayout() {
  const {
    currentProducer,
    setCurrentProducer,
    producersList,
    currentProperty,
    setCurrentProperty,
  } = useProducer();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Carregando...");
  const [userRole, setUserRole] = useState<"CONTADOR" | "PRODUTOR" | null>(
    null,
  );

  const adminBackupToken = localStorage.getItem("@AgroPops:adminBackupToken");

  const location = useLocation();

  // --- ESTADOS DA MODAL DE PRODUTORES PADRÃO OURO ---
  const [isProducerModalOpen, setIsProducerModalOpen] = useState(false);
  const [producerSearchTerm, setProducerSearchTerm] = useState("");

  const maskCpfCnpj = (v: string) => {
    if (!v) return "";
    v = v.replace(/\D/g, "");
    if (v.length <= 11)
      return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  const filteredProducers = producersList.filter((p: any) => {
    if (!producerSearchTerm) return true;
    const term = producerSearchTerm.toLowerCase();
    const name = (p.nome || p.name || "").toLowerCase();
    const doc = (p.cpfCnpj || p.document || "").replace(/\D/g, "");
    const searchDoc = producerSearchTerm.replace(/\D/g, "");
    return name.includes(term) || (searchDoc && doc.includes(searchDoc));
  });

  // Identifica se a tela atual NÃO precisa de um produtor selecionado
  const isGlobalRoute =
    location.pathname.includes("/produtores") ||
    location.pathname.includes("/parametrizacao") ||
    location.pathname.includes("/configuracoes");

  useEffect(() => {
    // Busca a credencial real armazenada no navegador (Sem forçar tipagem)
    const rawRole = localStorage.getItem("@AgroPops:userRole");
    const token = localStorage.getItem("@AgroPops:token");

    // --- BLINDAGEM CONTRA COLISÃO DE ABAS ---
    // Se o Local Storage diz que quem está usando o PC é um ADMIN, expulsa de volta pro painel dele.
    if (rawRole === "ADMIN") {
      window.location.href = "/admin/dashboard";
      return;
    }

    if (!token || !rawRole) {
      navigate("/login");
      return;
    }

    const role = rawRole as "CONTADOR" | "PRODUTOR";
    setUserRole(role);

    if (role === "CONTADOR") {
      const contador = JSON.parse(
        localStorage.getItem("@AgroPops:contador") || "{}",
      );
      setUserName(
        contador.nomeResponsavel || contador.nomeEscritorio || "Contador",
      );
    } else if (role === "PRODUTOR") {
      const produtor = JSON.parse(
        localStorage.getItem("@AgroPops:produtorData") || "{}",
      );
      setUserName(produtor.nome || "Produtor");
    } else {
      // Prevenção extra de segurança: Se a Role for qualquer outra coisa (manipulação local), desloga.
      localStorage.clear();
      window.location.href = "/login";
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleRevertImpersonate = () => {
    localStorage.setItem("@AgroPops:token", adminBackupToken!);
    localStorage.setItem(
      "@AgroPops:user",
      localStorage.getItem("@AgroPops:adminBackupUser")!,
    );
    localStorage.setItem("@AgroPops:userRole", "ADMIN");

    localStorage.removeItem("@AgroPops:adminBackupToken");
    localStorage.removeItem("@AgroPops:adminBackupUser");
    localStorage.removeItem("@AgroPops:contador");

    window.location.href = "/admin/dashboard";
  };

  const menuItems =
    userRole === "CONTADOR"
      ? [
          {
            icon: <LayoutDashboard size={20} />,
            label: "Visão Geral",
            path: "/app/",
            end: true,
          },
          {
            icon: <Users size={20} />,
            label: "Gerenciar Produtores",
            path: "/app/produtores",
          },
          {
            icon: <FileText size={20} />,
            label: "Notas Fiscais",
            path: "/app/notas",
          },
          {
            icon: <Sliders size={20} />,
            label: "Regras de NCM",
            path: "/app/parametrizacao",
          },
          {
            icon: <BookText size={20} />,
            label: "Livro Caixa",
            path: "/app/livro-caixa",
          },
          {
            icon: <Settings size={20} />,
            label: "Calculadora IRPR",
            path: "/app/calculadora-irpr",
          },
          {
            icon: <Settings size={20} />,
            label: "Configurações",
            path: "/app/configuracoes",
          },
        ]
      : [
          {
            icon: <LayoutDashboard size={20} />,
            label: "Minha Propriedade",
            path: "/app/",
            end: true,
          },
          {
            icon: <FileText size={20} />,
            label: "Minhas Notas",
            path: "/app/notas",
          },
          {
            icon: <BookText size={20} />,
            label: "Livro Caixa",
            path: "/app/livro-caixa",
          },
          {
            icon: <Settings size={20} />,
            label: "Configurações",
            path: "/app/configuracoes",
          },
        ];

  return (
    <div className="flex h-screen bg-agro-background font-sans antialiased overflow-hidden">
      <aside className="w-64 bg-agro-primary text-white flex flex-col justify-between border-r border-emerald-950 shrink-0">
        <div>
          <div className="p-6 border-b border-emerald-900/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-agro-light flex items-center justify-center font-bold text-agro-primary">
              <img
                src="/logo.png"
                alt="AgroContábil"
                className="h-10 w-auto object-contain"
              />
            </div>
            <span className="font-bold text-lg tracking-wide">Agro POPs</span>
          </div>
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-agro-secondary text-white shadow-md"
                      : "text-emerald-100/70 hover:bg-agro-secondary/30 hover:text-white"
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-emerald-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-800 flex items-center justify-center">
              {userRole === "CONTADOR" ? (
                <User size={18} />
              ) : (
                <Tractor size={18} />
              )}
            </div>
            <div className="overflow-hidden">
              <p
                className="text-sm font-semibold leading-tight truncate w-32"
                title={userName}
              >
                {userName?.split(" ")[0] || "Usuário"}
              </p>
              <p className="text-xs text-emerald-300/80">
                {userRole === "CONTADOR" ? "Contador" : "Produtor Rural"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-emerald-300 hover:text-white p-2 rounded-lg hover:bg-emerald-800 transition-colors"
            title="Terminar Sessão"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {adminBackupToken && (
          <div className="bg-slate-800 text-white px-8 py-2.5 flex justify-between items-center shadow-md z-20 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Modo Administrador
              </span>
              <span className="text-xs text-slate-300 ml-2">
                Acessando a conta de: <b>{userName}</b>
              </span>
            </div>
            <button
              onClick={handleRevertImpersonate}
              className="text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-1.5 rounded-lg transition-colors flex items-center gap-2"
            >
              Sair e Voltar ao Admin <LogOut size={14} />
            </button>
          </div>
        )}

        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shadow-sm z-10 shrink-0">
          {userRole === "CONTADOR" ? (
            <div className="flex items-center gap-4">
              {/* BOTÃO DA MODAL DE SELEÇÃO */}
              <div className="relative group">
                <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-agro-secondary uppercase z-10">
                  Carteira Ativa
                </label>
                <button
                  onClick={() => setIsProducerModalOpen(true)}
                  className="flex items-center justify-between gap-3 border-2 border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 hover:border-agro-secondary hover:bg-white cursor-pointer transition-all min-w-[320px] text-left group-hover:shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${currentProducer ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]"}`}
                    />
                    <span
                      className={`text-sm font-bold truncate max-w-[240px] ${currentProducer ? "text-gray-800" : "text-gray-500"}`}
                    >
                      {currentProducer
                        ? currentProducer.nome || currentProducer.name
                        : "Selecione o Produtor..."}
                    </span>
                  </div>
                  <Search
                    size={16}
                    className="text-gray-400 group-hover:text-agro-secondary transition-colors shrink-0"
                  />
                </button>
              </div>

              {currentProducer &&
                currentProducer.propriedades &&
                currentProducer.propriedades.length > 0 && (
                  <div className="relative group hidden xl:block">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-blue-600 uppercase">
                      Imóvel / Fazenda:
                    </label>
                    <div className="flex items-center gap-2 border-2 border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 hover:border-blue-400 cursor-pointer transition-colors min-w-[280px]">
                      <div
                        className={`w-2 h-2 rounded-full ${currentProperty ? "bg-blue-500" : "bg-emerald-500"}`}
                      />
                      <select
                        className="flex-1 bg-transparent text-sm font-bold text-gray-800 outline-none cursor-pointer appearance-none pr-6"
                        value={currentProperty?.id || ""}
                        onChange={(e) => {
                          if (e.target.value === "") {
                            setCurrentProperty(null);
                          } else {
                            const selected = currentProducer.propriedades?.find(
                              (p) => p.id.toString() === e.target.value,
                            );
                            setCurrentProperty(selected || null);
                          }
                        }}
                      >
                        <option value="">
                          Todas as Propriedades (Consolidado)
                        </option>
                        {currentProducer.propriedades.map((prop) => (
                          <option key={prop.id} value={prop.id}>
                            {prop.nome} ({prop.percentualParticipacao}%)
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="text-gray-400 absolute right-4 pointer-events-none"
                      />
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-lg font-bold text-gray-800">
                Sua Propriedade
              </h2>
            </div>
          )}
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <div>
              <span className="font-semibold text-gray-400">CPF/CNPJ:</span>{" "}
              <span className="font-mono font-medium text-gray-700">
                {currentProducer?.document || "Nenhum selecionado"}
              </span>
            </div>
          </div>
        </header>

        <main className="relative flex-1 overflow-y-auto p-8 bg-gray-50">
          {currentProducer || userRole === "PRODUTOR" || isGlobalRoute ? (
            <Outlet />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in duration-500 pb-20">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-emerald-100">
                <Building2 size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-2">
                Bem-vindo ao Agro POPs
              </h2>
              <p className="text-gray-500 max-w-md mx-auto">
                Para iniciar a gestão fiscal, busque e selecione um produtor
                rural na sua carteira de clientes.
              </p>
              <button
                onClick={() => setIsProducerModalOpen(true)}
                className="mt-6 px-6 py-3 bg-agro-secondary hover:bg-agro-primary text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 hover:-translate-y-0.5"
              >
                <Search size={18} /> Selecionar Produtor
              </button>
            </div>
          )}
        </main>

        {/* ======================================================= */}
        {/* MODAL PADRÃO OURO DE SELEÇÃO DE PRODUTORES              */}
        {/* ======================================================= */}
        {isProducerModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Selecione o Produtor
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Busque em sua carteira para gerenciar as notas e o LCDPR.
                  </p>
                </div>
                <button
                  onClick={() => setIsProducerModalOpen(false)}
                  className="p-2 bg-gray-50 hover:bg-rose-50 hover:text-rose-500 rounded-xl text-gray-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Buscar por nome, CPF ou CNPJ..."
                    value={producerSearchTerm}
                    onChange={(e) => setProducerSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-agro-secondary focus:ring-4 focus:ring-agro-secondary/10 text-sm transition-all shadow-sm"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
                <div className="space-y-2">
                  {filteredProducers.map((p: any) => {
                    const isSelected = currentProducer?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setCurrentProducer(p);
                          setCurrentProperty(null);
                          setIsProducerModalOpen(false);
                          setProducerSearchTerm("");
                        }}
                        className={`w-full flex items-center justify-between p-4 rounded-xl transition-all border cursor-pointer ${
                          isSelected
                            ? "bg-emerald-50 border-emerald-200 shadow-sm"
                            : "bg-white border-gray-100 hover:border-emerald-200 hover:shadow-md hover:-translate-y-0.5 hover:shadow-emerald-100"
                        }`}
                      >
                        <div className="flex items-center gap-4 text-left">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold shrink-0 ${isSelected ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-700"}`}
                          >
                            <User size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-base">
                              {p.nome || p.name}
                            </p>
                            <p className="text-xs text-gray-500 font-mono mt-0.5 flex items-center gap-1.5">
                              {maskCpfCnpj(p.cpfCnpj || p.document)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={`text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border ${isSelected ? "bg-white text-emerald-700 border-emerald-100" : "bg-gray-50 text-gray-600 border-gray-200"}`}
                            title="Empreendimentos Vinculados"
                          >
                            <Building2 size={14} />{" "}
                            {p.propriedades?.length || 1}
                          </span>
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"}`}
                          >
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {filteredProducers.length === 0 && (
                    <div className="py-16 flex flex-col items-center justify-center text-gray-400">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Search size={28} className="text-gray-300" />
                      </div>
                      <p className="font-medium text-gray-600">
                        Nenhum produtor encontrado.
                      </p>
                      <p className="text-xs mt-1">
                        Revise os termos da sua busca.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
