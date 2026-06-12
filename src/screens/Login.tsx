import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, ArrowRight, Shield, ChevronLeft, Loader2, AlertCircle,
  Wifi, Mic, FileCheck,
} from 'lucide-react';

// ── Floating label input ──────────────────────────────────────────────────
function FloatingInput({
  id, label, type = 'text', value, onChange, onBlur, error, autoComplete, suffix, disabled = false,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; onBlur?: () => void; error?: string;
  autoComplete?: string; suffix?: React.ReactNode; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <label
          htmlFor={id}
          className="absolute left-4 transition-all duration-200 pointer-events-none select-none z-10"
          style={{
            top: lifted ? '8px' : '50%',
            transform: lifted ? 'translateY(0)' : 'translateY(-50%)',
            fontSize: lifted ? '10px' : '14px',
            fontWeight: lifted ? 700 : 400,
            color: error ? '#e11d48' : focused ? '#059669' : '#9ca3af',
            letterSpacing: lifted ? '0.05em' : '0',
            textTransform: lifted ? 'uppercase' : 'none',
          }}
        >
          {label}
        </label>
        <input
          id={id} type={type} value={value} disabled={disabled} autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          className={`w-full pt-6 pb-2.5 px-4 rounded-xl border-2 text-sm font-semibold text-gray-800 outline-none transition-all duration-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed ${suffix ? 'pr-12' : ''} ${
            error
              ? 'border-rose-400 bg-rose-50/30'
              : focused
              ? 'border-emerald-500 shadow-sm shadow-emerald-500/20'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-rose-500 text-xs font-medium pl-1">
          <AlertCircle size={12} /> {error}
        </div>
      )}
    </div>
  );
}

// ── Product highlights (replace testimonials) ─────────────────────────────
const highlights = [
  {
    icon: Wifi,
    title: 'SEFAZ sempre atualizado',
    desc: 'O backend varre a SEFAZ automaticamente e sincroniza todas as notas de entrada e saída do produtor em tempo real no painel e no app.',
    accent: 'bg-emerald-500/20 text-emerald-300',
  },
  {
    icon: Mic,
    title: 'NFP-e por voz ou texto',
    desc: 'O produtor abre o app, descreve a venda como numa mensagem de WhatsApp — áudio ou texto — e a nota é gerada, assinada e enviada à SEFAZ em segundos.',
    accent: 'bg-sky-500/20 text-sky-300',
  },
  {
    icon: FileCheck,
    title: 'LCDPR gerado automaticamente',
    desc: 'Entradas, saídas e dedutibilidade são classificadas automaticamente. O Livro Caixa fica pronto para entrega sem nenhum lançamento manual.',
    accent: 'bg-violet-500/20 text-violet-300',
  },
];

// ── Animated highlight card ───────────────────────────────────────────────
function HighlightCard({
  icon: Icon, title, desc, accent, active,
}: {
  icon: React.ElementType; title: string; desc: string; accent: string; active: boolean;
}) {
  return (
    <div
      className="flex items-start gap-4 p-4 rounded-2xl border transition-all duration-500"
      style={{
        borderColor: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
        background: active ? 'rgba(255,255,255,0.09)' : 'transparent',
        opacity: active ? 1 : 0.5,
        transform: active ? 'translateX(0)' : 'translateX(-6px)',
      }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-white font-bold text-sm mb-1">{title}</div>
        <div className="text-emerald-100/55 text-xs leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [activeCard, setActiveCard] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % highlights.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const validateEmail = () => {
    if (!email) { setEmailError('Informe seu e-mail'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('E-mail inválido'); return false; }
    setEmailError(''); return true;
  };
  const validatePassword = () => {
    if (!password) { setPasswordError('Informe sua senha'); return false; }
    if (password.length < 6) { setPasswordError('Mínimo 6 caracteres'); return false; }
    setPasswordError(''); return true;
  };

  const handleSubmit = async () => {
    const ok = validateEmail() && validatePassword();
    if (!ok) return;
    setIsLoading(true);
    setGlobalError('');
    await new Promise((r) => setTimeout(r, 1500));
    // TODO: substituir pelo call real à API Java
    navigate('/');
    setIsLoading(false);
  };

  const anim = (delay: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(22px)',
    transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
  });

  return (
    <div className="min-h-screen flex font-sans antialiased overflow-hidden bg-gray-50">

      {/* ── LEFT: Form ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative z-10 bg-white">
        <button
          onClick={() => navigate('/landing')}
          className="absolute top-6 left-6 flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Voltar
        </button>

        <div className="w-full max-w-sm">
          {/* Logo */}
          <div style={anim(0)} className="flex items-center gap-3 mb-10">
            <img src="/logo.png" alt="AgroContábil" className="h-10 w-auto object-contain" />
            <h1 className="text-2xl font-black text-gray-800 mb-1">Agro POPs</h1>
          </div>

          <div style={anim(80)}>
            <h1 className="text-2xl font-black text-gray-800 mb-1">Bem-vindo de volta</h1>
            <p className="text-gray-400 text-sm mb-8">
              Acesse seu escritório e gerencie sua carteira de produtores rurais.
            </p>
          </div>

          {/* Global error */}
          {globalError && (
            <div className="mb-5 flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium px-4 py-3 rounded-xl">
              <AlertCircle size={16} className="flex-shrink-0" /> {globalError}
            </div>
          )}

          {/* Inputs */}
          <div className="space-y-4" style={anim(160)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}>
            <FloatingInput
              id="email" label="E-mail do contador" type="email" value={email}
              onChange={(v) => { setEmail(v); if (emailError) setEmailError(''); }}
              onBlur={validateEmail} error={emailError} autoComplete="email" disabled={isLoading}
            />
            <FloatingInput
              id="password" label="Senha" type={showPassword ? 'text' : 'password'} value={password}
              onChange={(v) => { setPassword(v); if (passwordError) setPasswordError(''); }}
              onBlur={validatePassword} error={passwordError} autoComplete="current-password" disabled={isLoading}
              suffix={
                <button
                  type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
          </div>

          {/* Remember + Forgot */}
          <div className="flex items-center justify-between mt-3 mb-6" style={anim(220)}>
            <label className="flex items-center gap-2 cursor-pointer group">
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors ${rememberMe ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 group-hover:border-emerald-400'}`}
                onClick={() => setRememberMe(!rememberMe)}
              >
                {rememberMe && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-500 select-none">Lembrar acesso</span>
            </label>
            <button className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">
              Esqueci a senha
            </button>
          </div>

          {/* Submit */}
          <div style={anim(280)}>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl text-white text-sm transition-all duration-200 ${
                isLoading
                  ? 'bg-emerald-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] hover:shadow-lg hover:shadow-emerald-500/25'
              }`}
            >
              {isLoading
                ? <><Loader2 size={18} className="animate-spin" /> Verificando credenciais...</>
                : <>Entrar no painel <ArrowRight size={18} /></>
              }
            </button>
          </div>

          <div className="flex items-center gap-4 my-6" style={anim(340)}>
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">OU</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <div className="text-center" style={anim(380)}>
            <p className="text-sm text-gray-400">
              Primeiro acesso?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
              >
                Criar conta do escritório
              </button>
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-gray-300 text-xs" style={anim(420)}>
            <Shield size={12} />
            <span>Acesso protegido com criptografia SSL/TLS</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Background + Product highlights ───────────────────── */}
      <div
        className="hidden lg:flex flex-1 relative flex-col justify-end overflow-hidden"
        style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.9s ease 150ms' }}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/fundoagro.png)' }} />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(5,25,12,0.4) 0%, rgba(5,25,12,0.75) 55%, rgba(5,25,12,0.97) 100%)' }}
        />

        <div className="relative z-10 p-12 pb-10">
          {/* Headline */}
          <div style={anim(300)}>
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/25 text-emerald-300 text-[10px] font-bold px-3 py-1.5 rounded-full mb-5 tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              CNPJ rural obrigatório — julho 2026
            </div>
            <h2 className="text-4xl font-black text-white leading-tight mb-3">
              Gestão fiscal do campo,
              <br /><span className="text-emerald-400">simplificada.</span>
            </h2>
            <p className="text-emerald-100/55 text-sm max-w-md mb-8 leading-relaxed">
              Uma plataforma para o contador gerenciar toda a carteira de produtores rurais — do certificado A1 ao LCDPR — enquanto o produtor faz tudo pelo celular.
            </p>
          </div>

          {/* Highlight cards */}
          <div className="space-y-3 mb-8" style={anim(440)}>
            {highlights.map((h, i) => (
              <HighlightCard key={i} {...h} active={activeCard === i} />
            ))}
          </div>

          {/* Dots */}
          <div className="flex gap-1.5 mb-8" style={anim(500)}>
            {highlights.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveCard(i)}
                className={`rounded-full transition-all duration-300 ${i === activeCard ? 'w-5 h-1.5 bg-emerald-400' : 'w-1.5 h-1.5 bg-white/25 hover:bg-white/40'}`}
              />
            ))}
          </div>

          {/* Stats strip */}
          <div className="flex items-center gap-6" style={anim(560)}>
            {[
              { label: 'Produtores ativos', value: '1.200+' },
              { label: 'Notas emitidas', value: '18.000+' },
              { label: 'Estados', value: 'SC e RS' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-white font-black text-lg leading-none">{s.value}</div>
                <div className="text-emerald-100/40 text-[10px] mt-0.5 uppercase tracking-wider font-semibold">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}