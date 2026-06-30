import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";

export type Producer = {
  id: string;
  nome: string;
  cpfCnpj: string;
  inscricaoEstadual: string;
  name?: string;
  document?: string;
  ie?: string;
  validadeCertificado?: string | null; // <-- TIPO ADICIONADO AQUI!
};

type RawProducer = {
  id: number;
  nome: string;
  cpfCnpj: string;
  inscricaoEstadual: string;
  validadeCertificado?: string;
};

type ProducerContextType = {
  currentProducer: Producer | null;
  setCurrentProducer: (producer: Producer | null) => void;
  producersList: Producer[];
  carregarProdutores: () => Promise<void>;
};

const baseUrl = import.meta.env.VITE_API_URL;

const ProducerContext = createContext<ProducerContextType | undefined>(
  undefined,
);

export function ProducerProvider({ children }: { children: ReactNode }) {
  const [currentProducer, setCurrentProducer] = useState<Producer | null>(null);
  const [producersList, setProducersList] = useState<Producer[]>([]);

  const carregarProdutores = useCallback(async () => {
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
        // CORREÇÃO AQUI: Estava o link das notas, agora é o dos produtores!
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
          }));

          setProducersList(dadosFormatados);

          // BLINDAGEM DE ESTADO: Se o novo contador tem produtores, seleciona o primeiro.
          // Se não tem, força o estado para NULL, limpando o lixo do contador anterior!
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
