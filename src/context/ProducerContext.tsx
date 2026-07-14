import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { ReactNode } from "react";

export type Producer = {
  id: string;
  nome: string;
  cpfCnpj: string;
  cnpj?: string;
  inscricaoEstadual: string;
  name?: string;
  document?: string;
  ie?: string;
  validadeCertificado?: string | null;
};

type RawProducer = {
  id: number;
  nome: string;
  cpfCnpj: string;
  cnpj?: string;
  inscricaoEstadual: string;
  validadeCertificado?: string;
};

type ProducerContextType = {
  currentProducer: Producer | null;
  setCurrentProducer: (producer: Producer | null) => void;
  producersList: Producer[];
  carregarProdutores: () => Promise<void>;
  /** true enquanto o produtor/contador inicial ainda está sendo resolvido
   *  (localStorage / 1ª chamada à API). As telas usam isso para saber que
   *  ainda não há uma resposta definitiva — nem "carregado", nem "vazio". */
  isLoadingProducers: boolean;
};

const baseUrl = import.meta.env.VITE_API_URL;

const ProducerContext = createContext<ProducerContextType | undefined>(
  undefined,
);

export function ProducerProvider({ children }: { children: ReactNode }) {
  const [currentProducer, setCurrentProducer] = useState<Producer | null>(null);
  const [producersList, setProducersList] = useState<Producer[]>([]);
  // Começa em `true`: enquanto isso não virar `false`, ninguém sabe ainda se
  // vai existir um produtor selecionado ou não. É o que permite às telas
  // diferenciar "ainda não sei" de "sei que não tem nada" (ver VisaoGeral).
  const [isLoadingProducers, setIsLoadingProducers] = useState(true);
  // Evita duas buscas simultâneas (ex.: o StrictMode do React chamando o
  // efeito de montagem duas vezes em desenvolvimento), que faziam o objeto
  // do produtor ser recriado duas vezes seguidas e disparar a animação de
  // carregamento das telas duas vezes.
  const carregandoRef = useRef(false);

  const carregarProdutores = useCallback(async () => {
    if (carregandoRef.current) return;
    carregandoRef.current = true;
    setIsLoadingProducers(true);

    try {
      const userRole = localStorage.getItem("@AgroPops:userRole");

      if (userRole === "PRODUTOR") {
        const produtorData = localStorage.getItem("@AgroPops:produtorData");
        if (produtorData) {
          const p = JSON.parse(produtorData);
          const produtorFormatado: Producer = {
            ...p,
            id: String(p.id),
            name: p.nome,
            document: p.cpfCnpj,
            ie: p.inscricaoEstadual,
          };
          setProducersList([produtorFormatado]);
          setCurrentProducer(produtorFormatado);
        }
        return;
      }

      const contadorData = localStorage.getItem("@AgroPops:contador");
      if (contadorData) {
        const contadorId = JSON.parse(contadorData).id;

        try {
          const token = localStorage.getItem("@AgroPops:token");
          const response = await fetch(
            `${baseUrl}/produtores/listar/${contadorId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          if (response.ok) {
            const dadosReais = await response.json();
            const dadosFormatados = dadosReais.map((p: RawProducer) => ({
              ...p,
              id: String(p.id),
              name: p.nome,
              document: p.cpfCnpj,
              ie: p.inscricaoEstadual,
              cnpj: p.cnpj
            }));

            setProducersList(dadosFormatados);

            // Se o novo contador tem produtores, seleciona o primeiro.
            // Se não tem, força o estado para NULL, limpando o lixo do contador anterior
            if (dadosFormatados.length > 0) {
              setCurrentProducer(dadosFormatados[0]);
            } else {
              setCurrentProducer(null);
            }
          } else if (response.status === 401 || response.status === 403) {
            localStorage.clear();
            alert(
              "⏳ A sua sessão expirou por segurança. Por favor, faça login novamente.",
            );
            window.location.href = "/login";
          }
        } catch (error) {
          console.error("Erro de comunicação com a API:", error);
        }
      }
    } finally {
      carregandoRef.current = false;
      setIsLoadingProducers(false);
    }
  }, []);

  useEffect(() => {
    carregarProdutores();
  }, [carregarProdutores]);

  return (
    <ProducerContext.Provider
      value={{
        currentProducer,
        setCurrentProducer,
        producersList,
        carregarProdutores,
        isLoadingProducers,
      }}
    >
      {children}
    </ProducerContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProducer() {
  const context = useContext(ProducerContext);
  if (!context)
    throw new Error("useProducer deve ser usado dentro de um ProducerProvider");
  return context;
}