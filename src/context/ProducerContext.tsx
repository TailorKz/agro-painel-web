import React, { createContext, useState, useContext } from 'react';
import type { ReactNode } from 'react';

// Tipagem do Produtor cadastrado pelo contador
export type Producer = {
  id: string;
  name: string;
  document: string; // CPF ou CNPJ
  ie: string;       // Inscrição Estadual
};

type ProducerContextType = {
  currentProducer: Producer | null;
  setCurrentProducer: (producer: Producer | null) => void;
  producersList: Producer[];
};

const ProducerContext = createContext<ProducerContextType | undefined>(undefined);

// Dados mockados de exemplo (isso virá da sua API Java depois)
const mockProducers: Producer[] = [
  { id: '1', name: 'João Silva (Chácara Vista Alegre)', document: '123.456.789-00', ie: '251.432.988' },
  { id: '2', name: 'Sítio Recanto Verde (Família Kunz)', document: '98.765.432/0001-99', ie: '255.881.321' },
  { id: '3', name: 'Fazenda Sombra da Mata', document: '456.123.789-11', ie: '260.992.114' },
];

export function ProducerProvider({ children }: { children: ReactNode }) {
  // Inicializa o painel com o primeiro produtor selecionado por padrão
  const [currentProducer, setCurrentProducer] = useState<Producer | null>(mockProducers[0]);

  return (
    <ProducerContext.Provider value={{ currentProducer, setCurrentProducer, producersList: mockProducers }}>
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