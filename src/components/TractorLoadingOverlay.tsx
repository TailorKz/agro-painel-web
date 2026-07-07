import { useEffect, useRef, useState } from "react";

// Tempos em ms — precisam bater com as durações usadas nas animações CSS
// (ver @keyframes tractor-exit e a transição de opacidade abaixo).
const DURACAO_SAIDA_MS = 850; // trator atravessando a área de conteúdo
const DURACAO_REVELACAO_MS = 300; // esmaecer o fundo até sumir de vez

type Fase = "carregando" | "saindo" | "revelando" | "oculto";

type TractorLoadingOverlayProps = {
  /** true enquanto os dados ainda estão sendo buscados */
  ativo: boolean;
  /** Texto principal exibido durante o carregamento */
  titulo?: string;
  /** Texto de apoio, menor, abaixo do título */
  subtitulo?: string;
};

/**
 * Indicador de carregamento usado na 1ª carga de uma tela.
 *
 * Cobre apenas a área de conteúdo — o elemento pai precisa ter
 * `position: relative` (é o caso do <main> em DashboardLayout.tsx) — então a
 * barra lateral e o cabeçalho continuam visíveis e utilizáveis por trás.
 *
 * Enquanto `ativo` for true, mostra um tratorzinho "ligado no ponto"
 * (chacoalhando, com fumacinha saindo do escapamento e as rodas girando).
 * Assim que `ativo` vira false, o trator atravessa a tela e o conteúdo por
 * trás fica visível.
 */
export function TractorLoadingOverlay({
  ativo,
  titulo = "Carregando seus dados",
  subtitulo = "Isso leva só um instante...",
}: TractorLoadingOverlayProps) {
  const [fase, setFase] = useState<Fase>(ativo ? "carregando" : "oculto");
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];

    if (ativo) {
      setFase("carregando");
      return;
    }

    // Só anima a saída se a tela já estava sendo exibida.
    setFase((atual) => (atual === "oculto" ? "oculto" : "saindo"));
  }, [ativo]);

  useEffect(() => {
    if (fase === "saindo") {
      const id = window.setTimeout(() => setFase("revelando"), DURACAO_SAIDA_MS);
      timersRef.current.push(id);
    }
    if (fase === "revelando") {
      const id = window.setTimeout(() => setFase("oculto"), DURACAO_REVELACAO_MS);
      timersRef.current.push(id);
    }
    return () => {
      timersRef.current.forEach((tid) => window.clearTimeout(tid));
    };
  }, [fase]);

  if (fase === "oculto") return null;

  return (
    <div
      aria-live="polite"
      aria-busy={fase === "carregando" || fase === "saindo"}
      className={`absolute inset-0 z-30 flex flex-col items-center justify-center gap-1 overflow-hidden bg-white/90 backdrop-blur-md transition-opacity ${
        fase === "revelando"
          ? "opacity-0 duration-300 ease-in"
          : "opacity-100 duration-200 ease-out"
      }`}
      style={{ pointerEvents: fase === "revelando" ? "none" : "auto" }}
    >
      {/* Trator: chacoalha e solta fumaça parado; na saída, atravessa a tela */}
      <div
        className="loading-motion"
  style={
    fase === "saindo" || fase === "revelando"
      ? { animation: "tractor-exit 0.85s ease-in forwards" }
      : undefined
        }
      >
        <svg
          viewBox="0 0 220 150"
          className="h-28 w-auto md:h-32"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Tratorzinho carregando"
        >
          {/* sombra fixa no chão — não chacoalha junto */}
          <ellipse cx="112" cy="131" rx="74" ry="7" fill="#0f172a" opacity="0.08" />

          <g
            className="loading-motion"
            style={{ animation: "tractor-shake 0.5s ease-in-out infinite" }}
          >
            {/* roda traseira */}
            <g
              className="loading-motion"
              style={{
                transformBox: "fill-box",
                transformOrigin: "50% 50%",
                animation: "wheel-spin 2.3s linear infinite",
              }}
            >
              <circle cx="70" cy="100" r="28" fill="#1F2937" />
              <circle cx="70" cy="100" r="15" className="fill-agro-light" />
              <circle cx="70" cy="100" r="4" fill="#ffffff" />
              <line x1="70" y1="88" x2="70" y2="112" strokeWidth="3" strokeLinecap="round" className="stroke-agro-primary" />
              <line x1="58" y1="100" x2="82" y2="100" strokeWidth="3" strokeLinecap="round" className="stroke-agro-primary" />
            </g>

            {/* roda dianteira */}
            <g
              className="loading-motion"
              style={{
                transformBox: "fill-box",
                transformOrigin: "50% 50%",
                animation: "wheel-spin 1.5s linear infinite",
              }}
            >
              <circle cx="167" cy="109" r="17" fill="#1F2937" />
              <circle cx="167" cy="109" r="9" className="fill-agro-light" />
              <circle cx="167" cy="109" r="2.5" fill="#ffffff" />
              <line x1="167" y1="100" x2="167" y2="118" strokeWidth="2.5" strokeLinecap="round" className="stroke-agro-primary" />
              <line x1="158" y1="109" x2="176" y2="109" strokeWidth="2.5" strokeLinecap="round" className="stroke-agro-primary" />
            </g>

            {/* chassi + reforço dianteiro */}
            <rect x="60" y="88" width="120" height="10" rx="4" className="fill-agro-primary" />
            <rect x="155" y="90" width="8" height="19" className="fill-agro-primary" />

            {/* cabine */}
            <rect x="44" y="27" width="54" height="9" rx="4.5" className="fill-agro-primary" />
            <rect x="40" y="34" width="62" height="58" rx="10" className="fill-agro-secondary" />
            <rect x="49" y="44" width="44" height="30" rx="6" className="fill-agro-light" opacity="0.55" />

            {/* capô */}
            <path d="M100,58 L188,72 L188,90 L100,90 Z" className="fill-agro-secondary" />
            <circle cx="183" cy="79" r="4" className="fill-agro-light" stroke="#ffffff" strokeWidth="1" />

            {/* escapamento */}
            <rect x="104" y="15" width="9" height="42" rx="3" fill="#374151" />

            {/* fumacinha */}
            <circle cx="109" cy="16" r="5.5" fill="#CBD5E1" className="loading-motion" style={{ animation: "smoke-puff 1.6s ease-out infinite" }} />
            <circle cx="109" cy="16" r="4.5" fill="#CBD5E1" className="loading-motion" style={{ animation: "smoke-puff 1.6s ease-out infinite 0.55s" }} />
            <circle cx="109" cy="16" r="3.5" fill="#CBD5E1" className="loading-motion" style={{ animation: "smoke-puff 1.6s ease-out infinite 1.1s" }} />
          </g>
        </svg>
      </div>

      <div className="flex flex-col items-center gap-2 px-6 text-center">
        <p className="text-lg font-semibold text-gray-800">{titulo}</p>
        <p className="text-sm text-gray-500">{subtitulo}</p>
        <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-gray-100">
          <div
            className="loading-motion h-full w-1/3 rounded-full bg-agro-secondary"
            style={{ animation: "loading-bar-slide 1.2s ease-in-out infinite" }}
          />
        </div>
      </div>
    </div>
  );
}