import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  ShieldCheck,
  BookOpen,
} from "lucide-react";

export function AdminDashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // BLINDAGEM DA ROTA
  useEffect(() => {
    const token = localStorage.getItem("@AgroPops:token");
    const role = localStorage.getItem("@AgroPops:userRole");
    if (!token || role !== "ADMIN") {
      navigate("/admin");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("@AgroPops:token");
    localStorage.removeItem("@AgroPops:user");
    localStorage.removeItem("@AgroPops:userRole");
    navigate("/admin");
  };

  const menuItems = [
    { path: "/admin/dashboard", icon: LayoutDashboard, label: "Visão Geral" },
    {
      path: "/admin/dashboard/contadores",
      icon: Users,
      label: "Gestão de Escritórios",
    },
    {
      path: "/admin/dashboard/regras-fiscais",
      icon: BookOpen,
      label: "Config. NCM e CFOP",
    },
    {
      path: "/admin/dashboard/configuracoes",
      icon: Settings,
      label: "Configurações",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col transition-all duration-300 relative z-20">
        <div className="h-20 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-agro-primary rounded-xl flex items-center justify-center shadow-inner">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-800">
                AgroPops
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-agro-secondary font-bold">
                Admin
              </p>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto px-3">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                  isActive
                    ? "bg-agro-secondary/10 text-agro-secondary border-r-4 border-agro-secondary"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            Sair do Sistema
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800">
            Painel de Administração
          </h2>
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-gray-800">Administrador</p>
              <p className="text-xs text-gray-500">Acesso Total</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-agro-secondary/10 text-agro-secondary flex items-center justify-center font-bold border border-emerald-100">
              AD
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
