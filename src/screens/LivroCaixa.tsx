import { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Download, Plus, FileSpreadsheet, Loader2, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useProducer } from '../context/ProducerContext';

type Lancamento = {
  id: string;
  data: string;
  documento: string;
  historico: string;
  origem: 'NFE' | 'AVULSO';
  tipo: 'ENTRADA' | 'SAIDA';
  valor: number;
  isDedutivel: boolean;
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const TIPOS_DOCUMENTO = [
  { id: '1', label: '1 - Nota Fiscal' },
  { id: '2', label: '2 - Fatura' },
  { id: '3', label: '3 - Recibo' },
  { id: '4', label: '4 - Contrato' },
  { id: '5', label: '5 - Folha de Pagamento' },
  { id: '6', label: '6 - Outros (Taxas/Guias)' },
];

export function LivroCaixa() {
  const { currentProducer } = useProducer();
  const baseUrl = import.meta.env.VITE_API_URL;
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Estados do Modal de Lançamento Avulso
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    tipo: 'SAIDA', // Padrão mercado: lança mais despesa manual que receita
    tipoDocumento: '3', // Padrão mercado: Recibo
    documento: '',
    cpfCnpjParticipante: '',
    historico: '',
    valor: '',
    isDedutivel: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  const anosDisponiveis = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

  const formatBRL = (valor: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [ano, mes, dia] = dateStr.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const toggleMonth = (monthIndex: number) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthIndex)) next.delete(monthIndex);
      else next.add(monthIndex);
      return next;
    });
  };

  const buscarLancamentos = useCallback(async () => {
    if (!currentProducer) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("@AgroPops:token");
      const response = await fetch(`${baseUrl}/livro-caixa/${currentProducer.id}?ano=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const dados = await response.json();
        setLancamentos(dados);
      } else {
        setLancamentos([]);
      }
    } catch (error) {
      console.error(error);
      setLancamentos([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentProducer, selectedYear, baseUrl]);

  useEffect(() => {
    buscarLancamentos();
  }, [buscarLancamentos]);

  const dadosPorMes = useMemo(() => {
    const agrupado = MESES.map(() => ({
      lancamentos: [] as Lancamento[],
      totalEntradas: 0,
      totalSaidas: 0,
      totalDedutivel: 0,
    }));

    lancamentos.forEach(lanc => {
      const ano = parseInt(lanc.data.split('-')[0]);
      const mes = parseInt(lanc.data.split('-')[1]) - 1;

      if (ano === selectedYear) {
        agrupado[mes].lancamentos.push(lanc);
        if (lanc.tipo === 'ENTRADA') {
          agrupado[mes].totalEntradas += lanc.valor;
        } else {
          agrupado[mes].totalSaidas += lanc.valor;
          if (lanc.isDedutivel) {
            agrupado[mes].totalDedutivel += lanc.valor;
          }
        }
      }
    });
    return agrupado;
  }, [lancamentos, selectedYear]);

  // Função de salvamento do formulário manual
  const handleSalvarAvulso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProducer) return;
    if (!formData.documento || !formData.historico || !formData.valor) {
      setFeedback({ text: 'Por favor, preencha Documento, Histórico e Valor.', type: 'error' });
      return;
    }

    setIsSaving(true);
    setFeedback({ text: '', type: '' });

    try {
      const token = localStorage.getItem("@AgroPops:token");
      const response = await fetch(`${baseUrl}/livro-caixa/${currentProducer.id}/avulso`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          valor: parseFloat(formData.valor.replace(',', '.'))
        })
      });

      if (response.ok) {
        setFeedback({ text: 'Lançamento registrado com sucesso!', type: 'success' });
        setTimeout(() => {
          setIsModalOpen(false);
          setFormData({
            data: new Date().toISOString().split('T')[0],
            tipo: 'SAIDA',
            tipoDocumento: '3',
            documento: '',
            cpfCnpjParticipante: '',
            historico: '',
            valor: '',
            isDedutivel: true
          });
          setFeedback({ text: '', type: '' });
          buscarLancamentos();
        }, 1500);
      } else {
        const txt = await response.text();
        setFeedback({ text: txt || 'Erro ao salvar lançamento.', type: 'error' });
      }
    } catch (error) {
      setFeedback({ text: 'Erro de comunicação com o servidor.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileSpreadsheet className="text-agro-secondary" /> 
            Livro Caixa (LCDPR)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Lançamentos detalhados do produtor organizados por ano-calendário.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm text-sm">
            <Download size={18} /> Apuração e Exportação
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-agro-secondary hover:bg-agro-primary text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm text-sm cursor-pointer"
          >
            <Plus size={18} /> Lançamento Avulso
          </button>
        </div>
      </div>

      {/* SELETOR DE ANO */}
      <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div className="flex gap-1">
          {anosDisponiveis.map(ano => (
            <button
              key={ano}
              onClick={() => setSelectedYear(ano)}
              disabled={isLoading}
              className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                selectedYear === ano ? 'bg-agro-secondary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              } disabled:opacity-50`}
            >
              {ano}
            </button>
          ))}
        </div>
        <div className="px-4 text-sm font-bold text-gray-400 flex items-center gap-3">
          {isLoading && <Loader2 size={16} className="animate-spin text-agro-light" />}
          <span>Ano-Calendário Atual: <span className="text-gray-800">{selectedYear}</span></span>
        </div>
      </div>

      {/* TABELA PRINCIPAL TIPO EXCEL */}
      <div className={`bg-white border border-gray-300 shadow-sm rounded-xl overflow-hidden font-sans transition-opacity duration-300 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className="grid grid-cols-12 bg-gray-100 border-b border-gray-300 py-3 px-4 text-[13px] font-black text-gray-600 uppercase tracking-wider">
          <div className="col-span-4">Mês de Apuração</div>
          <div className="col-span-2 text-right">Entradas (Receitas)</div>
          <div className="col-span-2 text-right">Saídas (Despesas)</div>
          <div className="col-span-2 text-right">Dedutível (LCDPR)</div>
          <div className="col-span-2 text-right">Saldo do Mês</div>
        </div>

        <div className="divide-y divide-gray-200">
          {dadosPorMes.map((mesDados, index) => {
            const isExpanded = expandedMonths.has(index);
            const saldoMes = mesDados.totalEntradas - mesDados.totalSaidas;
            const hasData = mesDados.lancamentos.length > 0;

            return (
              <div key={index} className="flex flex-col">
                <button 
                  onClick={() => hasData && toggleMonth(index)}
                  disabled={!hasData}
                  className={`grid grid-cols-12 px-4 py-3 items-center text-sm transition-colors ${hasData ? 'hover:bg-blue-50/40 cursor-pointer' : 'bg-gray-50/30 cursor-not-allowed opacity-60'}`}
                >
                  <div className="col-span-4 flex items-center gap-2 font-bold text-gray-800">
                    <span className="text-gray-400">{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
                    {MESES[index]} {selectedYear}
                    {!hasData && <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded ml-2">Sem movimento</span>}
                  </div>
                  <div className="col-span-2 text-right font-mono text-gray-700">{formatBRL(mesDados.totalEntradas)}</div>
                  <div className="col-span-2 text-right font-mono text-gray-700">{formatBRL(mesDados.totalSaidas)}</div>
                  <div className="col-span-2 text-right font-mono font-bold text-emerald-600">{formatBRL(mesDados.totalDedutivel)}</div>
                  <div className={`col-span-2 text-right font-mono font-bold ${saldoMes < 0 ? 'text-rose-600' : 'text-blue-600'}`}>{formatBRL(saldoMes)}</div>
                </button>

                {isExpanded && hasData && (
                  <div className="bg-gray-50 border-t border-b border-gray-200 p-4 shadow-inner">
                    <table className="w-full text-left border-collapse bg-white border border-gray-300 text-[13px]">
                      <thead>
                        <tr className="bg-gray-100 text-gray-600 font-bold border-b border-gray-300 [&_th]:border-r [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2">
                          <th className="w-24">Data</th>
                          <th className="w-32">Documento</th>
                          <th>Histórico do Lançamento</th>
                          <th className="w-24 text-center">Origem</th>
                          <th className="w-28 text-center">Dedutível?</th>
                          <th className="w-32 text-right">Entrada</th>
                          <th className="w-32 text-right">Saída</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mesDados.lancamentos.map(lanc => (
                          <tr key={lanc.id} className="border-b border-gray-200 hover:bg-yellow-50/50 [&_td]:border-r [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-1.5 text-gray-700">
                            <td className="font-mono text-xs">{formatDate(lanc.data)}</td>
                            <td className="font-mono text-xs">{lanc.documento}</td>
                            <td className="truncate max-w-[300px]" title={lanc.historico}>{lanc.historico}</td>
                            <td className="text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${lanc.origem === 'NFE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{lanc.origem}</span>
                            </td>
                            <td className="text-center">
                              {lanc.tipo === 'SAIDA' ? (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${lanc.isDedutivel ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{lanc.isDedutivel ? 'SIM' : 'NÃO'}</span>
                              ) : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="text-right font-mono text-blue-600">{lanc.tipo === 'ENTRADA' ? formatBRL(lanc.valor) : ''}</td>
                            <td className="text-right font-mono text-rose-600">{lanc.tipo === 'SAIDA' ? formatBRL(lanc.valor) : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE CADASTRO AVULSO LEVEL OURO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Plus className="text-agro-secondary" /> Novo Lançamento Manual
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-400"><X size={20} /></button>
            </div>

            <form onSubmit={handleSalvarAvulso} className="p-6 space-y-4">
              {feedback.text && (
                <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border ${feedback.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  {feedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />} {feedback.text}
                </div>
              )}

              {/* TOGGLE SÉRIO: ENTRADA VS SAÍDA */}
              <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, tipo: 'SAIDA' }))}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${formData.tipo === 'SAIDA' ? 'bg-rose-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  DESPESA (Saída)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, tipo: 'ENTRADA' }))}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${formData.tipo === 'ENTRADA' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  RECEITA (Entrada)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Data da Operação</label>
                  <input 
                    type="date" required value={formData.data}
                    onChange={e => setFormData(p => ({ ...p, data: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm focus:border-agro-secondary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Tipo de Documento (LCDPR)</label>
                  <select
                    value={formData.tipoDocumento}
                    onChange={e => setFormData(p => ({ ...p, tipoDocumento: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg outline-none text-sm focus:border-agro-secondary font-medium text-gray-700"
                  >
                    {TIPOS_DOCUMENTO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Número do Documento</label>
                  <input 
                    type="text" required placeholder="Ex: Recibo 45, NF 210" value={formData.documento}
                    onChange={e => setFormData(p => ({ ...p, documento: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm focus:border-agro-secondary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">CPF / CNPJ do Participante</label>
                  <input 
                    type="text" placeholder="Apenas números" value={formData.cpfCnpjParticipante}
                    onChange={e => setFormData(p => ({ ...p, cpfCnpjParticipante: e.target.value.replace(/\D/g, '') }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm focus:border-agro-secondary font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase">Histórico / Descrição do Lançamento</label>
                <input 
                  type="text" required placeholder="Ex: Pagamento folha de salários Ref. Maio/2026" value={formData.historico}
                  onChange={e => setFormData(p => ({ ...p, historico: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm focus:border-agro-secondary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 items-center pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Valor do Lançamento (R$)</label>
                  <input 
                    type="text" required placeholder="0,00" value={formData.valor}
                    onChange={e => setFormData(p => ({ ...p, valor: e.target.value.replace(/[^0-9,.]/g, '') }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm font-mono font-bold focus:border-agro-secondary text-right text-gray-800"
                  />
                </div>

                {/* LOGICA DE NEGÓCIO DE PREVENÇÃO FISCAL (Toggle só aparece se for Despesa) */}
                {formData.tipo === 'SAIDA' ? (
                  <div className="pt-5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" checked={formData.isDedutivel}
                        onChange={e => setFormData(p => ({ ...p, isDedutivel: e.target.checked }))}
                        className="rounded border-gray-300 text-agro-secondary focus:ring-agro-secondary h-4 w-4"
                      />
                      <div className="text-xs">
                        <p className="font-bold text-gray-700">Despesa Dedutível</p>
                        <p className="text-[10px] text-gray-400">Abate imposto no Livro Caixa</p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="pt-5 text-xs text-gray-400 font-medium italic">
                    * Receitas entram 100% no faturamento bruto.
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 -mx-6 -mb-6 p-4">
                <button 
                  type="button" onClick={() => setIsModalOpen(false)} disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={isSaving}
                  className="px-5 py-2 text-sm font-bold text-white bg-agro-secondary hover:bg-agro-primary rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}