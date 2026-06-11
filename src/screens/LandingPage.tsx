import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Shield, Zap, BarChart3, FileCheck,
  ChevronDown, Check, Leaf, Building2, Cpu,
} from 'lucide-react';

// ── Animated counter hook ───────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800, started = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);
  return count;
}

// ── Intersection observer hook ──────────────────────────────────────────────
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── Sub-components ──────────────────────────────────────────────────────────
function StatCard({ value, suffix, label, delay, started }: {
  value: number; suffix: string; label: string; delay: number; started: boolean;
}) {
  const count = useCountUp(value, 1800, started);
  return (
    <div className="text-center" style={{
      opacity: started ? 1 : 0,
      transform: started ? 'translateY(0)' : 'translateY(20px)',
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
    }}>
      <div className="text-4xl font-black text-white tracking-tight">
        {count.toLocaleString('pt-BR')}{suffix}
      </div>
      <div className="text-emerald-200/70 text-sm mt-1 font-medium">{label}</div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, accent, delay, inView }: {
  icon: React.ElementType; title: string; description: string;
  accent: string; delay: number; inView: boolean;
}) {
  return (
    <div
      className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      <div className={`w-12 h-12 rounded-xl ${accent} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={22} />
      </div>
      <h3 className="font-bold text-gray-800 text-lg mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function NavBar({ scrolled, onLoginClick }: { scrolled: boolean; onLoginClick: () => void }) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(17,53,34,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
        boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center font-black text-emerald-950 text-sm">A</div>
          <span className="font-bold text-white tracking-wider text-sm">Agro POPs</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {['Funcionalidades', 'Para Contadores', 'Planos'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`}
              className="text-white/70 hover:text-white text-sm font-medium transition-colors cursor-pointer">
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

// ── Main Component ──────────────────────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [statsStarted, setStatsStarted] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const { ref: featuresRef, inView: featuresInView } = useInView();
  const { ref: howItWorksRef, inView: howItWorksInView } = useInView();
  const { ref: ctaRef, inView: ctaInView } = useInView();

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setStatsStarted(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  const features = [
    { icon: FileCheck, title: 'Livro Caixa Automático', description: 'Todas as notas do produtor são capturadas direto da SEFAZ via certificado A1 e classificadas automaticamente para o LCDPR.', accent: 'bg-emerald-50 text-emerald-600' },
    { icon: Zap, title: 'NFP-e por Voz ou Texto', description: 'O produtor emite notas pelo app apenas descrevendo a venda. Nossa IA extrai os dados, assina e envia à SEFAZ em segundos.', accent: 'bg-amber-50 text-amber-600' },
    { icon: Shield, title: 'Certificado A1 Seguro', description: 'O certificado fica criptografado no servidor. Nenhuma nota é emitida sem autorização, com log completo de auditoria.', accent: 'bg-blue-50 text-blue-600' },
    { icon: BarChart3, title: 'Painel do Contador', description: 'Visão consolidada de todos os produtores em uma interface. Acompanhe entradas, saídas e dedutibilidade em tempo real.', accent: 'bg-violet-50 text-violet-600' },
    { icon: Leaf, title: 'Pronto para o CNPJ Rural', description: 'Preparado para a obrigatoriedade do CNPJ rural em julho de 2026. Migração automática sem perda do histórico fiscal.', accent: 'bg-emerald-50 text-emerald-600' },
    { icon: Building2, title: 'Multi-produtor', description: 'Gerencie toda a sua carteira de clientes rurais em um único painel, com alternância instantânea entre produtores.', accent: 'bg-rose-50 text-rose-600' },
  ];

  const steps = [
    { num: '01', title: 'Contador cadastra o produtor', desc: 'Insere CPF/CNPJ, Inscrição Estadual e faz upload do certificado A1. Leva menos de 2 minutos.' },
    { num: '02', title: 'SEFAZ sincroniza automaticamente', desc: 'O sistema varre a SEFAZ e importa todas as notas de entrada e saída vinculadas ao documento fiscal.' },
    { num: '03', title: 'Produtor acessa pelo app', desc: 'Vê saldo, extrato e dedutibilidade no celular. Emite novas notas apenas falando ou digitando.' },
    { num: '04', title: 'Contador recebe relatórios prontos', desc: 'LCDPR, DDA e relatórios fiscais gerados automaticamente, prontos para entrega ao cliente.' },
  ];

  const anim = (delay: number) => ({
    opacity: heroVisible ? 1 : 0,
    transform: heroVisible ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms`,
  });

  return (
    <div className="min-h-screen font-sans antialiased overflow-x-hidden">
      <NavBar scrolled={scrolled} onLoginClick={() => navigate('/login')} />

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/fundoagro.png)' }}
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(105deg, rgba(10,40,20,0.96) 0%, rgba(17,60,32,0.88) 40%, rgba(17,60,32,0.55) 65%, rgba(0,0,0,0.15) 100%)',
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-40" style={{
          background: 'linear-gradient(to bottom, transparent, #F5F7FA)',
        }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16 grid lg:grid-cols-2 gap-12 items-center min-h-screen">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold px-4 py-2 rounded-full mb-8 tracking-widest"
              style={anim(0)}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              PRONTO PARA O CNPJ RURAL 2026
            </div>

            <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.05] mb-6" style={anim(120)}>
              O banco digital<br />
              <span className="text-emerald-400">do produtor</span><br />
              rural.
            </h1>

            <p className="text-emerald-100/75 text-lg leading-relaxed mb-10 max-w-md" style={anim(240)}>
              Automatize o LCDPR, emita NFP-e por voz e gerencie toda a carteira
              de produtores rurais em um único painel para contadores.
            </p>

            <div className="flex flex-col sm:flex-row gap-4" style={anim(360)}>
              <button onClick={() => navigate('/login')}
                className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-xl text-base transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/40 active:scale-95">
                Começar Agora — É Grátis <ArrowRight size={18} />
              </button>
              <button className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl text-base transition-all duration-200 backdrop-blur-sm">
                Ver Demonstração
              </button>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6" style={{ opacity: heroVisible ? 1 : 0, transition: 'opacity 0.8s ease 480ms' }}>
              {['Integração SEFAZ', 'Suporte a Certificado A1', 'LCDPR automático'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-emerald-300/80 text-sm">
                  <Check size={14} className="text-emerald-400 flex-shrink-0" /> {item}
                </div>
              ))}
            </div>
          </div>

          {/* Floating dashboard card */}
          <div className="hidden lg:block" style={anim(500)}>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white/70 text-xs font-medium">SEFAZ Conectado</span>
                </div>
                <span className="text-white/40 text-xs">João Silva • Chácara Vista Alegre</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Saldo', value: 'R$ 45.230', color: 'text-white' },
                  { label: 'Entradas', value: 'R$ 62.000', color: 'text-emerald-400' },
                  { label: 'Saídas', value: 'R$ 16.770', color: 'text-rose-400' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/10 rounded-xl p-3 text-center">
                    <div className={`font-black text-sm ${stat.color}`}>{stat.value}</div>
                    <div className="text-white/40 text-[10px] mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white/5 rounded-xl p-4 mb-3">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-emerald-400 font-semibold">Dedutível LCDPR • 74%</span>
                  <span className="text-rose-400 font-semibold">Pessoal • 26%</span>
                </div>
                <div className="h-3 bg-rose-500/30 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full"
                    style={{ width: heroVisible ? '74%' : '0%', transition: 'width 1.5s ease 800ms' }} />
                </div>
              </div>
              {[
                { icon: '↑', label: 'Venda de Soja', value: '+ R$ 35.000', bg: 'bg-emerald-500/20', color: 'text-emerald-400' },
                { icon: '↓', label: 'Adubo NPK', value: '- R$ 8.500', bg: 'bg-rose-500/20', color: 'text-rose-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center text-xs font-bold ${item.color}`}>{item.icon}</div>
                    <span className="text-white/70 text-xs">{item.label}</span>
                  </div>
                  <span className={`text-xs font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/40">
          <span className="text-[10px] tracking-widest">SCROLL</span>
          <ChevronDown size={16} className="animate-bounce" />
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────────────────── */}
      <section ref={statsRef} className="bg-emerald-800 py-16">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatCard value={1200} suffix="+" label="Produtores Ativos" delay={0} started={statsStarted} />
          <StatCard value={98} suffix="%" label="Satisfação dos Contadores" delay={120} started={statsStarted} />
          <StatCard value={47000} suffix="+" label="NFP-e Emitidas" delay={240} started={statsStarted} />
          <StatCard value={32} suffix="%" label="Redução de Impostos" delay={360} started={statsStarted} />
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section id="funcionalidades" className="py-24 bg-gray-50" ref={featuresRef}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16" style={{
            opacity: featuresInView ? 1 : 0,
            transform: featuresInView ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}>
            <span className="text-emerald-600 text-xs font-bold tracking-widest uppercase">Funcionalidades</span>
            <h2 className="text-3xl font-black text-gray-800 mt-3">Tudo que contador e produtor precisam</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">De Pinheiro Preto a Xanxerê — automatize a gestão fiscal do produtor rural catarinense de ponta a ponta.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => <FeatureCard key={i} {...f} delay={i * 80} inView={featuresInView} />)}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="para-contadores" className="py-24 bg-white" ref={howItWorksRef}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16" style={{
            opacity: howItWorksInView ? 1 : 0,
            transform: howItWorksInView ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}>
            <span className="text-emerald-600 text-xs font-bold tracking-widest uppercase">Como Funciona</span>
            <h2 className="text-3xl font-black text-gray-800 mt-3">Em 4 passos, tudo automatizado</h2>
          </div>
          <div className="relative">
            <div className="absolute top-10 left-[calc(12.5%+1rem)] right-[calc(12.5%+1rem)] h-0.5 bg-emerald-100 hidden md:block" />
            <div className="grid md:grid-cols-4 gap-8">
              {steps.map((step, i) => (
                <div key={i} style={{
                  opacity: howItWorksInView ? 1 : 0,
                  transform: howItWorksInView ? 'translateY(0)' : 'translateY(32px)',
                  transition: `opacity 0.7s ease ${i * 120}ms, transform 0.7s ease ${i * 120}ms`,
                }}>
                  <div className="flex justify-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm relative z-10 shadow-lg shadow-emerald-200">
                      {step.num}
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-800 text-center text-sm mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-xs text-center leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section ref={ctaRef} className="relative py-28 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f3521 0%, #1a5c38 50%, #0f3521 100%)' }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-emerald-500/10 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-amber-400/10 translate-y-1/2 -translate-x-1/2" />
        <div className="relative max-w-3xl mx-auto px-6 text-center" style={{
          opacity: ctaInView ? 1 : 0,
          transform: ctaInView ? 'translateY(0)' : 'translateY(32px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-400/20 rounded-2xl mb-6">
            <Cpu size={28} className="text-emerald-400" />
          </div>
          <h2 className="text-4xl font-black text-white mb-4">
            Cadastre seu escritório hoje.<br />
            <span className="text-emerald-400">Seus clientes agradecem.</span>
          </h2>
          <p className="text-emerald-100/60 mb-10 text-lg max-w-lg mx-auto">
            Contadores de Santa Catarina já estão economizando horas por semana e entregando mais valor ao produtor rural.
          </p>
          <button onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-10 py-4 rounded-xl text-lg transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-95">
            Criar Conta Gratuita <ArrowRight size={20} />
          </button>
          <p className="text-emerald-100/40 text-sm mt-4">Sem cartão de crédito. Sem burocracia.</p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-white text-xs">A</div>
            <span className="font-bold text-white text-sm tracking-wider">Agro POPs</span>
          </div>
          <p className="text-xs text-center">© 2026 Agro Pops. Desenvolvido para o produtor rural brasileiro.</p>
          <div className="flex gap-6 text-xs">
            {['Privacidade', 'Termos', 'Suporte'].map((item) => (
              <a key={item} href="#" className="hover:text-white transition-colors">{item}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}