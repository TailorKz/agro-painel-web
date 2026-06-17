import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export type Producer = {
  id: string;
  nome: string;
  cpfCnpj: string;
  inscricaoEstadual: string;
  name?: string; 
  document?: string;
  ie?: string;
};

type RawProducer = {
  id: number;
  nome: string;
  cpfCnpj: string;
  inscricaoEstadual: string;
};

type ProducerContextType = {
  currentProducer: Producer | null;
  setCurrentProducer: (producer: Producer | null) => void;
  producersList: Producer[];
  carregarProdutores: () => Promise<void>;
};

const ProducerContext = createContext<ProducerContextType | undefined>(undefined);

export function ProducerProvider({ children }: { children: ReactNode }) {
  const [currentProducer, setCurrentProducer] = useState<Producer | null>(null);
  const [producersList, setProducersList] = useState<Producer[]>([]);

  const carregarProdutores = useCallback(async () => {
    const contadorData = localStorage.getItem('@AgroPops:contador');
    
    if (contadorData) {
      const contadorId = JSON.parse(contadorData).id;
      console.log("🕵️ Buscando produtores para o Contador ID:", contadorId);
      
      try {
        const token = localStorage.getItem('@AgroPops:token'); // <-- PEGA NO CRACHÁ
        
        const response = await fetch(`http://localhost:8080/api/produtores/listar/${contadorId}`, {
          headers: {
            'Authorization': `Bearer ${token}` // <-- MOSTRA O CRACHÁ AO JAVA
          }
        });
        
        if (response.ok) {
          const dadosReais = await response.json();
          console.log("✅ Resposta do Java (Dados Brutos):", dadosReais);
          
          const dadosFormatados = dadosReais.map((p: RawProducer) => ({
            ...p,
            id: String(p.id),
            name: p.nome,
            document: p.cpfCnpj,
            ie: p.inscricaoEstadual
          }));

          console.log("✨ Dados Formatados para o React:", dadosFormatados);
          setProducersList(dadosFormatados);
          
          if (dadosFormatados.length > 0) {
            setCurrentProducer((prev) => prev ? prev : dadosFormatados[0]);
          }
        } else {
          // Se o Java der um Erro 500 ou 403, vai cair aqui!
          const erroTexto = await response.text();
          console.error("❌ O Java retornou um erro (Status " + response.status + "):", erroTexto);
        }
      } catch (error) {
        console.error("🚨 Erro de comunicação com a API (O backend está ligado?):", error);
      }
    } else {
      console.warn("⚠️ Nenhum contador logado no localStorage.");
    }
  }, []);

  useEffect(() => {
    carregarProdutores();
  }, [carregarProdutores]);

  return (
    <ProducerContext.Provider value={{ currentProducer, setCurrentProducer, producersList, carregarProdutores }}>
      {children}
    </ProducerContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProducer() {
  const context = useContext(ProducerContext);
  if (!context) throw new Error('useProducer deve ser usado dentro de um ProducerProvider');
  return context;
}