'use client';

import React, { useState, useMemo } from 'react';
import {
  Contato,
  Pedido,
  ItemEstoque,
  EtapaPedido,
  CustoExtraPedido,
  StatusFinanceiro,
} from '@/lib/supabase';
import {
  ShoppingBag,
  Truck,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit3,
  MapPin,
  Scale,
  DollarSign,
  Users,
  AlertTriangle,
  ArrowRight,
  Check,
  X,
  ClipboardCheck,
  Package,
  RefreshCw,
} from 'lucide-react';

interface FluxoPedidosCarregamentoProps {
  pedidos: Pedido[];
  contatos: Contato[];
  estoque: ItemEstoque[];
  hojeStr: string;
  onNovoPedido: () => void;
  onEditarPedido: (pedido: Pedido) => void;
  onExcluirPedido: (id: string) => void;
  onAtualizarPedido: (pedidoAtualizado: Pedido, descontarEstoque?: { toneladas?: number; sacos?: number }) => Promise<void>;
  onAlternarStatusFinanceiro: (pedidoId: string) => void;
  onDispararWhatsApp: (telefone: string | null | undefined, nome: string, mensagem: string) => void;
  modoInicial?: 'pedidos' | 'funcionarios';
}

export function calcularTotaisPedido(pedido: Pedido) {
  const valorBase =
    pedido.valor_base_produtos != null
      ? Number(pedido.valor_base_produtos)
      : Number(pedido.valor_total || 0);

  const valorFrete = pedido.tem_frete !== false ? Number(pedido.valor_frete || 0) : 0;
  const freteRepassado =
    pedido.tem_frete !== false && pedido.tipo_frete_cobranca !== 'custo_interno' ? valorFrete : 0;
  const freteInterno =
    pedido.tem_frete !== false && pedido.tipo_frete_cobranca === 'custo_interno' ? valorFrete : 0;

  const extras = pedido.custos_extras || [];
  const extrasRepassados = extras
    .filter((e) => e.tipo === 'repassar_cliente')
    .reduce((acc, e) => acc + (Number(e.valor) || 0), 0);
  const extrasInternos = extras
    .filter((e) => e.tipo === 'custo_interno')
    .reduce((acc, e) => acc + (Number(e.valor) || 0), 0);

  const valorFinalCliente = valorBase + freteRepassado + extrasRepassados;
  const custoInternoTotal = freteInterno + extrasInternos;
  const lucroLiquido = valorFinalCliente - custoInternoTotal;

  const toneladasFinal =
    pedido.toneladas_real != null
      ? Number(pedido.toneladas_real)
      : Number(pedido.quantidade_toneladas_num || 0);
  const sacosFinal = Number(pedido.sacos_real || 0);

  const qtdParcelas =
    pedido.qtd_parcelas && Number(pedido.qtd_parcelas) > 1 ? Number(pedido.qtd_parcelas) : 1;
  const adiantamento = Number(pedido.valor_adiantamento || 0);
  const baseParcelavel = Math.max(0, valorFinalCliente - adiantamento);
  const valorPorParcela = qtdParcelas > 0 ? baseParcelavel / qtdParcelas : baseParcelavel;

  const parcelasPagasBruto = Math.min(
    qtdParcelas,
    Math.max(0, Number(pedido.parcelas_pagas || 0))
  );
  const parcelasPagas =
    pedido.status_financeiro === 'pago' ? qtdParcelas : parcelasPagasBruto;
  const parcelasRestantes = Math.max(0, qtdParcelas - parcelasPagas);

  const valorPagoParcelas = parcelasPagas * valorPorParcela;
  const valorTotalPago =
    pedido.status_financeiro === 'pago'
      ? valorFinalCliente
      : Math.min(valorFinalCliente, adiantamento + valorPagoParcelas);
  const saldoDevedor =
    pedido.status_financeiro === 'pago'
      ? 0
      : Math.max(0, valorFinalCliente - valorTotalPago);

  return {
    valorBase,
    valorFrete,
    freteRepassado,
    freteInterno,
    extrasRepassados,
    extrasInternos,
    valorFinalCliente,
    custoInternoTotal,
    lucroLiquido,
    // Aliases usados nos relatórios financeiros
    totalCobradoCliente: valorFinalCliente,
    totalCustosInternos: custoInternoTotal,
    extrasCliente: extrasRepassados,
    freteCliente: freteRepassado,
    lucroLiquidoPedido: lucroLiquido,
    toneladasFinal,
    sacosFinal,
    // Controle de Parcelas e Saldo Devedor
    qtdParcelas,
    parcelasPagas,
    parcelasRestantes,
    adiantamento,
    valorPorParcela,
    valorTotalPago,
    saldoDevedor,
  };
}

export function FluxoPedidosCarregamento({
  pedidos,
  contatos,
  estoque,
  hojeStr,
  onNovoPedido,
  onEditarPedido,
  onExcluirPedido,
  onAtualizarPedido,
  onAlternarStatusFinanceiro,
  onDispararWhatsApp,
  modoInicial = 'pedidos',
}: FluxoPedidosCarregamentoProps) {
  const [subVisao, setSubVisao] = useState<'pedidos' | 'funcionarios'>(modoInicial);
  const [filtroEtapa, setFiltroEtapa] = useState<'todos' | EtapaPedido>('todos');

  // Modal de Conferência de Carga Real + Extras (Chapa, etc.)
  const [modalCargaPedido, setModalCargaPedido] = useState<Pedido | null>(null);
  const [cargaForm, setCargaForm] = useState<{
    toneladasReal: string;
    sacosReal: string;
    valorBaseProdutos: string;
    temFrete: boolean;
    terceiroId: string;
    valorFrete: string;
    tipoFreteCobranca: 'repassar_cliente' | 'custo_interno';
    custosExtras: CustoExtraPedido[];
    observacaoCarga: string;
  }>({
    toneladasReal: '',
    sacosReal: '',
    valorBaseProdutos: '',
    temFrete: true,
    terceiroId: '',
    valorFrete: '',
    tipoFreteCobranca: 'repassar_cliente',
    custosExtras: [],
    observacaoCarga: '',
  });

  const terceiros = useMemo(
    () => contatos.filter((c) => c.tipo === 'terceiro'),
    [contatos]
  );

  const funcionarios = useMemo(
    () => contatos.filter((c) => c.tipo === 'funcionario'),
    [contatos]
  );

  const abrirModalConferenciaCarga = (p: Pedido) => {
    const totais = calcularTotaisPedido(p);
    setModalCargaPedido(p);
    setCargaForm({
      toneladasReal: String(p.toneladas_real ?? p.quantidade_toneladas_num ?? 10),
      sacosReal: p.sacos_real != null ? String(p.sacos_real) : '',
      valorBaseProdutos: String(totais.valorBase),
      temFrete: p.tem_frete !== false,
      terceiroId: p.terceiro_id || '',
      valorFrete: p.valor_frete != null ? String(p.valor_frete) : '',
      tipoFreteCobranca: p.tipo_frete_cobranca || 'repassar_cliente',
      custosExtras: p.custos_extras ? [...p.custos_extras] : [],
      observacaoCarga: p.observacao || '',
    });
  };

  const adicionarCustoExtra = (descricaoPadrao: string = '') => {
    setCargaForm((prev) => ({
      ...prev,
      custosExtras: [
        ...prev.custosExtras,
        {
          id: `ext-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          descricao: descricaoPadrao,
          valor: 0,
          tipo: 'repassar_cliente',
        },
      ],
    }));
  };

  const removerCustoExtra = (id: string) => {
    setCargaForm((prev) => ({
      ...prev,
      custosExtras: prev.custosExtras.filter((c) => c.id !== id),
    }));
  };

  const recalcularPrecoBasePorPeso = () => {
    if (!modalCargaPedido) return;
    const tonAntiga = modalCargaPedido.quantidade_toneladas_num || 10;
    const baseAntiga =
      modalCargaPedido.valor_base_produtos != null
        ? modalCargaPedido.valor_base_produtos
        : modalCargaPedido.valor_total || 4500;
    const precoPorTon = tonAntiga > 0 ? baseAntiga / tonAntiga : 450;
    const novaTon = parseFloat(cargaForm.toneladasReal) || 0;
    const novoValor = Math.round(novaTon * precoPorTon * 100) / 100;
    setCargaForm((prev) => ({ ...prev, valorBaseProdutos: String(novoValor) }));
  };

  const confirmarCarregamentoReal = async () => {
    if (!modalCargaPedido) return;

    const tonRealNum = parseFloat(cargaForm.toneladasReal) || 0;
    const sacosRealNum = cargaForm.sacosReal ? parseFloat(cargaForm.sacosReal) || 0 : null;
    const valorBaseNum = parseFloat(cargaForm.valorBaseProdutos) || 0;
    const valorFreteNum = cargaForm.temFrete ? parseFloat(cargaForm.valorFrete) || 0 : 0;

    const freteRepassado =
      cargaForm.temFrete && cargaForm.tipoFreteCobranca === 'repassar_cliente' ? valorFreteNum : 0;
    const extrasRepassados = cargaForm.custosExtras
      .filter((e) => e.tipo === 'repassar_cliente')
      .reduce((acc, e) => acc + (Number(e.valor) || 0), 0);

    const valorTotalFinalCliente = valorBaseNum + freteRepassado + extrasRepassados;

    const descricaoQtdFinal = [
      tonRealNum > 0 ? `${tonRealNum} toneladas` : null,
      sacosRealNum && sacosRealNum > 0 ? `${sacosRealNum} sacos` : null,
    ]
      .filter(Boolean)
      .join(' + ');

    const jaBaixou = Boolean(modalCargaPedido.estoque_baixado);

    const pedidoFinalizado: Pedido = {
      ...modalCargaPedido,
      etapa_pedido: 'carregado',
      toneladas_real: tonRealNum,
      sacos_real: sacosRealNum,
      quantidade_toneladas_num: tonRealNum > 0 ? tonRealNum : modalCargaPedido.quantidade_toneladas_num,
      quantidade: descricaoQtdFinal || modalCargaPedido.quantidade,
      valor_base_produtos: valorBaseNum,
      tem_frete: cargaForm.temFrete,
      terceiro_id: cargaForm.terceiroId || null,
      valor_frete: valorFreteNum,
      tipo_frete_cobranca: cargaForm.tipoFreteCobranca,
      custos_extras: cargaForm.custosExtras,
      valor_total: valorTotalFinalCliente,
      observacao: cargaForm.observacaoCarga || null,
      estoque_baixado: true,
    };

    await onAtualizarPedido(
      pedidoFinalizado,
      !jaBaixou ? { toneladas: tonRealNum, sacos: sacosRealNum || 0 } : undefined
    );
    setModalCargaPedido(null);
  };

  // Pedidos filtrados para a visão principal
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const etapa: EtapaPedido = p.etapa_pedido || 'pre_pedido';
      if (filtroEtapa === 'todos') return true;
      return etapa === filtroEtapa;
    });
  }, [pedidos, filtroEtapa]);

  // Pedidos para a Tela de Funcionários (Agendados, em Carregamento ou Carregados recentemente)
  const pedidosCarregamentoFuncionarios = useMemo(() => {
    return [...pedidos]
      .filter((p) => {
        const etapa = p.etapa_pedido || 'pre_pedido';
        return etapa === 'agendado' || etapa === 'carregado' || Boolean(p.data_carregamento);
      })
      .sort((a, b) => {
        const dA = a.data_carregamento || '9999-12-31';
        const dB = b.data_carregamento || '9999-12-31';
        return dA.localeCompare(dB);
      });
  }, [pedidos]);

  const qtdCargasPendentes = useMemo(
    () =>
      pedidos.filter((p) => (p.etapa_pedido || 'pre_pedido') === 'agendado').length,
    [pedidos]
  );

  return (
    <div className="space-y-4">
      {/* Seletor Superior: Fluxo Comercial de Pedidos vs. Tela de Funcionários (Pátio / Carregamento) */}
      <div className="flex items-center justify-between gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => setSubVisao('pedidos')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            subVisao === 'pedidos'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Fluxo de Pedidos ({pedidos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubVisao('funcionarios')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all relative ${
            subVisao === 'funcionarios'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>👨‍🌾 Pátio / Funcionários</span>
          {qtdCargasPendentes > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
              {qtdCargasPendentes}
            </span>
          )}
        </button>
      </div>

      {/* ===================================================================== */}
      {/* VISÃO 1: FLUXO COMPLETO DE PEDIDOS (PRÉ-PEDIDO -> FRETE -> CLIENTE -> AGENDADO -> CARREGADO) */}
      {/* ===================================================================== */}
      {subVisao === 'pedidos' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between gap-2 px-1">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-400" /> Gestão de Pré-Pedidos e Cargas
              </h2>
              <p className="text-[10px] text-slate-400">
                1. Pré-Pedido & Frete → 2. Confirma Cliente → 3. Agenda Carga → 4. Peso Real & Extras
              </p>
            </div>
            <button
              type="button"
              onClick={onNovoPedido}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> + Pré-Pedido
            </button>
          </div>

          {/* Barra de Filtros por Etapa */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {[
              { id: 'todos', label: `Todos (${pedidos.length})` },
              {
                id: 'pre_pedido',
                label: `1️⃣ Pré-Pedido / Frete (${
                  pedidos.filter((p) => (p.etapa_pedido || 'pre_pedido') === 'pre_pedido').length
                })`,
              },
              {
                id: 'aguardando_cliente',
                label: `2️⃣ Confirmar Cliente (${
                  pedidos.filter((p) => p.etapa_pedido === 'aguardando_cliente').length
                })`,
              },
              {
                id: 'agendado',
                label: `3️⃣ Agendados / Pátio (${
                  pedidos.filter((p) => p.etapa_pedido === 'agendado').length
                })`,
              },
              {
                id: 'carregado',
                label: `4️⃣ Carregados / Finais (${
                  pedidos.filter((p) => p.etapa_pedido === 'carregado').length
                })`,
              },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroEtapa(f.id as any)}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap font-bold border transition-all ${
                  filtroEtapa === f.id
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-900 text-slate-300 border-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Lista de Cards de Pedidos */}
          <div className="space-y-3.5">
            {pedidosFiltrados.map((pedido) => {
              const etapa: EtapaPedido = pedido.etapa_pedido || 'pre_pedido';
              const clienteObj = contatos.find(
                (c) => c.nome === pedido.nome_cliente || c.id === pedido.contato_id
              );
              const motoristaObj = terceiros.find((t) => t.id === pedido.terceiro_id);
              const qtdTon = pedido.toneladas_real ?? pedido.quantidade_toneladas_num ?? 10;
              const totais = calcularTotaisPedido(pedido);

              const isPagAtrasado =
                pedido.status_financeiro !== 'pago' &&
                (pedido.status_financeiro === 'atrasado' ||
                  Boolean(
                    pedido.data_vencimento_pagamento && pedido.data_vencimento_pagamento < hojeStr
                  ));
              const valAdiantado = pedido.valor_adiantamento || 0;
              const saldoRestantePed = Math.max(0, totais.valorFinalCliente - valAdiantado);
              const qtdParcelasPed =
                pedido.qtd_parcelas && pedido.qtd_parcelas > 1 ? pedido.qtd_parcelas : null;

              const etapasOrdem: { id: EtapaPedido; curto: string }[] = [
                { id: 'pre_pedido', curto: '1. Pré-Pedido/Frete' },
                { id: 'aguardando_cliente', curto: '2. Cliente' },
                { id: 'agendado', curto: '3. Agendado' },
                { id: 'carregado', curto: '4. Carregado' },
              ];
              const idxEtapaAtual = etapasOrdem.findIndex((e) => e.id === etapa);

              return (
                <div
                  key={pedido.id}
                  className={`bg-slate-900 border rounded-2xl p-4 space-y-3 shadow-md transition-all ${
                    etapa === 'carregado'
                      ? 'border-emerald-600/50'
                      : etapa === 'agendado'
                      ? 'border-sky-500/50'
                      : etapa === 'aguardando_cliente'
                      ? 'border-amber-500/50'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Cabeçalho do Pedido */}
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-sm">{pedido.nome_cliente}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                            etapa === 'carregado'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                              : etapa === 'agendado'
                              ? 'bg-sky-950 text-sky-300 border-sky-700'
                              : etapa === 'aguardando_cliente'
                              ? 'bg-amber-950 text-amber-300 border-amber-700'
                              : 'bg-purple-950 text-purple-300 border-purple-700'
                          }`}
                        >
                          {etapa === 'pre_pedido'
                            ? '📝 1. Pré-Pedido (Orçamento)'
                            : etapa === 'aguardando_cliente'
                            ? '💬 2. Aguardando Cliente'
                            : etapa === 'agendado'
                            ? '🚜 3. Carga Agendada'
                            : '✅ 4. Pedido Final Carregado'}
                        </span>

                        <button
                          type="button"
                          onClick={() => pedido.id && onAlternarStatusFinanceiro(pedido.id)}
                          className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border cursor-pointer ${
                            pedido.status_financeiro === 'pago'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : isPagAtrasado
                              ? 'bg-red-950 text-red-300 border-red-700 animate-pulse'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                          title="Alternar status do pagamento"
                        >
                          {pedido.status_financeiro === 'pago'
                            ? '💲 Pago'
                            : isPagAtrasado
                            ? '🚨 Pagto Atrasado'
                            : '⏳ Pagto Aberto'}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        Criado em: {pedido.data_compra}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditarPedido(pedido)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors"
                        title="Editar informações do pré-pedido"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => pedido.id && onExcluirPedido(pedido.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-red-400 transition-colors"
                        title="Excluir pedido"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Barra de Etapas Clicável (Permite avançar ou voltar etapa facilmente) */}
                  <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
                    {etapasOrdem.map((st, idx) => {
                      const ativo = idx === idxEtapaAtual;
                      const concluido = idx < idxEtapaAtual;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            if (st.id === 'carregado') {
                              abrirModalConferenciaCarga(pedido);
                            } else {
                              onAtualizarPedido({ ...pedido, etapa_pedido: st.id });
                            }
                          }}
                          className={`py-1 px-1 rounded-lg text-[9px] font-bold text-center truncate transition-all ${
                            ativo
                              ? 'bg-emerald-600 text-white shadow'
                              : concluido
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {st.curto}
                        </button>
                      );
                    })}
                  </div>

                  {/* Resumo de Produto, Quantidade (Estimada vs Final) e Valores */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">🌾 {pedido.produto}</span>
                      <span className="font-extrabold text-emerald-300 text-sm font-mono">
                        R$ {totais.valorFinalCliente.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>
                        {etapa === 'carregado' ? '⚖️ Carga Final:' : '📦 Qtd. Estimada:'}{' '}
                        <strong>
                          {pedido.toneladas_real != null
                            ? `${pedido.toneladas_real} toneladas`
                            : pedido.quantidade || `${qtdTon}t`}
                        </strong>
                        {pedido.sacos_real != null && pedido.sacos_real > 0
                          ? ` (${pedido.sacos_real} sacos)`
                          : ''}
                      </span>
                      <span className="text-slate-400 font-mono">
                        Silagem: R$ {totais.valorBase.toFixed(2)}
                      </span>
                    </div>

                    {pedido.tem_frete !== false && totais.valorFrete > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-amber-300">
                        <span>
                          🚚 Frete ({motoristaObj?.nome || 'Terceiro'}): R$ {totais.valorFrete.toFixed(2)}
                        </span>
                        <span className="text-[10px] uppercase bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-800">
                          {pedido.tipo_frete_cobranca === 'custo_interno'
                            ? 'Custo Interno'
                            : 'Soma no Cliente'}
                        </span>
                      </div>
                    )}

                    {pedido.custos_extras && pedido.custos_extras.length > 0 && (
                      <div className="pt-1 border-t border-slate-800/80 space-y-0.5 text-[11px]">
                        {pedido.custos_extras.map((ext) => (
                          <div key={ext.id} className="flex items-center justify-between">
                            <span className="text-slate-300">➕ {ext.descricao || 'Extra/Chapa'}:</span>
                            <span
                              className={`font-mono font-semibold ${
                                ext.tipo === 'repassar_cliente' ? 'text-sky-300' : 'text-rose-300'
                              }`}
                            >
                              R$ {Number(ext.valor).toFixed(2)} (
                              {ext.tipo === 'repassar_cliente' ? 'Cliente' : 'Custo Interno'})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Resumo de Pagamento / Parcelas / Adiantamento */}
                    {(pedido.data_vencimento_pagamento ||
                      valAdiantado > 0 ||
                      qtdParcelasPed ||
                      pedido.dia_pagamento_parcelas ||
                      totais.parcelasPagas > 0) && (
                      <div className="pt-1.5 mt-1 border-t border-slate-800/80 text-[10px] text-slate-300 flex flex-wrap gap-x-3 gap-y-0.5">
                        {valAdiantado > 0 && (
                          <span>
                            💵 Adiantou: <strong>R$ {valAdiantado.toFixed(2)}</strong>
                          </span>
                        )}
                        {qtdParcelasPed && (
                          <span className="text-sky-300 font-semibold">
                            💳 {qtdParcelasPed}x de R$ {totais.valorPorParcela.toFixed(2)} (
                            {totais.parcelasPagas}/{qtdParcelasPed} pagas • Aberto: R${' '}
                            {totais.saldoDevedor.toFixed(2)})
                          </span>
                        )}
                        {!qtdParcelasPed && totais.saldoDevedor > 0 && (
                          <span className="text-amber-300 font-semibold">
                            💰 Falta Receber: R$ {totais.saldoDevedor.toFixed(2)}
                          </span>
                        )}
                        {pedido.data_vencimento_pagamento && (
                          <span className={isPagAtrasado ? 'text-red-400 font-bold' : 'text-amber-300'}>
                            📅 Vencimento: {pedido.data_vencimento_pagamento}
                          </span>
                        )}
                        {pedido.dia_pagamento_parcelas && (
                          <span>🗓️ Combinado: {pedido.dia_pagamento_parcelas}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {clienteObj?.endereco_fazenda && (
                    <div className="text-[11px] text-emerald-300 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{clienteObj.endereco_fazenda}</span>
                      </div>
                      {clienteObj.latitude != null && clienteObj.longitude != null && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${clienteObj.latitude},${clienteObj.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded font-bold shrink-0"
                        >
                          🗺️ Mapa
                        </a>
                      )}
                    </div>
                  )}

                  {/* =============================================================== */}
                  {/* PAINEL DE AÇÃO DA ETAPA 1: PRÉ-PEDIDO & COTAÇÃO DE FRETE        */}
                  {/* =============================================================== */}
                  {etapa === 'pre_pedido' && (
                    <div className="bg-slate-950/90 border border-purple-500/40 rounded-xl p-3 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-300 text-[11px] uppercase flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-purple-400" /> Passo 1: Definir Frete do Pré-Pedido
                        </span>
                        <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pedido.tem_frete !== false}
                            onChange={(e) =>
                              onAtualizarPedido({
                                ...pedido,
                                tem_frete: e.target.checked,
                                valor_frete: e.target.checked ? pedido.valor_frete : 0,
                              })
                            }
                            className="accent-emerald-500"
                          />
                          Precisa de Frete
                        </label>
                      </div>

                      {pedido.tem_frete !== false && (
                        <>
                          {/* Lista rápida de caminhoneiros para ligar/cotar */}
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                            {terceiros.map((t) => {
                              const cap = t.capacidade_carga_toneladas || 10;
                              const viagens = cap >= qtdTon ? 1 : Math.ceil(qtdTon / cap);
                              const isEscolhido = pedido.terceiro_id === t.id;

                              return (
                                <div
                                  key={t.id}
                                  className={`flex items-center justify-between p-2 rounded-lg border text-[11px] ${
                                    isEscolhido
                                      ? 'bg-amber-950/40 border-amber-500/60'
                                      : 'bg-slate-900 border-slate-800'
                                  }`}
                                >
                                  <div>
                                    <span className="font-bold text-white block">{t.nome}</span>
                                    <span className="text-[10px] text-slate-400">
                                      {t.tipo_veiculo} ({cap}t) • {viagens}{' '}
                                      {viagens === 1 ? 'viagem' : 'viagens'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onAtualizarPedido({ ...pedido, terceiro_id: t.id })
                                      }
                                      className={`px-2 py-1 rounded text-[10px] font-bold ${
                                        isEscolhido
                                          ? 'bg-amber-500 text-slate-950'
                                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                      }`}
                                    >
                                      {isEscolhido ? '✓ Escolhido' : 'Escolher'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const linkMapa =
                                          clienteObj?.latitude && clienteObj?.longitude
                                            ? ` (Mapa: https://www.google.com/maps?q=${clienteObj.latitude},${clienteObj.longitude})`
                                            : '';
                                        onDispararWhatsApp(
                                          t.telefone,
                                          t.nome,
                                          `Olá parceiro ${t.nome}! Estamos cotando um frete de ${
                                            pedido.quantidade || `${qtdTon}t`
                                          } de ${pedido.produto || 'Silagem'} para entregar em ${
                                            clienteObj?.endereco_fazenda || pedido.nome_cliente
                                          }${linkMapa}. Qual o valor do seu frete e disponibilidade?`
                                        );
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1"
                                    >
                                      <img src="/whatsapp.png" alt="WA" className="w-3 h-3" /> Cotar
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Input do Valor do Frete Cobrado */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">
                                Valor do Frete (R$)
                              </label>
                              <input
                                type="number"
                                step="10"
                                placeholder="Ex: 600.00"
                                value={pedido.valor_frete ?? ''}
                                onChange={(e) => {
                                  const vf = parseFloat(e.target.value) || 0;
                                  const base =
                                    pedido.valor_base_produtos != null
                                      ? pedido.valor_base_produtos
                                      : pedido.valor_total || 0;
                                  const cobranca = pedido.tipo_frete_cobranca || 'repassar_cliente';
                                  onAtualizarPedido({
                                    ...pedido,
                                    valor_base_produtos: base,
                                    valor_frete: vf,
                                    valor_total:
                                      cobranca === 'repassar_cliente' ? base + vf : base,
                                  });
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-bold outline-none focus:border-amber-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">
                                Cobrança do Frete
                              </label>
                              <select
                                value={pedido.tipo_frete_cobranca || 'repassar_cliente'}
                                onChange={(e) => {
                                  const tipo = e.target.value as 'repassar_cliente' | 'custo_interno';
                                  const base =
                                    pedido.valor_base_produtos != null
                                      ? pedido.valor_base_produtos
                                      : pedido.valor_total || 0;
                                  const vf = Number(pedido.valor_frete || 0);
                                  onAtualizarPedido({
                                    ...pedido,
                                    valor_base_produtos: base,
                                    tipo_frete_cobranca: tipo,
                                    valor_total: tipo === 'repassar_cliente' ? base + vf : base,
                                  });
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white outline-none text-[11px]"
                              >
                                <option value="repassar_cliente">🔄 Somar p/ Cliente</option>
                                <option value="custo_interno">🏢 Custo Interno</option>
                              </select>
                            </div>
                          </div>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          onAtualizarPedido({
                            ...pedido,
                            etapa_pedido: 'aguardando_cliente',
                            valor_base_produtos: totais.valorBase,
                            valor_total: totais.valorFinalCliente,
                          })
                        }
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-2 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow"
                      >
                        <span>Avançar: 2. Confirmar Valor Final c/ Cliente</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* =============================================================== */}
                  {/* PAINEL DE AÇÃO DA ETAPA 2: CONFIRMAR VALOR FINAL COM O CLIENTE  */}
                  {/* =============================================================== */}
                  {etapa === 'aguardando_cliente' && (
                    <div className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-3 space-y-2.5 text-xs">
                      <span className="font-bold text-amber-300 text-[11px] uppercase block">
                        💬 Passo 2: Passar Valor Total do Pré-Pedido ao Cliente
                      </span>

                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1 text-[11px]">
                        <div className="flex justify-between text-slate-300">
                          <span>Valor da Silagem ({pedido.quantidade}):</span>
                          <span className="font-mono">R$ {totais.valorBase.toFixed(2)}</span>
                        </div>
                        {totais.freteRepassado > 0 && (
                          <div className="flex justify-between text-amber-300">
                            <span>+ Frete de Entrega:</span>
                            <span className="font-mono">R$ {totais.freteRepassado.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-extrabold text-emerald-400 border-t border-slate-800 pt-1 text-xs">
                          <span>Total do Pré-Pedido p/ Cliente:</span>
                          <span className="font-mono">R$ {totais.valorFinalCliente.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const txtFrete =
                              totais.freteRepassado > 0
                                ? ` + Frete R$ ${totais.freteRepassado.toFixed(2)}`
                                : ' (Sem frete adicional)';
                            onDispararWhatsApp(
                              clienteObj?.telefone,
                              pedido.nome_cliente,
                              `Olá ${pedido.nome_cliente}! Segue o orçamento completo do seu pré-pedido na Caboclo Silagem:\n• Produto: ${pedido.produto} (${pedido.quantidade})\n• Valor Silagem: R$ ${totais.valorBase.toFixed(2)}${txtFrete}\n• *Valor Total Estimado: R$ ${totais.valorFinalCliente.toFixed(2)}*\n*(Obs: O valor final exato é ajustado pelo peso/sacos reais na hora do carregamento)*.\nPodemos confirmar e agendar o carregamento?`
                            );
                          }}
                          className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1"
                        >
                          <img src="/whatsapp.png" alt="WA" className="w-3.5 h-3.5" /> Enviar p/ Cliente
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onAtualizarPedido({
                              ...pedido,
                              etapa_pedido: 'agendado',
                              data_carregamento: pedido.data_carregamento || hojeStr,
                              data_entrega: pedido.data_entrega || hojeStr,
                            })
                          }
                          className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-2 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1 shadow"
                        >
                          <Check className="w-3.5 h-3.5" /> Cliente Confirmou!
                        </button>
                      </div>
                    </div>
                  )}

                  {/* =============================================================== */}
                  {/* PAINEL DE AÇÃO DA ETAPA 3: AGendar CARREGAMENTO, ENTREGA E AVISOS */}
                  {/* =============================================================== */}
                  {etapa === 'agendado' && (
                    <div className="bg-slate-950/90 border border-sky-500/40 rounded-xl p-3 space-y-2.5 text-xs">
                      <span className="font-bold text-sky-300 text-[11px] uppercase block">
                        📅 Passo 3: Datas de Carregamento, Entrega e Avisos
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">
                            🚜 Data de Carregamento
                          </label>
                          <input
                            type="date"
                            value={pedido.data_carregamento || ''}
                            onChange={(e) =>
                              onAtualizarPedido({ ...pedido, data_carregamento: e.target.value })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-[11px] outline-none focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">
                            📍 Data de Entrega Cliente
                          </label>
                          <input
                            type="date"
                            value={pedido.data_entrega || ''}
                            onChange={(e) =>
                              onAtualizarPedido({ ...pedido, data_entrega: e.target.value })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-[11px] outline-none focus:border-sky-500"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] text-slate-400 block mb-0.5">
                            👨‍🌾 Funcionário Responsável pelo Carregamento
                          </label>
                          <select
                            value={pedido.funcionario_id || ''}
                            onChange={(e) => {
                              const fObj = funcionarios.find((f) => f.id === e.target.value);
                              onAtualizarPedido({
                                ...pedido,
                                funcionario_id: e.target.value || null,
                                nome_funcionario: fObj?.nome || null,
                              });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-[11px] outline-none"
                          >
                            <option value="">-- Equipe Geral do Pátio --</option>
                            {funcionarios.map((f) => (
                              <option key={f.id} value={f.id}>
                                👨‍🌾 {f.nome} {f.telefone ? `(${f.telefone})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 3 Botões de Aviso por WhatsApp: Funcionário, Caminhoneiro e Cliente */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const funcObj = funcionarios.find((f) => f.id === pedido.funcionario_id);
                            onDispararWhatsApp(
                              funcObj?.telefone,
                              funcObj?.nome || 'Equipe Pátio',
                              `🚜 *ORDEM DE CARREGAMENTO — CABOCLO*\n• Data de Carregar: *${
                                pedido.data_carregamento || hojeStr
                              }*\n• Cliente: ${pedido.nome_cliente}\n• Produto: ${
                                pedido.produto
                              } (${pedido.quantidade})\n• Motorista: ${
                                motoristaObj?.nome || 'Retirada no local'
                              }\nPor favor, preparar a carga e anotar o peso/sacos reais na hora de encher!`
                            );
                          }}
                          className="bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 py-1.5 px-1.5 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1"
                        >
                          👨‍🌾 Avisar Func.
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const linkMapa =
                              clienteObj?.latitude && clienteObj?.longitude
                                ? `\n• Mapa da Entrega: https://www.google.com/maps?q=${clienteObj.latitude},${clienteObj.longitude}`
                                : '';
                            onDispararWhatsApp(
                              motoristaObj?.telefone,
                              motoristaObj?.nome || 'Caminhoneiro',
                              `🚚 *AGENDAMENTO DE CARGA — CABOCLO SILAGEM*\nOlá ${
                                motoristaObj?.nome || 'parceiro'
                              }! Frete confirmado:\n• Data de Carregar na Fazenda: *${
                                pedido.data_carregamento || hojeStr
                              }*\n• Data de Entrega no Cliente: *${
                                pedido.data_entrega || hojeStr
                              }*\n• Carga: ${pedido.produto} (${
                                pedido.quantidade
                              })\n• Destino: ${
                                clienteObj?.endereco_fazenda || pedido.nome_cliente
                              }${linkMapa}`
                            );
                          }}
                          className="bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 py-1.5 px-1.5 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1"
                        >
                          🚚 Avisar Frete
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onDispararWhatsApp(
                              clienteObj?.telefone,
                              pedido.nome_cliente,
                              `✅ *ENTREGA AGENDADA — CABOCLO SILAGEM*\nOlá ${
                                pedido.nome_cliente
                              }! Seu pedido de ${pedido.produto} está programado:\n• Carregamento: *${
                                pedido.data_carregamento || hojeStr
                              }*\n• Previsão de Entrega na Fazenda: *${
                                pedido.data_entrega || hojeStr
                              }*\n• Motorista: ${
                                motoristaObj?.nome || 'Transporte Caboclo'
                              }\nAssim que o caminhão for pesado/carregado enviamos a confirmação final!`
                            );
                          }}
                          className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 py-1.5 px-1.5 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1"
                        >
                          👤 Avisar Cliente
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => abrirModalConferenciaCarga(pedido)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg mt-1"
                      >
                        <Scale className="w-4 h-4" />
                        <span>⚖️ Hora da Carga: Definir Peso Real, Sacos e Extras (Chapa)</span>
                      </button>
                    </div>
                  )}

                  {/* =============================================================== */}
                  {/* PAINEL DA ETAPA 4: PEDIDO CARREGADO / FINALIZADO + PAGAMENTOS   */}
                  {/* =============================================================== */}
                  {etapa === 'carregado' && (
                    <div className="bg-emerald-950/25 border border-emerald-700/40 rounded-xl p-3 space-y-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] text-emerald-200">
                          <span className="font-bold block">
                            ✅ Carga Finalizada ({pedido.toneladas_real ?? qtdTon}t
                            {pedido.sacos_real ? ` • ${pedido.sacos_real} sacos` : ''})
                          </span>
                          {totais.custoInternoTotal > 0 && (
                            <span className="text-[10px] text-slate-400">
                              Custo Interno: R$ {totais.custoInternoTotal.toFixed(2)} • Líquido: R${' '}
                              {totais.lucroLiquido.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => abrirModalConferenciaCarga(pedido)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"
                          >
                            <Scale className="w-3 h-3 text-amber-400" /> Ajustar Carga
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const extrasClienteTxt = (pedido.custos_extras || [])
                                .filter((e) => e.tipo === 'repassar_cliente')
                                .map((e) => `\n• ${e.descricao}: R$ ${Number(e.valor).toFixed(2)}`)
                                .join('');
                              onDispararWhatsApp(
                                clienteObj?.telefone,
                                pedido.nome_cliente,
                                `🌾 *CARGA PRONTA / RESUMO FINAL — CABOCLO SILAGEM*\nOlá ${
                                  pedido.nome_cliente
                                }! Seu caminhão foi carregado:\n• Produto: ${
                                  pedido.produto
                                }\n• Quantidade Final Carregada: *${
                                  pedido.toneladas_real ?? qtdTon
                                } toneladas*${
                                  pedido.sacos_real ? ` (*${pedido.sacos_real} sacos*)` : ''
                                }\n• Valor da Silagem: R$ ${totais.valorBase.toFixed(2)}${
                                  totais.freteRepassado > 0
                                    ? `\n• Frete: R$ ${totais.freteRepassado.toFixed(2)}`
                                    : ''
                                }${extrasClienteTxt}\n• *Valor Total Final: R$ ${totais.valorFinalCliente.toFixed(
                                  2
                                )}*`
                              );
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"
                          >
                            <img src="/whatsapp.png" alt="WA" className="w-3.5 h-3.5" /> Enviar Final
                          </button>
                        </div>
                      </div>

                      {/* BLOCO DE CONFIRMAÇÃO DE PAGAMENTO NO ESTÁGIO FINAL */}
                      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 space-y-2.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] font-extrabold text-amber-300 uppercase flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-amber-400" /> Confirmação de Pagamento Final
                          </span>

                          {/* Seletor rápido de modalidade: À vista ou Parcelado */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">Parcelas:</span>
                            <select
                              value={totais.qtdParcelas}
                              onChange={(e) => {
                                const novaQtd = Number(e.target.value) || 1;
                                const novasPagas = Math.min(totais.parcelasPagas, novaQtd);
                                onAtualizarPedido({
                                  ...pedido,
                                  qtd_parcelas: novaQtd > 1 ? novaQtd : null,
                                  parcelas_pagas: novasPagas,
                                  status_financeiro:
                                    novasPagas >= novaQtd && pedido.status_financeiro === 'pago'
                                      ? 'pago'
                                      : 'pendente',
                                });
                              }}
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-[11px] text-white font-bold outline-none focus:border-amber-500"
                            >
                              <option value={1}>À Vista (1x)</option>
                              <option value={2}>2x Parcelado</option>
                              <option value={3}>3x Parcelado</option>
                              <option value={4}>4x Parcelado</option>
                              <option value={5}>5x Parcelado</option>
                              <option value={6}>6x Parcelado</option>
                              <option value={8}>8x Parcelado</option>
                              <option value={10}>10x Parcelado</option>
                              <option value={12}>12x Parcelado</option>
                            </select>
                          </div>
                        </div>

                        {pedido.status_financeiro === 'pago' ? (
                          <div className="bg-emerald-950/60 border border-emerald-700/70 rounded-xl p-2.5 flex items-center justify-between gap-2">
                            <div>
                              <span className="text-xs font-extrabold text-emerald-300 block">
                                ✅ Dívida Totalmente Quitada!
                              </span>
                              <span className="text-[10px] text-emerald-200/80">
                                Total recebido: R$ {totais.valorFinalCliente.toFixed(2)}
                                {totais.qtdParcelas > 1
                                  ? ` (${totais.qtdParcelas}/${totais.qtdParcelas} parcelas pagas)`
                                  : ''}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                onAtualizarPedido({
                                  ...pedido,
                                  status_financeiro: 'pendente',
                                  parcelas_pagas:
                                    totais.qtdParcelas > 1 ? Math.max(0, totais.qtdParcelas - 1) : 0,
                                })
                              }
                              className="bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-700/50 px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0"
                            >
                              ↩️ Reabrir
                            </button>
                          </div>
                        ) : totais.qtdParcelas > 1 ? (
                          /* MODO PARCELADO: Confirmar 1ª/próxima parcela (deixar resto em aberto) OU Quitar Dívida Toda */
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                              <div>
                                <span className="text-sky-300 font-bold block">
                                  💳 {totais.qtdParcelas}x de R$ {totais.valorPorParcela.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Pagas: <strong className="text-emerald-400">{totais.parcelasPagas}</strong> • Em aberto:{' '}
                                  <strong className="text-amber-300">{totais.parcelasRestantes}</strong>
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block">Saldo Restante</span>
                                <span className="text-xs font-extrabold text-amber-400 font-mono">
                                  R$ {totais.saldoDevedor.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* Pílulas visuais de cada parcela */}
                            <div className="flex flex-wrap gap-1">
                              {Array.from({ length: totais.qtdParcelas }).map((_, idxParc) => {
                                const numParc = idxParc + 1;
                                const isPaga = numParc <= totais.parcelasPagas;
                                return (
                                  <button
                                    key={numParc}
                                    type="button"
                                    onClick={() => {
                                      // Permite clicar na parcela para marcar até ela ou desmarcar
                                      const novoPagas = isPaga ? numParc - 1 : numParc;
                                      const quitouTudo = novoPagas >= totais.qtdParcelas;
                                      onAtualizarPedido({
                                        ...pedido,
                                        parcelas_pagas: novoPagas,
                                        status_financeiro: quitouTudo ? 'pago' : 'pendente',
                                      });
                                    }}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                      isPaga
                                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                        : 'bg-slate-900 text-amber-300 border-amber-800/60 hover:border-amber-500'
                                    }`}
                                    title="Clique para confirmar ou desmarcar esta parcela"
                                  >
                                    {isPaga ? `✅ ${numParc}ª Paga` : `⏳ ${numParc}ª Aberta`}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                              {/* Botão 1: Confirmar a 1ª (ou próxima) parcela e deixar o resto em aberto */}
                              <button
                                type="button"
                                onClick={() => {
                                  const proxParcela = Math.min(
                                    totais.qtdParcelas,
                                    totais.parcelasPagas + 1
                                  );
                                  const quitouTudo = proxParcela >= totais.qtdParcelas;
                                  onAtualizarPedido({
                                    ...pedido,
                                    parcelas_pagas: proxParcela,
                                    status_financeiro: quitouTudo ? 'pago' : 'pendente',
                                  });
                                }}
                                className="bg-sky-600 hover:bg-sky-500 text-white py-2 px-2.5 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1 shadow transition-all active:scale-95"
                              >
                                <Check className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  Confirmar {totais.parcelasPagas + 1}ª Parcela (R${' '}
                                  {totais.valorPorParcela.toFixed(2)})
                                  {totais.parcelasPagas + 1 < totais.qtdParcelas
                                    ? ' • Resto em Aberto'
                                    : ''}
                                </span>
                              </button>

                              {/* Botão 2: Quitar a dívida toda de uma vez */}
                              <button
                                type="button"
                                onClick={() =>
                                  onAtualizarPedido({
                                    ...pedido,
                                    parcelas_pagas: totais.qtdParcelas,
                                    status_financeiro: 'pago',
                                  })
                                }
                                className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-2.5 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1 shadow transition-all active:scale-95"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  Quitar Dívida Toda (R$ {totais.saldoDevedor.toFixed(2)})
                                </span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* MODO À VISTA (1x): Confirmar Pagamento Total OU Parcelar confirmando a 1ª */
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                              <span className="text-slate-300">
                                Valor a Receber:{' '}
                                <strong className="text-amber-300 font-mono">
                                  R$ {totais.saldoDevedor.toFixed(2)}
                                </strong>
                              </span>
                              <span className="text-[10px] text-amber-400 font-bold uppercase">
                                ⏳ Em Aberto
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  onAtualizarPedido({
                                    ...pedido,
                                    parcelas_pagas: 1,
                                    status_financeiro: 'pago',
                                  })
                                }
                                className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-2.5 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1 shadow transition-all active:scale-95"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  Confirmar Pagamento / Quitar Dívida (R${' '}
                                  {totais.saldoDevedor.toFixed(2)})
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  onAtualizarPedido({
                                    ...pedido,
                                    qtd_parcelas: 2,
                                    parcelas_pagas: 1,
                                    status_financeiro: 'pendente',
                                  })
                                }
                                className="bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-700/70 py-2 px-2.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-all active:scale-95"
                              >
                                <span>💳 Parcelar: Confirmar 1ª e Deixar Resto Aberto</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISÃO 2: TELA EXCLUSIVA DE FUNCIONÁRIOS (CONFERIR CARREGAMENTOS E DATAS) */}
      {/* ===================================================================== */}
      {subVisao === 'funcionarios' && (
        <div className="space-y-3.5">
          <div className="bg-gradient-to-r from-amber-950/70 to-slate-900 border border-amber-500/40 rounded-2xl p-4 space-y-1.5 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-amber-300 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-amber-400" />
                <span>Painel de Funcionários — Carregamentos & Datas</span>
              </h2>
              <span className="bg-amber-500 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                {qtdCargasPendentes} pendentes
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Confira os pedidos agendados para carregar, prepare a silagem na data marcada e informe o{' '}
              <strong>peso real, quantidade de sacos e chapas/extras</strong> na hora de encher o caminhão.
            </p>
          </div>

          {pedidosCarregamentoFuncionarios.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs italic">
              Nenhum carregamento agendado no momento. Quando um pré-pedido for confirmado pelo cliente e agendado, ele aparecerá aqui!
            </div>
          ) : (
            <div className="space-y-3">
              {pedidosCarregamentoFuncionarios.map((p) => {
                const isCarregado = p.etapa_pedido === 'carregado';
                const isHoje = p.data_carregamento === hojeStr;
                const motoristaObj = terceiros.find((t) => t.id === p.terceiro_id);
                const clienteObj = contatos.find(
                  (c) => c.nome === p.nome_cliente || c.id === p.contato_id
                );

                return (
                  <div
                    key={p.id}
                    className={`bg-slate-900 border rounded-2xl p-4 space-y-3 shadow-md ${
                      isCarregado
                        ? 'border-emerald-700/50 opacity-90'
                        : isHoje
                        ? 'border-amber-500 ring-1 ring-amber-500/30'
                        : 'border-sky-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              isCarregado
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                : isHoje
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-sky-950 text-sky-300 border border-sky-700'
                            }`}
                          >
                            {isCarregado
                              ? '✅ JÁ CARREGADO'
                              : isHoje
                              ? '🔥 CARREGAR HOJE'
                              : `📅 CARREGAR EM: ${p.data_carregamento || 'A definir'}`}
                          </span>
                          {p.nome_funcionario && (
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold">
                              👨‍🌾 Resp: {p.nome_funcionario}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-white text-sm mt-1.5">{p.nome_cliente}</h3>
                      </div>

                      <div className="text-right text-[11px] font-mono text-slate-400">
                        <div>Carga: {p.data_carregamento || hojeStr}</div>
                        {p.data_entrega && <div>Entrega: {p.data_entrega}</div>}
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Produto Solicitado:</span>
                        <span className="font-bold text-emerald-400">{p.produto}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          {isCarregado ? 'Peso / Sacos Carregados:' : 'Previsão p/ Preparar:'}
                        </span>
                        <span className="font-bold text-white">
                          {p.toneladas_real != null
                            ? `${p.toneladas_real}t`
                            : p.quantidade || `${p.quantidade_toneladas_num || 10}t`}
                          {p.sacos_real ? ` (${p.sacos_real} sacos)` : ''}
                        </span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-amber-300 font-semibold flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5" />{' '}
                          {motoristaObj
                            ? `${motoristaObj.nome} (${motoristaObj.tipo_veiculo || 'Caminhão'})`
                            : 'Cliente retira / Sem freteiro'}
                        </span>
                        {clienteObj?.endereco_fazenda && (
                          <span className="text-slate-400 truncate max-w-[160px]">
                            📍 {clienteObj.endereco_fazenda}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => abrirModalConferenciaCarga(p)}
                      className={`w-full py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all ${
                        isCarregado
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      }`}
                    >
                      <Scale className="w-4 h-4" />
                      <span>
                        {isCarregado
                          ? 'Editar Peso Real / Sacos / Extras da Carga'
                          : '⚖️ Confirmar Carregamento (Peso Real, Sacos e Chapas)'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL DE CONFERÊNCIA NA HORA DA CARGA (PESO REAL, SACOS, PREÇO E EXTRAS/CHAPAS) */}
      {/* ===================================================================== */}
      {modalCargaPedido && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Scale className="w-5 h-5" />
                <span>Fechamento na Hora da Carga</span>
              </div>
              <button
                type="button"
                onClick={() => setModalCargaPedido(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
              <span className="font-bold text-white block">{modalCargaPedido.nome_cliente}</span>
              <span className="text-[11px] text-slate-400">
                Pré-Pedido: {modalCargaPedido.produto} ({modalCargaPedido.quantidade})
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* 1. Peso Real em Toneladas e Quantidade de Sacos */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-emerald-300 font-bold block mb-1">
                    ⚖️ Toneladas Finais (Real)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={cargaForm.toneladasReal}
                    onChange={(e) =>
                      setCargaForm({ ...cargaForm, toneladasReal: e.target.value })
                    }
                    placeholder="Ex: 11.5"
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg p-2 text-white font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-sky-300 font-bold block mb-1">
                    🛍️ Qtd. Final de Sacos
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={cargaForm.sacosReal}
                    onChange={(e) => setCargaForm({ ...cargaForm, sacosReal: e.target.value })}
                    placeholder="Opcional (Ex: 350)"
                    className="w-full bg-slate-950 border border-sky-500/40 rounded-lg p-2 text-white font-bold outline-none"
                  />
                </div>
              </div>

              {/* 2. Preço da Silagem Definido na Hora da Carga */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-300 font-bold">
                    💲 Valor da Silagem na Carga (R$)
                  </label>
                  <button
                    type="button"
                    onClick={recalcularPrecoBasePorPeso}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Recalcular pelo Peso
                  </button>
                </div>
                <input
                  type="number"
                  step="10"
                  value={cargaForm.valorBaseProdutos}
                  onChange={(e) =>
                    setCargaForm({ ...cargaForm, valorBaseProdutos: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-emerald-300 font-extrabold text-sm outline-none focus:border-emerald-500"
                />
              </div>

              {/* 3. Custos Extras na Carga (Chapas, Ajudantes, Lona, etc.) */}
              <div className="border-t border-slate-800 pt-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-amber-300 font-bold">
                    ➕ Valores Extras (Chapa, Ajudante, Outros)
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => adicionarCustoExtra('Chapa (Carregamento/Descarga)')}
                      className="bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 px-2 py-1 rounded-lg text-[10px] font-bold"
                    >
                      + Chapa
                    </button>
                    <button
                      type="button"
                      onClick={() => adicionarCustoExtra('')}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded-lg text-[10px] font-bold"
                    >
                      + Outro Extra
                    </button>
                  </div>
                </div>

                {cargaForm.custosExtras.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic">
                    Nenhum custo extra adicionado. Clique em &quot;+ Chapa&quot; caso tenha contratado chapas ou outros extras.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-0.5">
                    {cargaForm.custosExtras.map((ext, idx) => (
                      <div
                        key={ext.id}
                        className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={ext.descricao}
                            onChange={(e) => {
                              const nov = [...cargaForm.custosExtras];
                              nov[idx].descricao = e.target.value;
                              setCargaForm({ ...cargaForm, custosExtras: nov });
                            }}
                            placeholder="Descrição (Ex: Chapa, Lona...)"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-[11px] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => removerCustoExtra(ext.id)}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                            <span className="text-[10px] text-slate-400">R$</span>
                            <input
                              type="number"
                              step="10"
                              value={ext.valor || ''}
                              onChange={(e) => {
                                const nov = [...cargaForm.custosExtras];
                                nov[idx].valor = parseFloat(e.target.value) || 0;
                                setCargaForm({ ...cargaForm, custosExtras: nov });
                              }}
                              placeholder="0.00"
                              className="w-full bg-transparent text-white font-bold text-xs outline-none"
                            />
                          </div>

                          <select
                            value={ext.tipo}
                            onChange={(e) => {
                              const nov = [...cargaForm.custosExtras];
                              nov[idx].tipo = e.target.value as 'repassar_cliente' | 'custo_interno';
                              setCargaForm({ ...cargaForm, custosExtras: nov });
                            }}
                            className="bg-slate-900 border border-slate-700 rounded-lg p-1 text-[10px] font-bold text-slate-200 outline-none"
                          >
                            <option value="repassar_cliente">🔄 Repassar ao Cliente</option>
                            <option value="custo_interno">🏢 Custo Interno Fazenda</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumo Final Calculado na Hora da Carga */}
              {(() => {
                const vBase = parseFloat(cargaForm.valorBaseProdutos) || 0;
                const vFrete = cargaForm.temFrete ? parseFloat(cargaForm.valorFrete) || 0 : 0;
                const freteCli =
                  cargaForm.temFrete && cargaForm.tipoFreteCobranca === 'repassar_cliente'
                    ? vFrete
                    : 0;
                const freteInt =
                  cargaForm.temFrete && cargaForm.tipoFreteCobranca === 'custo_interno'
                    ? vFrete
                    : 0;
                const extCli = cargaForm.custosExtras
                  .filter((e) => e.tipo === 'repassar_cliente')
                  .reduce((a, b) => a + (Number(b.valor) || 0), 0);
                const extInt = cargaForm.custosExtras
                  .filter((e) => e.tipo === 'custo_interno')
                  .reduce((a, b) => a + (Number(b.valor) || 0), 0);

                const totalCobrarCliente = vBase + freteCli + extCli;
                const totalCustosInternos = freteInt + extInt;
                const liquidoVenda = totalCobrarCliente - totalCustosInternos;

                return (
                  <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-3 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-300">
                      <span>Silagem Carregada:</span>
                      <span className="font-mono">R$ {vBase.toFixed(2)}</span>
                    </div>
                    {freteCli > 0 && (
                      <div className="flex justify-between text-amber-300">
                        <span>+ Frete (Repassado):</span>
                        <span className="font-mono">R$ {freteCli.toFixed(2)}</span>
                      </div>
                    )}
                    {extCli > 0 && (
                      <div className="flex justify-between text-sky-300">
                        <span>+ Extras / Chapa (Repassado ao Cliente):</span>
                        <span className="font-mono">R$ {extCli.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-extrabold text-emerald-400 text-xs border-t border-slate-800 pt-1">
                      <span>VALOR FINAL CLIENTE:</span>
                      <span className="font-mono">R$ {totalCobrarCliente.toFixed(2)}</span>
                    </div>
                    {totalCustosInternos > 0 && (
                      <div className="flex justify-between text-rose-300 text-[10px] pt-0.5">
                        <span>(-) Custos Internos (Chapa/Frete Fazenda): R$ {totalCustosInternos.toFixed(2)}</span>
                        <span className="font-bold">Líquido: R$ {liquidoVenda.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalCargaPedido(null)}
                className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarCarregamentoReal}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg"
              >
                <Check className="w-4 h-4" /> Confirmar Carga Final
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
