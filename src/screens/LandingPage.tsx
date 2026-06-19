import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Shield,
  Zap,
  BarChart3,
  FileCheck,
  ChevronDown,
  Check,
  Leaf,
  Building2,
  Cpu,
  UserPlus,
  RefreshCw,
  Smartphone,
  FileText,
} from "lucide-react";

// ── Intersection observer hook com suporte a delay e direção ────────────────
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setInView(true);
      },
      { threshold },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── Animação reutilizável ───────────────────────────────────────────────────
function fadeUp(inView: boolean, delay = 0, distance = 36) {
  return {
    opacity: inView ? 1 : 0,
    transform: inView ? "translateY(0px)" : `translateY(${distance}px)`,
    transition: `opacity 0.75s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.75s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
  };
}

function fadeIn(inView: boolean, delay = 0) {
  return {
    opacity: inView ? 1 : 0,
    transition: `opacity 0.65s ease ${delay}ms`,
  };
}

// ── Apple SVG Logo ──────────────────────────────────────────────────────────
function AppleLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 814 1000"
      fill="white"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-194.3 127.4-297.5 252.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}

// ── Google SVG Logo ─────────────────────────────────────────────────────────
function GoogleLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

// ── NavBar ──────────────────────────────────────────────────────────────────
function NavBar({
  scrolled,
  onLoginClick,
}: {
  scrolled: boolean;
  onLoginClick: () => void;
}) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(17,53,34,0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "none",
        boxShadow: scrolled ? "0 4px 32px rgba(0,0,0,0.3)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <img
            src="/logo.png"
            alt="AgroContábil"
            className="h-9 w-auto object-contain"
          />
        </div>

        <div className="hidden md:flex items-center gap-8">
          {["Início", "Funcionalidades", "Como Funciona", "Aplicativo", "Contato"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/ /g, "-")}`}
              className="text-white/70 hover:text-white text-sm font-medium transition-colors cursor-pointer"
            >
              {item}
            </a>
          ))}
        </div>

        <button
          onClick={onLoginClick}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95"
        >
          Acessar Painel <ArrowRight size={16} />
        </button>
      </div>
    </nav>
  );
}

// ── Feature Card ────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  title,
  description,
  accent,
  delay,
  inView,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
  delay: number;
  inView: boolean;
}) {
  return (
    <div
      className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 group cursor-default"
      style={fadeUp(inView, delay, 40)}
    >
      <div
        className={`w-12 h-12 rounded-xl ${accent} flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}
      >
        <Icon size={22} />
      </div>
      <h3 className="font-bold text-gray-800 text-lg mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

// ── How It Works Step ───────────────────────────────────────────────────────
function HowStep({
  icon: Icon,
  num,
  title,
  desc,
  delay,
  inView,
  accent,
}: {
  icon: React.ElementType;
  num: string;
  title: string;
  desc: string;
  delay: number;
  inView: boolean;
  accent: string;
}) {
  return (
    <div
      className="flex flex-col items-center text-center"
      style={fadeUp(inView, delay, 44)}
    >
      {/* Icon circle */}
      <div className="relative mb-6">
        <div
          className={`w-20 h-20 rounded-2xl ${accent} flex items-center justify-center shadow-lg`}
        >
          <Icon size={32} />
        </div>
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-400 text-emerald-950 flex items-center justify-center font-black text-xs shadow-md">
          {num}
        </div>
      </div>

      {/* Título: branco puro para máximo contraste */}
      <h3 className="font-bold text-white text-base mb-2 leading-tight">
        {title}
      </h3>

      {/* Descrição: verde-esmeralda claro para boa leitura no fundo escuro */}
      <p className="text-emerald-100/80 text-sm leading-relaxed max-w-[200px]">
        {desc}
      </p>
    </div>
  );
}

// ── Linha conectora animada ─────────────────────────────────────────────────
function ConnectorLine({ inView }: { inView: boolean }) {
  return (
    <div
      className="absolute top-10 left-[14%] right-[14%] h-px hidden lg:block overflow-hidden"
    >
      <div
        style={{
          height: "1px",
          background: "linear-gradient(to right, transparent, rgba(74,222,128,0.5), rgba(167,243,208,0.7), rgba(74,222,128,0.5), transparent)",
          transform: inView ? "scaleX(1)" : "scaleX(0)",
          transformOrigin: "left",
          transition: "transform 1.2s cubic-bezier(0.22,1,0.36,1) 200ms",
        }}
      />
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  const { ref: howRef, inView: howInView } = useInView();
  const { ref: featuresRef, inView: featuresInView } = useInView();
  const { ref: ctaRef, inView: ctaInView } = useInView();

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Animação do hero com curva suave
  const heroAnim = (delay: number, distance = 24) => ({
    opacity: heroVisible ? 1 : 0,
    transform: heroVisible ? "translateY(0px)" : `translateY(${distance}px)`,
    transition: `opacity 0.9s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.9s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
  });

  const features = [
    {
      icon: FileCheck,
      title: "Livro Caixa Automático",
      description:
        "Todas as notas do produtor são capturadas direto da SEFAZ via certificado A1 e classificadas automaticamente para o LCDPR.",
      accent: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: Zap,
      title: "NFP-e por Voz ou Texto",
      description:
        "O produtor emite notas pelo app apenas descrevendo a venda. Nosso sistema extrai os dados, assina e envia à SEFAZ em segundos.",
      accent: "bg-amber-50 text-amber-600",
    },
    {
      icon: Shield,
      title: "Certificado A1 Seguro",
      description:
        "O certificado fica criptografado com segurança no servidor. Nenhuma nota é emitida sem autorização, com log completo de auditoria.",
      accent: "bg-blue-50 text-blue-600",
    },
    {
      icon: BarChart3,
      title: "Painel do Contador",
      description:
        "Visão consolidada de todos os produtores. Acompanhe entradas, saídas e dedutibilidade fiscal em tempo real.",
      accent: "bg-violet-50 text-violet-600",
    },
    {
      icon: Leaf,
      title: "Pronto para o CNPJ Rural",
      description:
        "Preparado para a obrigatoriedade do CNPJ rural em 2026. Migração automática sem perda do histórico fiscal.",
      accent: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: Building2,
      title: "Multi-produtor",
      description:
        "Gerencie toda a sua carteira de clientes rurais em um único painel, com alternância instantânea entre produtores.",
      accent: "bg-rose-50 text-rose-600",
    },
  ];

  const steps = [
    {
      icon: UserPlus,
      num: "01",
      title: "Contador cadastra o produtor",
      desc: "Insere CPF/CNPJ, Inscrição Estadual e faz upload do certificado A1 em menos de 2 minutos.",
      accent: "bg-emerald-500/20 text-emerald-300",
    },
    {
      icon: RefreshCw,
      num: "02",
      title: "SEFAZ sincroniza automaticamente",
      desc: "O sistema varre a SEFAZ e importa todas as notas de entrada e saída do produtor automaticamente.",
      accent: "bg-sky-500/20 text-sky-300",
    },
    {
      icon: Smartphone,
      num: "03",
      title: "Produtor acessa pelo app",
      desc: "Acompanha saldo, extrato e dedutibilidade no celular. Emite novas notas por voz ou texto.",
      accent: "bg-violet-500/20 text-violet-300",
    },
    {
      icon: FileText,
      num: "04",
      title: "Relatórios prontos para entrega",
      desc: "LCDPR, DDA e relatórios fiscais gerados automaticamente, prontos para o cliente.",
      accent: "bg-amber-500/20 text-amber-300",
    },
  ];

  return (
    <div className="min-h-screen font-sans antialiased overflow-x-hidden">
      <NavBar scrolled={scrolled} onLoginClick={() => navigate("/login")} />

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/fundoagro.png)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(10,40,20,0.96) 0%, rgba(17,60,32,0.88) 40%, rgba(17,60,32,0.55) 65%, rgba(0,0,0,0.15) 100%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-40"
          style={{
            background: "linear-gradient(to bottom, transparent, #004F3B)",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16 grid lg:grid-cols-2 gap-12 items-center min-h-screen">
          <div>
            <div
              className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold px-4 py-2 rounded-full mb-8 tracking-widest"
              style={heroAnim(0)}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              CNPJ RURAL OBRIGATÓRIO — JULHO 2026
            </div>

            <h1
              className="text-5xl lg:text-6xl font-black text-white leading-[1.05] mb-6"
              style={heroAnim(140)}
            >
              O aplicativo digital
              <br />
              <span className="text-emerald-400">do produtor</span>
              <br />
              rural.
            </h1>

            <p
              className="text-emerald-100/75 text-lg leading-relaxed mb-10 max-w-md"
              style={heroAnim(260)}
            >
              Automatize o LCDPR, emita NFP-e por voz e gerencie toda a carteira
              de produtores rurais em um único painel para contadores.
            </p>

            <div className="flex flex-col sm:flex-row gap-4" style={heroAnim(380)}>
              <button
                onClick={() => navigate("/login")}
                className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-xl text-base transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/40 active:scale-95"
              >
                Entrar Agora! <ArrowRight size={18} />
              </button>
              <button className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl text-base transition-all duration-200 backdrop-blur-sm">
                Entre em Contato
              </button>
            </div>

            <div
              className="mt-10 flex flex-wrap items-center gap-6"
              style={fadeIn(heroVisible, 500)}
            >
              {[
                "Integração SEFAZ",
                "Suporte a Certificado A1",
                "LCDPR automático",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-emerald-300/80 text-sm"
                >
                  <Check size={14} className="text-emerald-400 flex-shrink-0" />{" "}
                  {item}
                </div>
              ))}
            </div>
          </div>

            {/* ── Screenshot animado do app ─────────────────────────────── */}
          <div
            className="hidden lg:flex items-center justify-center"
            style={{
              opacity: heroVisible ? 1 : 0,
              transition: 'opacity 1s ease 480ms',
            }}
          >
            {/* Wrapper com perspectiva para o efeito 3-D sutil */}
            <div
              style={{ perspective: '900px' }}
              className="w-full max-w-[740px]"
            >
              {/* Camada externa: rotação suave + float contínuo */}
              <div
                style={{
                  position: 'relative',
                  transform: heroVisible
                    ? 'rotateY(-4deg) rotateX(2deg)'
                    : 'rotateY(-4deg) rotateX(2deg) translateY(40px)',
                  transition: 'transform 1.1s cubic-bezier(0.22,1,0.36,1) 520ms',
                  animation: heroVisible ? 'float-screen 5s ease-in-out infinite' : 'none',
                  animationDelay: '1.6s',
                  willChange: 'transform',
                }}
              >
                {/* Glow atrás da imagem */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '-24px',
                    borderRadius: '32px',
                    background: 'radial-gradient(ellipse at 50% 60%, rgba(52,211,153,0.28) 0%, rgba(16,185,129,0.10) 55%, transparent 80%)',
                    filter: 'blur(18px)',
                    animation: 'glow-pulse 4s ease-in-out infinite',
                    animationDelay: '1.8s',
                    zIndex: 0,
                  }}
                />
 
                {/* Container da imagem com borda e sombra premium */}
                <div
                  className="relative overflow-hidden"
                  style={{
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.18)',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(52,211,153,0.12), inset 0 1px 0 rgba(255,255,255,0.1)',
                    zIndex: 1,
                  }}
                >
                  {/* A imagem real do sistema */}
                  <img
                    src="/imagem-agro-web.png"
                    alt="Painel AgroContábil"
                    className="w-full h-auto block"
                    style={{ display: 'block' }}
                    draggable={false}
                  />
 
                  {/* Shimmer — brilho que passa da esquerda para a direita */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                      zIndex: 2,
                      overflow: 'hidden',
                      borderRadius: '20px',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        width: '45%',
                        background: 'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.09) 45%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.09) 55%, transparent 100%)',
                        animation: 'shimmer-pass 4.5s cubic-bezier(0.4,0,0.2,1) infinite',
                        animationDelay: '2.2s',
                      }}
                    />
                  </div>
 
                  {/* Vignette suave nas bordas para integrar ao fundo escuro */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '20px',
                      background: 'linear-gradient(180deg, rgba(0,0,0,0.04) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.12) 100%)',
                      pointerEvents: 'none',
                      zIndex: 3,
                    }}
                  />
                </div>
 
                {/* Badge "SEFAZ conectado" flutuando sobre a imagem */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-14px',
                    left: '24px',
                    zIndex: 10,
                    opacity: heroVisible ? 1 : 0,
                    transform: heroVisible ? 'translateY(0)' : 'translateY(12px)',
                    transition: 'opacity 0.7s ease 1.3s, transform 0.7s ease 1.3s',
                  }}
                >
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                    style={{
                      background: 'rgba(6,42,20,0.85)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(52,211,153,0.35)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                      color: '#6ee7b7',
                    }}
                  >
                    <span
                      style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: '#34d399',
                        boxShadow: '0 0 6px #34d399',
                        display: 'inline-block',
                        animation: 'glow-pulse 2s ease-in-out infinite',
                      }}
                    />
                    Sistemas Conectados!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
 

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/40">
          <span className="text-[10px] tracking-widest">SCROLL</span>
          <ChevronDown size={16} className="animate-bounce" />
        </div>
      </section>

      {/* ── COMO FUNCIONA ───────────────────────────────────────────────── */}
      <section id="como-funciona" className="py-24 bg-emerald-900" ref={howRef}>
        <div className="max-w-6xl mx-auto px-6">
          {/* Cabeçalho da seção */}
          <div
            className="text-center mb-16"
            style={fadeUp(howInView, 0, 28)}
          >
            <span className="text-emerald-400 text-xs font-bold tracking-widest uppercase">
              Como Funciona
            </span>
            <h2 className="text-3xl font-black text-white mt-3">
              Em 4 passos, tudo automatizado
            </h2>
            <p className="text-emerald-100/60 mt-4 max-w-xl mx-auto text-sm leading-relaxed">
              Do cadastro do produtor ao relatório fiscal entregue — sem
              planilhas manuais, sem retrabalho.
            </p>
          </div>

          {/* Steps grid */}
          <div className="relative">
            <ConnectorLine inView={howInView} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
              {steps.map((step, i) => (
                <HowStep key={i} {...step} delay={i * 130 + 100} inView={howInView} />
              ))}
            </div>
          </div>

          {/* Botões de download com logos reais ──────────────────────── */}
          <div
            className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-4"
            style={fadeUp(howInView, 700, 20)}
          >
            {/* App Store */}
            <button className="flex items-center gap-3 bg-white/10 hover:bg-white/18 border border-white/20 hover:border-white/35 rounded-2xl px-5 py-3 transition-all duration-200 hover:scale-105 active:scale-95 group">
              <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center group-hover:bg-gray-900 transition-colors duration-200">
                <AppleLogo size={22} />
              </div>
              <div className="text-left">
                <div className="text-[10px] text-emerald-300/60 uppercase tracking-wider font-semibold leading-none mb-0.5">
                  Disponível na
                </div>
                <div className="text-white font-bold text-sm leading-none">
                  App Store
                </div>
              </div>
            </button>

            {/* Google Play */}
            <button className="flex items-center gap-3 bg-white/10 hover:bg-white/18 border border-white/20 hover:border-white/35 rounded-2xl px-5 py-3 transition-all duration-200 hover:scale-105 active:scale-95 group">
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center group-hover:bg-gray-100 transition-colors duration-200">
                <GoogleLogo size={22} />
              </div>
              <div className="text-left">
                <div className="text-[10px] text-emerald-300/60 uppercase tracking-wider font-semibold leading-none mb-0.5">
                  Disponível no
                </div>
                <div className="text-white font-bold text-sm leading-none">
                  Google Play
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section
        id="funcionalidades"
        className="py-24 bg-gray-50"
        ref={featuresRef}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div
            className="text-center mb-16"
            style={fadeUp(featuresInView, 0, 28)}
          >
            <span className="text-emerald-600 text-xs font-bold tracking-widest uppercase">
              Funcionalidades
            </span>
            <h2 className="text-3xl font-black text-gray-800 mt-3">
              Tudo que contador e produtor precisam
            </h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto text-sm leading-relaxed">
              Automatize a gestão fiscal do produtor rural de ponta a ponta,
              facilitando o gerenciamento de ambos os lados.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <FeatureCard
                key={i}
                {...f}
                delay={i * 90}
                inView={featuresInView}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────────────────────── */}
      <section
        ref={ctaRef}
        className="relative py-28 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0f3521 0%, #1a5c38 50%, #0f3521 100%)",
        }}
      >
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full bg-emerald-500/10 -translate-y-1/2 translate-x-1/2"
          style={fadeIn(ctaInView, 400)}
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-amber-400/10 translate-y-1/2 -translate-x-1/2"
          style={fadeIn(ctaInView, 600)}
        />

        <div
          className="relative max-w-3xl mx-auto px-6 text-center"
          style={fadeUp(ctaInView, 0, 40)}
        >
          <div
            className="inline-flex items-center justify-center w-16 h-16 bg-emerald-400/20 rounded-2xl mb-6"
            style={fadeUp(ctaInView, 100, 24)}
          >
            <Cpu size={28} className="text-emerald-400" />
          </div>
          <h2
            className="text-4xl font-black text-white mb-4"
            style={fadeUp(ctaInView, 200, 28)}
          >
            Cadastre seu escritório hoje.
            <br />
            <span className="text-emerald-400">Seus clientes agradecem.</span>
          </h2>
          <p
            className="text-emerald-100/60 mb-10 text-lg max-w-lg mx-auto"
            style={fadeUp(ctaInView, 320, 24)}
          >
            Prepare sua carteira de produtores rurais para o CNPJ obrigatório de
            2026 sem burocracia.
          </p>
          <div style={fadeUp(ctaInView, 440, 20)}>
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-10 py-4 rounded-xl text-lg transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-95"
            >
              Acesse o sistema! <ArrowRight size={20} />
            </button>
          </div>
          <p
            className="text-emerald-100/40 text-sm mt-6"
            style={fadeIn(ctaInView, 560)}
          >
            Para mais informações, acesse nosso contato na seção fixada no topo.
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img
            src="/logo.png"
            alt="AgroContábil"
            className="h-15 w-auto object-contain opacity-60"
          />
          <p className="text-xs text-center">
            © 2026 AgroContábil. Desenvolvido para o produtor rural brasileiro.
          </p>
          <div className="flex gap-6 text-xs">
            {["Privacidade", "Termos", "Suporte"].map((item) => (
              <a
                key={item}
                href="#"
                className="hover:text-white transition-colors"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}