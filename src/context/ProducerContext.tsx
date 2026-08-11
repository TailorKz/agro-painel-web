import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { ReactNode } from "react";

// --- NOVO TIPO: Propriedade Rural ---
export type PropriedadeRural = {
  id: number;
  nome: string;
  inscricaoEstadual: string;
  caepf: string;
  percentualParticipacao: number;
};

export type Producer = {
  id: string;
  nome: string;
  cpfCnpj: string;
  cnpj?: string;
  telefone?: string;
  inscricaoEstadual: string;
  name?: string;
  document?: string;
  ie?: string;
  validadeCertificado?: string | null;
  propriedades?: PropriedadeRural[]; // <-- Nova lista adicionada ao tipo
};

type RawProducer = {
  id: number;
  nome: string;
  cpfCnpj: string;
  cnpj?: string;
  telefone?: string;
  inscricaoEstadual: string;
  validadeCertificado?: string;
  propriedades?: PropriedadeRural[];
};

type ProducerContextType = {
  currentProducer: Producer | null;
  setCurrentProducer: (producer: Producer | null) => void;
  // --- NOVOS ESTADOS DA PROPRIEDADE ---
  currentProperty: PropriedadeRural | null;
  setCurrentProperty: (property: PropriedadeRural | null) => void;
  // ------------------------------------
  producersList: Producer[];
  carregarProdutores: () => Promise<void>;
  isLoadingProducers: boolean;
};

const baseUrl = import.meta.env.VITE_API_URL;
const ProducerContext = createContext<ProducerContextType | undefined>(
  undefined,
);

export function ProducerProvider({ children }: { children: ReactNode }) {
  const [currentProducer, setCurrentProducer] = useState<Producer | null>(null);
  const [currentProperty, setCurrentProperty] =
    useState<PropriedadeRural | null>(null); // null = Visão Consolidada
  const [producersList, setProducersList] = useState<Producer[]>([]);
  const [isLoadingProducers, setIsLoadingProducers] = useState(true);

  const carregandoRef = useRef(false);

  // Inteligência UX: Se o usuário trocar de produtor, reseta a fazenda para a Visão Consolidada
  useEffect(() => {
    setCurrentProperty(null);
  }, [currentProducer?.id]);

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
              headers: { Authorization: `Bearer ${token}` },
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
            }));
            
            setProducersList(dadosFormatados);
            
            // PADRÃO OURO: Força o estado inicial a ficar vazio para o contador
            setCurrentProducer(null);
            
          } else if (response.status === 401 || response.status === 403) {
            localStorage.clear();
            alert(
              "Sua sessão expirou por segurança. Por favor, faça login novamente.",
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
  }, [baseUrl]);

  useEffect(() => {
    carregarProdutores();
  }, [carregarProdutores]);

  return (
    <ProducerContext.Provider
      value={{
        currentProducer,
        setCurrentProducer,
        currentProperty,
        setCurrentProperty,
        producersList,
        carregarProdutores,
        isLoadingProducers,
      }}
    >
      {children}
    </ProducerContext.Provider>
  );
}

export function useProducer() {
  const context = useContext(ProducerContext);
  if (!context)
    throw new Error("useProducer deve ser usado dentro de um ProducerProvider");
  return context;
}
