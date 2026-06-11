import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Shield, ChevronLeft, Loader2, AlertCircle } from 'lucide-react';

// ── Floating label input ────────────────────────────────────────────────────
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
        <label htmlFor={id} className="absolute left-4 transition-all duration-200 pointer-events-none select-none z-10"
          style={{
            top: lifted ? '8px' : '50%',
            transform: lifted ? 'translateY(0)' : 'translateY(-50%)',
            fontSize: lifted ? '10px' : '14px',
            fontWeight: lifted ? 700 : 400,
            color: error ? '#e11d48' : focused ? '#059669' : '#9ca3af',
            letterSpacing: lifted ? '0.05em' : '0',
            textTransform: lifted ? 'uppercase' : 'none',
          }}>
          {label}
        </label>
        <input id={id} type={type} value={value} disabled={disabled} autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          className={`w-full pt-6 pb-2.5 px-4 rounded-xl border-2 text-sm font-semibold text-gray-800 outline-none transition-all duration-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed ${suffix ? 'pr-12' : ''} ${
            error ? 'border-rose-400 bg-rose-50/30'
              : focused ? 'border-emerald-500 shadow-sm shadow-emerald-500/20'
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

// ── Testimonials data ───────────────────────────────────────────────────────
const testimonials = [
  { text: '"Antes eu passava horas classificando cada nota manualmente. Hoje o AgroContábil faz tudo sozinho e eu entrego o LCDPR em minutos."', name: 'Dra. Carla Mendes', role: 'Contadora • Chapecó, SC', initials: 'CM' },
  { text: '"O produtor agora emite a nota direto pelo celular, sem me ligar. A integração com a SEFAZ é perfeita."', name: 'Ricardo Borges', role: 'Contador Agrícola • Lages, SC', initials: 'RB' },
  { text: '"Com o CNPJ rural obrigatório chegando, estar preparado fez toda a diferença para minha carteira."', name: 'Ana Paula Rech', role: 'Escritório Rech Contabilidade • Joaçaba, SC', initials: 'AR' },
];

// ── Main component ──────────────────────────────────────────────────────────
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
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
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
    await new Promise((r) => setTimeout(r, 1800));
    // Substitua pelo seu call real à API Java aqui
    navigate('/');
    setIsLoading(false);
  };

  const panelStyle = (delay: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(20px)',
    transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
  });

  return (
    <div className="min-h-screen flex font-sans antialiased overflow-hidden bg-gray-50">

      {/* ── LEFT: Form ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative z-10 bg-white">
        <button onClick={() => navigate('/landing')}
          className="absolute top-6 left-6 flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors group">
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Voltar
        </button>

        <div className="w-full max-w-sm" style={panelStyle(0)}>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center font-black text-white">A</div>
            <div>
              <div className="font-black text-gray-800 tracking-wider text-sm">AGROCONTÁBIL</div>
              <div className="text-[10px] text-gray-400 tracking-widest uppercase font-semibold">Painel do Contador</div>
            </div>
          </div>

          <h1 className="text-2xl font-black text-gray-800 mb-1">Bem-vindo de volta</h1>
          <p className="text-gray-400 text-sm mb-8">Acesse seu escritório e gerencie sua carteira de produtores.</p>

          {/* Global error */}
          {globalError && (
            <div className="mb-5 flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium px-4 py-3 rounded-xl">
              <AlertCircle size={16} className="flex-shrink-0" /> {globalError}
            </div>
          )}

          {/* Inputs */}
          <div className="space-y-4" onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}>
            <FloatingInput id="email" label="E-mail do Contador" type="email" value={email}
              onChange={(v) => { setEmail(v); if (emailError) setEmailError(''); }}
              onBlur={validateEmail} error={emailError} autoComplete="email" disabled={isLoading} />
            <FloatingInput id="password" label="Senha" type={showPassword ? 'text' : 'password'} value={password}
              onChange={(v) => { setPassword(v); if (passwordError) setPasswordError(''); }}
              onBlur={validatePassword} error={passwordError} autoComplete="current-password" disabled={isLoading}
              suffix={
                <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              } />
          </div>

          {/* Remember + Forgot */}
          <div className="flex items-center justify-between mt-3 mb-6">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors ${rememberMe ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 group-hover:border-emerald-400'}`}
                onClick={() => setRememberMe(!rememberMe)}>
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
          <button onClick={handleSubmit} disabled={isLoading}
            className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl text-white text-sm transition-all duration-200 ${
              isLoading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] hover:shadow-lg hover:shadow-emerald-500/25'
            }`}>
            {isLoading ? <><Loader2 size={18} className="animate-spin" /> Verificando credenciais...</> : <>Entrar no Painel <ArrowRight size={18} /></>}
          </button>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">OU</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              Primeiro acesso?{' '}
              <button className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">
                Criar conta do escritório
              </button>
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-gray-300 text-xs">
            <Shield size={12} /> <span>Acesso protegido com criptografia SSL/TLS</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Image + Testimonial ────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 relative flex-col justify-end overflow-hidden"
        style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.8s ease 200ms' }}>
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/fundoagro.png)' }} />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(5,25,12,0.35) 0%, rgba(5,25,12,0.72) 60%, rgba(5,25,12,0.94) 100%)',
        }} />

        <div className="relative z-10 p-12 pb-10">
          <div style={panelStyle(400)}>
            <h2 className="text-4xl font-black text-white leading-tight mb-3">
              Gestão fiscal do campo,<br /><span className="text-emerald-400">simplificada.</span>
            </h2>
            <p className="text-emerald-100/60 text-base max-w-md mb-10">
              Contadores em Santa Catarina já usam a plataforma para automatizar o LCDPR e emitir NFP-e com um toque.
            </p>
          </div>

          {/* Testimonial card */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-6 mb-4"
            style={panelStyle(600)}>
            {testimonials.map((t, i) => (
              <div key={i} style={{ display: i === activeTestimonial ? 'block' : 'none' }}>
                <p className="text-white/80 text-sm leading-relaxed mb-4 italic">{t.text}</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white text-xs">{t.initials}</div>
                  <div>
                    <div className="text-white font-semibold text-sm">{t.name}</div>
                    <div className="text-emerald-300/70 text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
            {/* Dots */}
            <div className="flex gap-1.5 mt-4">
              {testimonials.map((_, i) => (
                <button key={i} onClick={() => setActiveTestimonial(i)}
                  className={`rounded-full transition-all duration-300 ${i === activeTestimonial ? 'w-5 h-1.5 bg-emerald-400' : 'w-1.5 h-1.5 bg-white/30'}`} />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4" style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.8s ease 800ms' }}>
            {['1.200+ produtores', 'SEFAZ integrado', 'LCDPR automático'].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-emerald-300/60 text-xs">
                <div className="w-1 h-1 rounded-full bg-emerald-500" /> {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}