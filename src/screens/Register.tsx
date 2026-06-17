import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, ArrowRight, Shield, ChevronLeft, Loader2, AlertCircle, Check,
} from 'lucide-react';

// ── Floating label input ──────────────────────────────────────────────────
function FloatingInput({
  id, label, type = 'text', value, onChange, onBlur, error, autoComplete, suffix, disabled = false, hint,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; onBlur?: () => void; error?: string;
  autoComplete?: string; suffix?: React.ReactNode; disabled?: boolean; hint?: string;
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
      {hint && !error && (
        <div className="text-gray-400 text-xs pl-1">{hint}</div>
      )}
    </div>
  );
}

// ── Password strength indicator ───────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'Mínimo 8 caracteres', ok: password.length >= 8 },
    { label: 'Letra maiúscula', ok: /[A-Z]/.test(password) },
    { label: 'Número', ok: /\d/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ['bg-gray-200', 'bg-rose-400', 'bg-amber-400', 'bg-emerald-500'];
  const labels = ['', 'Fraca', 'Média', 'Forte'];

  if (!password) return null;

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score] : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <span className={`text-xs font-semibold transition-colors ${
          score === 3 ? 'text-emerald-600' : score === 2 ? 'text-amber-500' : 'text-rose-500'
        }`}>{labels[score]}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1">
            <Check size={10} className={c.ok ? 'text-emerald-500' : 'text-gray-300'} />
            <span className={`text-[11px] ${c.ok ? 'text-emerald-600' : 'text-gray-400'}`}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────
function Steps({ current }: { current: number }) {
  const steps = ['Escritório', 'Responsável', 'Acesso'];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                i < current
                  ? 'bg-emerald-500 text-white'
                  : i === current
                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < current ? <Check size={12} /> : i + 1}
            </div>
            <span className={`text-xs font-semibold hidden sm:block ${i === current ? 'text-gray-700' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-6 transition-all duration-500 ${i < current ? 'bg-emerald-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Right panel preview cards ─────────────────────────────────────────────
const stepPreviews = [
  {
    title: 'Seu escritório, centralizado.',
    desc: 'Cadastre o nome do escritório e o CRC. A partir daí, todos os seus produtores ficam agrupados sob a mesma conta.',
    visual: (
      <div className="bg-white/10 border border-white/15 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/30 rounded-xl flex items-center justify-center">
            <span className="text-emerald-300 font-black text-sm">RC</span>
          </div>
          <div>
            <div className="text-white font-bold text-sm">Rech Contabilidade</div>
            <div className="text-emerald-100/50 text-xs">CRC/SC 045231</div>
          </div>
        </div>
        <div className="h-px bg-white/10" />
        <div className="grid grid-cols-3 gap-2 text-center">
          {[['12', 'Produtores'], ['3', 'Pendentes'], ['SC', 'Estado']].map(([v, l]) => (
            <div key={l} className="bg-white/5 rounded-xl py-2">
              <div className="text-white font-black text-sm">{v}</div>
              <div className="text-emerald-100/40 text-[10px]">{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'O responsável técnico pelo CRC.',
    desc: 'Informações do contador responsável pelo escritório. É o e-mail cadastrado aqui que será usado para autenticação.',
    visual: (
      <div className="bg-white/10 border border-white/15 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-violet-500/30 rounded-xl flex items-center justify-center">
            <span className="text-violet-300 font-black text-sm">AP</span>
          </div>
          <div>
            <div className="text-white font-bold text-sm">Ana Paula Rech</div>
            <div className="text-emerald-100/50 text-xs">ana@rechcontabilidade.com.br</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-300/70 text-xs">Conta ativa • Último acesso hoje</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Acesso seguro, sempre.',
    desc: 'Sua senha protege todos os produtores da carteira. O certificado A1 de cada produtor fica criptografado separadamente no servidor.',
    visual: (
      <div className="bg-white/10 border border-white/15 rounded-2xl p-4 space-y-3">
        {[
          { icon: '🔒', label: 'Criptografia SSL/TLS na transmissão' },
          { icon: '🛡️', label: 'Certificado A1 isolado por produtor' },
          { icon: '📋', label: 'Log de auditoria em cada emissão' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-base">{item.icon}</span>
            <span className="text-emerald-100/70 text-xs">{item.label}</span>
          </div>
        ))}
      </div>
    ),
  },
];

// ── Main component ────────────────────────────────────────────────────────
export function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);

  // Step 0: Escritório
  const [officeName, setOfficeName] = useState('');
  const [crc, setCrc] = useState('');
  const [state, setState] = useState('');

  // Step 1: Responsável
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2: Acesso
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Animate panel on step change
  useEffect(() => {
    setPanelVisible(false);
    const t = setTimeout(() => setPanelVisible(true), 80);
    return () => clearTimeout(t);
  }, [step]);

  const setError = (field: string, msg: string) =>
    setErrors((prev) => ({ ...prev, [field]: msg }));
  const clearError = (field: string) =>
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });

  const validateStep = () => {
    let ok = true;
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!officeName.trim()) { newErrors.officeName = 'Informe o nome do escritório'; ok = false; }
      if (!crc.trim()) { newErrors.crc = 'Informe o CRC'; ok = false; }
      if (!state.trim()) { newErrors.state = 'Informe o estado'; ok = false; }
    }
    if (step === 1) {
      if (!fullName.trim()) { newErrors.fullName = 'Informe o nome completo'; ok = false; }
      if (!phone.trim()) { newErrors.phone = 'Informe o telefone'; ok = false; }
    }
    if (step === 2) {
      if (!email) { newErrors.email = 'Informe o e-mail'; ok = false; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { newErrors.email = 'E-mail inválido'; ok = false; }
      if (!password) { newErrors.password = 'Crie uma senha'; ok = false; }
      else if (password.length < 8) { newErrors.password = 'Mínimo 8 caracteres'; ok = false; }
      if (password !== confirmPassword) { newErrors.confirmPassword = 'As senhas não coincidem'; ok = false; }
    }

    setErrors(newErrors);
    return ok;
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    if (step < 2) {
      setStep((s) => s + 1);
      return;
    }
    
    // Final submit - Conectando com o backend em Java!
    setIsLoading(true);
    setApiError(''); // Limpa erros anteriores
    
    try {
      const response = await fetch('http://localhost:8080/api/contadores/registrar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // O body deve ter EXATAMENTE os mesmos nomes das variáveis da sua classe Contador.java
        body: JSON.stringify({
          nomeEscritorio: officeName,
          crc: crc,
          estado: state,
          nomeResponsavel: fullName,
          telefone: phone,
          email: email,
          senha: password
        }),
      });

      if (response.ok) {
        // Sucesso: O Java retornou Status 200 OK
        console.log("Cadastro realizado com sucesso no PostgreSQL!");
        // Redireciona o usuário para fazer login após se cadastrar
        navigate('/login');
      } else {
        // O Java retornou um erro (ex: E-mail já cadastrado)
        const errorMsg = await response.text();
        setApiError(errorMsg);
      }
    } catch (error) {
      console.error("Erro na conexão:", error);
      setApiError('Servidor indisponível. Verifique se o backend Java está rodando.');
    } finally {
      setIsLoading(false);
    }
  };

  const anim = (delay: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(22px)',
    transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
  });

  const panelAnim = {
    opacity: panelVisible ? 1 : 0,
    transform: panelVisible ? 'translateY(0)' : 'translateY(16px)',
    transition: 'opacity 0.5s cubic-bezier(0.22,1,0.36,1), transform 0.5s cubic-bezier(0.22,1,0.36,1)',
  };

  const preview = stepPreviews[step];

  return (
    <div className="min-h-screen flex font-sans antialiased overflow-hidden bg-gray-50">

      {/* ── LEFT: Form ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative z-10 bg-white">
        <button
          onClick={() => (step > 0 ? setStep((s) => s - 1) : navigate('/login'))}
          className="absolute top-6 left-6 flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          {step > 0 ? 'Voltar' : 'Já tenho conta'}
        </button>

        <div className="w-full max-w-sm">
          {/* Logo */}
          <div style={anim(0)} className="flex items-center gap-3 mb-8">
            <img src="/logo.png" alt="AgroContábil" className="h-10 w-auto object-contain" />
            <h1 className="text-2xl font-black text-gray-800 mb-1">Agro POPs</h1>
          </div>

          {/* Step indicator */}
          <div style={anim(60)}>
            <Steps current={step} />
          </div>

          {/* Step heading */}
          <div style={anim(120)} className="mb-6">
            {step === 0 && (
              <>
                <h1 className="text-2xl font-black text-gray-800 mb-1">Dados do escritório</h1>
                <p className="text-gray-400 text-sm">Essas informações identificam seu escritório contábil na plataforma.</p>
              </>
            )}
            {step === 1 && (
              <>
                <h1 className="text-2xl font-black text-gray-800 mb-1">Contador responsável</h1>
                <p className="text-gray-400 text-sm">Dados do profissional responsável pelo CRC cadastrado.</p>
              </>
            )}
            {step === 2 && (
              <>
                <h1 className="text-2xl font-black text-gray-800 mb-1">Crie seu acesso</h1>
                <p className="text-gray-400 text-sm">E-mail e senha que serão usados para entrar no painel.</p>
              </>
            )}
          </div>

          {/* BANNER DE ERRO DA API JAVA */}
          {apiError && (
            <div className="mb-6 flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium px-4 py-3 rounded-xl" style={anim(130)}>
              <AlertCircle size={16} className="flex-shrink-0" /> {apiError}
            </div>
          )}

          {/* Step 0: Escritório */}
          {step === 0 && (
            <div className="space-y-4" style={panelAnim} onKeyDown={(e) => e.key === 'Enter' && handleNext()}>
              <FloatingInput
                id="officeName" label="Nome do escritório" value={officeName}
                onChange={(v) => { setOfficeName(v); clearError('officeName'); }}
                error={errors.officeName} autoComplete="organization"
                hint="Ex: Silva & Associados Contabilidade"
              />
              <div className="grid grid-cols-2 gap-3">
                <FloatingInput
                  id="crc" label="CRC" value={crc}
                  onChange={(v) => { setCrc(v); clearError('crc'); }}
                  error={errors.crc}
                  hint="Ex: SC 045231"
                />
                <FloatingInput
                  id="state" label="Estado (UF)" value={state}
                  onChange={(v) => { setState(v.toUpperCase().slice(0, 2)); clearError('state'); }}
                  error={errors.state}
                />
              </div>
            </div>
          )}

          {/* Step 1: Responsável */}
          {step === 1 && (
            <div className="space-y-4" style={panelAnim} onKeyDown={(e) => e.key === 'Enter' && handleNext()}>
              <FloatingInput
                id="fullName" label="Nome completo" value={fullName}
                onChange={(v) => { setFullName(v); clearError('fullName'); }}
                error={errors.fullName} autoComplete="name"
              />
              <FloatingInput
                id="phone" label="Telefone / WhatsApp" value={phone}
                onChange={(v) => { setPhone(v); clearError('phone'); }}
                error={errors.phone} autoComplete="tel" type="tel"
                hint="Apenas para suporte e notificações importantes"
              />
            </div>
          )}

          {/* Step 2: Acesso */}
          {step === 2 && (
            <div className="space-y-4" style={panelAnim} onKeyDown={(e) => e.key === 'Enter' && handleNext()}>
              <FloatingInput
                id="email" label="E-mail de acesso" type="email" value={email}
                onChange={(v) => { setEmail(v); clearError('email'); }}
                error={errors.email} autoComplete="email"
              />
              <div>
                <FloatingInput
                  id="password" label="Senha" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(v) => { setPassword(v); clearError('password'); }}
                  error={errors.password} autoComplete="new-password"
                  suffix={
                    <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />
                <div className="mt-2 px-1">
                  <PasswordStrength password={password} />
                </div>
              </div>
              <FloatingInput
                id="confirmPassword" label="Confirmar senha" type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                onChange={(v) => { setConfirmPassword(v); clearError('confirmPassword'); }}
                error={errors.confirmPassword} autoComplete="new-password"
                suffix={
                  <button type="button" tabIndex={-1} onClick={() => setShowConfirm(!showConfirm)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded">
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
            </div>
          )}

          {/* CTA */}
          <div className="mt-6">
            <button
              onClick={handleNext}
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl text-white text-sm transition-all duration-200 ${
                isLoading
                  ? 'bg-emerald-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] hover:shadow-lg hover:shadow-emerald-500/25'
              }`}
            >
              {isLoading
                ? <><Loader2 size={18} className="animate-spin" /> Criando sua conta...</>
                : step < 2
                ? <>Continuar <ArrowRight size={18} /></>
                : <>Criar conta e entrar <ArrowRight size={18} /></>
              }
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Já tem conta?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
              >
                Entrar no painel
              </button>
            </p>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-gray-300 text-xs">
            <Shield size={12} />
            <span>Dados protegidos com criptografia SSL/TLS</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Background + Step preview ────────────────────────────── */}
      <div
        className="hidden lg:flex flex-1 relative flex-col justify-end overflow-hidden"
        style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.9s ease 150ms' }}
      >
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/fundoagro.png)' }} />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(5,25,12,0.4) 0%, rgba(5,25,12,0.75) 55%, rgba(5,25,12,0.97) 100%)' }}
        />

        <div className="relative z-10 p-12 pb-10">
          <div style={panelAnim}>
            {/* Step number badge */}
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/25 text-emerald-300 text-[10px] font-bold px-3 py-1.5 rounded-full mb-5 tracking-widest uppercase">
              <span className="text-emerald-400 font-black">0{step + 1}</span>
              <span className="text-emerald-400/60">/</span>
              <span>03</span>
            </div>

            <h2 className="text-3xl font-black text-white leading-tight mb-3">
              {preview.title}
            </h2>
            <p className="text-emerald-100/55 text-sm max-w-md mb-8 leading-relaxed">
              {preview.desc}
            </p>

            {/* Visual preview */}
            {preview.visual}

            {/* Step dots */}
            <div className="flex gap-1.5 mt-8">
              {stepPreviews.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-400 ${i === step ? 'w-5 h-1.5 bg-emerald-400' : i < step ? 'w-1.5 h-1.5 bg-emerald-600' : 'w-1.5 h-1.5 bg-white/20'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}