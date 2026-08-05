import { Outlet, NavLink, useNavigate } from "react-router-dom";
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
              <div className="relative group">
                <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-agro-secondary uppercase">
                  Visualizando Dados De:
                </label>
                <div className="flex items-center gap-2 border-2 border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 hover:border-agro-secondary cursor-pointer transition-colors min-w-[320px]">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <select
                    className="flex-1 bg-transparent text-sm font-bold text-gray-800 outline-none cursor-pointer appearance-none pr-6"
                    value={currentProducer?.id || ""}
                    onChange={(e) => {
                      const selected = producersList.find(
                        (p) => p.id === e.target.value,
                      );
                      setCurrentProducer(selected || null);
                    }}
                  >
                    <option value="" disabled>
                      Selecione um produtor...
                    </option>
                    {producersList.map((producer) => (
                      <option key={producer.id} value={producer.id}>
                        {producer.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="text-gray-400 absolute right-4 pointer-events-none"
                  />
                </div>
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

        <main className="relative flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
