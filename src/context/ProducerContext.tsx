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
    const userRole = localStorage.getItem('@AgroPops:userRole');

    // ====================================================
    // LÓGICA 1: SE FOR UM PRODUTOR RURAL LOGADO NA WEB
    // ====================================================
    if (userRole === 'PRODUTOR') {
      const produtorData = localStorage.getItem('@AgroPops:produtorData');
      if (produtorData) {
        const p = JSON.parse(produtorData);
        // Formata os dados para o padrão que a Visão Geral já espera
        const produtorFormatado: Producer = {
          ...p,
          id: String(p.id),
          name: p.nome,
          document: p.cpfCnpj,
          ie: p.inscricaoEstadual
        };
        // O produtor só vê a ele mesmo!
        setProducersList([produtorFormatado]);
        setCurrentProducer(produtorFormatado);
      }
      return; // Para a execução aqui, não precisa buscar a lista do contador
    }

    // ====================================================
    // LÓGICA 2: SE FOR O CONTADOR (Busca a carteira de clientes)
    // ====================================================
    const contadorData = localStorage.getItem('@AgroPops:contador');
    if (contadorData) {
      const contadorId = JSON.parse(contadorData).id;
      
      try {
        const token = localStorage.getItem('@AgroPops:token'); 
        const response = await fetch(`http://localhost:8080/api/produtores/listar/${contadorId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const dadosReais = await response.json();
          const dadosFormatados = dadosReais.map((p: RawProducer) => ({
            ...p,
            id: String(p.id),
            name: p.nome,
            document: p.cpfCnpj,
            ie: p.inscricaoEstadual
          }));
          setProducersList(dadosFormatados);
          
          if (dadosFormatados.length > 0) {
            setCurrentProducer((prev) => prev ? prev : dadosFormatados[0]);
          }
        } else if (response.status === 401 || response.status === 403) {
          localStorage.clear(); // Limpa tudo em caso de invasão ou token vencido
          alert("⏳ A sua sessão expirou por segurança. Por favor, faça login novamente.");
          window.location.href = '/login';
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
    <ProducerContext.Provider value={{ currentProducer, setCurrentProducer, producersList, carregarProdutores }}>
      {children}
    </ProducerContext.Provider>
  );
}

export function useProducer() {
  const context = useContext(ProducerContext);
  if (!context) throw new Error('useProducer deve ser usado dentro de um ProducerProvider');
  return context;
}