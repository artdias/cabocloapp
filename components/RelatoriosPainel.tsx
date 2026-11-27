'use client';

import React, { useState, useMemo } from 'react';
import { Contato, ItemEstoque, Pedido, formatarDataBR } from '@/lib/supabase';
import {
  FileSpreadsheet,
  FileText,
  Filter,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';

type TipoRelatorio = 'pedidos' | 'financeiro' | 'estoque' | 'cadastros';

interface ColunaDef {
  id: string;
  label: string;
}

const COLUNAS_POR_TIPO: Record<TipoRelatorio, ColunaDef[]> = {
  pedidos: [
    { id: 'data_compra', label: 'Data Pedido' },
    { id: 'nome_cliente', label: 'Cliente' },
    { id: 'produto', label: 'Produto' },
    { id: 'quantidade', label: 'Quantidade' },
    { id: 'etapa', label: 'Etapa' },
    { id: 'data_carregamento', label: 'Data Carregamento' },
    { id: 'motorista', label: 'Motorista / Terceiro' },
    { id: 'funcionario', label: 'Funcionário' },
    { id: 'valor_frete', label: 'Frete (R$)' },
    { id: 'valor_total', label: 'Valor Total (R$)' },
    { id: 'status_financeiro', label: 'Pagamento' },
    { id: 'observacao', label: 'Observação' },
  ],
  financeiro: [
    { id: 'data_compra', label: 'Data' },
    { id: 'nome_cliente', label: 'Cliente' },
    { id: 'tipo_operacao', label: 'Operação' },
    { id: 'produto', label: 'Produto' },
    { id: 'valor_base', label: 'Valor Produtos (R$)' },
    { id: 'valor_frete', label: 'Frete (R$)' },
    { id: 'custos_extras', label: 'Custos Extras (R$)' },
    { id: 'valor_total', label: 'Total (R$)' },
    { id: 'parcelas', label: 'Parcelas' },
    { id: 'data_vencimento', label: 'Vencimento' },
    { id: 'status_financeiro', label: 'Status' },
  ],
  estoque: [
    { id: 'nome', label: 'Produto' },
    { id: 'quantidade_disponivel', label: 'Qtd. Disponível' },
    { id: 'unidade_medida', label: 'Unidade' },
    { id: 'preco_unitario', label: 'Preço Unit. (R$)' },
    { id: 'valor_estoque', label: 'Valor em Estoque (R$)' },
    { id: 'alerta_minimo', label: 'Alerta Mínimo' },
    { id: 'status_estoque', label: 'Status' },
    { id: 'observacao', label: 'Observação' },
  ],
  cadastros: [
    { id: 'nome', label: 'Nome / Empresa' },
    { id: 'tipo', label: 'Tipo' },
    { id: 'classificacao', label: 'Classificação' },
    { id: 'telefone', label: 'Telefone' },
    { id: 'telefone_secundario', label: '2º Telefone' },
    { id: 'endereco', label: 'Endereço' },
    { id: 'detalhe_extra', label: 'Detalhes Específicos' },
    { id: 'observacao', label: 'Observação' },
  ],
};

const COLUNAS_PADRAO: Record<TipoRelatorio, string[]> = {
  pedidos: ['data_compra', 'nome_cliente', 'produto', 'quantidade', 'etapa', 'data_carregamento', 'valor_total', 'status_financeiro'],
  financeiro: ['data_compra', 'nome_cliente', 'produto', 'valor_base', 'valor_frete', 'valor_total', 'parcelas', 'status_financeiro'],
  estoque: ['nome', 'quantidade_disponivel', 'unidade_medida', 'preco_unitario', 'valor_estoque', 'status_estoque'],
  cadastros: ['nome', 'tipo', 'classificacao', 'telefone', 'endereco', 'detalhe_extra'],
};

interface RelatoriosPainelProps {
  pedidos: Pedido[];
  contatos: Contato[];
  estoque: ItemEstoque[];
}

function escapeCsvCell(val: string | number | null | undefined): string {
  const s = val == null ? '' : String(val);
  if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function escapeHtml(val: string | number | null | undefined): string {
  const s = val == null ? '' : String(val);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatarMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function labelEtapa(etapa?: string | null): string {
  if (etapa === 'carregado') return '4. Carregado';
  if (etapa === 'agendado') return '3. Agendado';
  if (etapa === 'aguardando_cliente') return '2. Aguard. Cliente';
  return '1. Pré-Pedido';
}

function labelStatusFin(status?: string | null): string {
  if (status === 'pago') return 'Pago';
  if (status === 'atrasado') return 'Atrasado';
  return 'Pendente';
}

export default function RelatoriosPainel({
  pedidos,
  contatos,
  estoque,
}: RelatoriosPainelProps) {
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>('pedidos');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [buscaTexto, setBuscaTexto] = useState<string>('');

  // Filtros específicos
  const [filtroEtapa, setFiltroEtapa] = useState<string>('todas');
  const [filtroStatusFin, setFiltroStatusFin] = useState<string>('todos');
  const [filtroOperacao, setFiltroOperacao] = useState<string>('todos');
  const [filtroEstoqueStatus, setFiltroEstoqueStatus] = useState<string>('todos');
  const [filtroTipoContato, setFiltroTipoContato] = useState<string>('todos');
  const [filtroClassificacao, setFiltroClassificacao] = useState<string>('todas');

  const [colunasSelecionadas, setColunasSelecionadas] = useState<Record<TipoRelatorio, string[]>>(
    COLUNAS_PADRAO
  );
  const [mostrarColunas, setMostrarColunas] = useState<boolean>(false);

  const colunasAtivas = useMemo(() => {
    const ids = colunasSelecionadas[tipoRelatorio];
    return COLUNAS_POR_TIPO[tipoRelatorio].filter((c) => ids.includes(c.id));
  }, [colunasSelecionadas, tipoRelatorio]);

  const toggleColuna = (colId: string) => {
    setColunasSelecionadas((prev) => {
      const atuais = prev[tipoRelatorio];
      const existe = atuais.includes(colId);
      if (existe && atuais.length <= 1) return prev; // mantém ao menos 1 coluna
      const novas = existe ? atuais.filter((id) => id !== colId) : [...atuais, colId];
      return { ...prev, [tipoRelatorio]: novas };
    });
  };

  const limparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setBuscaTexto('');
    setFiltroEtapa('todas');
    setFiltroStatusFin('todos');
    setFiltroOperacao('todos');
    setFiltroEstoqueStatus('todos');
    setFiltroTipoContato('todos');
    setFiltroClassificacao('todas');
  };

  // Cálculo dos dados filtrados em formato tabular uniforme
  const { linhas, resumo } = useMemo(() => {
    const q = buscaTexto.trim().toLowerCase();

    if (tipoRelatorio === 'pedidos' || tipoRelatorio === 'financeiro') {
      const filtrados = pedidos.filter((p) => {
        if (tipoRelatorio === 'pedidos' && p.tipo_operacao !== 'venda') return false;
        if (tipoRelatorio === 'financeiro' && filtroOperacao !== 'todos' && p.tipo_operacao !== filtroOperacao) {
          return false;
        }
        if (dataInicio && p.data_compra < dataInicio) return false;
        if (dataFim && p.data_compra > dataFim) return false;
        if (tipoRelatorio === 'pedidos' && filtroEtapa !== 'todos' && filtroEtapa !== 'todas') {
          if ((p.etapa_pedido || 'pre_pedido') !== filtroEtapa) return false;
        }
        if (filtroStatusFin !== 'todos' && p.status_financeiro !== filtroStatusFin) return false;
        if (q) {
          const alvo = `${p.nome_cliente} ${p.produto || ''} ${p.observacao || ''} ${p.nome_funcionario || ''}`.toLowerCase();
          if (!alvo.includes(q)) return false;
        }
        return true;
      });

      let somaTotal = 0;
      let somaPago = 0;
      let somaPendente = 0;
      let somaFrete = 0;

      const rows = filtrados.map((p) => {
        const mot = contatos.find((c) => c.id === p.terceiro_id);
        const func = contatos.find((c) => c.id === p.funcionario_id);
        const valorTotal = Number(p.valor_total || 0);
        const valorFrete = p.tem_frete !== false ? Number(p.valor_frete || 0) : 0;
        const extrasTotal = (p.custos_extras || []).reduce((acc, e) => acc + Number(e.valor || 0), 0);
        const valorBase = p.valor_base_produtos != null ? Number(p.valor_base_produtos) : Math.max(0, valorTotal - valorFrete);

        somaTotal += valorTotal;
        somaFrete += valorFrete;
        if (p.status_financeiro === 'pago') somaPago += valorTotal;
        else somaPendente += valorTotal;

        const parcelasTxt =
          p.qtd_parcelas && p.qtd_parcelas > 1
            ? `${p.parcelas_pagas || 0}/${p.qtd_parcelas}`
            : p.status_financeiro === 'pago'
            ? '1/1'
            : 'À vista';

        return {
          data_compra: formatarDataBR(p.data_compra),
          nome_cliente: p.nome_cliente,
          tipo_operacao: p.tipo_operacao === 'compra' ? 'Compra' : 'Venda',
          produto: p.produto || '-',
          quantidade: p.quantidade || '-',
          etapa: labelEtapa(p.etapa_pedido),
          data_carregamento: formatarDataBR(p.data_carregamento, 'A definir'),
          motorista: mot?.nome || '-',
          funcionario: p.nome_funcionario || func?.nome || '-',
          valor_base: formatarMoeda(valorBase),
          valor_frete: formatarMoeda(valorFrete),
          custos_extras: formatarMoeda(extrasTotal),
          valor_total: formatarMoeda(valorTotal),
          parcelas: parcelasTxt,
          data_vencimento: formatarDataBR(p.data_vencimento_pagamento),
          status_financeiro: labelStatusFin(p.status_financeiro),
          observacao: p.observacao || '',
        } as Record<string, string>;
      });

      return {
        linhas: rows,
        resumo: [
          { label: 'Registros', valor: String(rows.length) },
          { label: 'Valor Total', valor: `R$ ${formatarMoeda(somaTotal)}` },
          { label: 'Pago', valor: `R$ ${formatarMoeda(somaPago)}` },
          { label: 'Em Aberto / Frete', valor: `R$ ${formatarMoeda(somaPendente)} (Frete: R$ ${formatarMoeda(somaFrete)})` },
        ],
      };
    }

    if (tipoRelatorio === 'estoque') {
      const filtrados = estoque.filter((item) => {
        const isEsgotado = item.quantidade_disponivel <= 0;
        const isBaixo = !isEsgotado && item.quantidade_disponivel <= item.alerta_minimo;
        if (filtroEstoqueStatus === 'esgotado' && !isEsgotado) return false;
        if (filtroEstoqueStatus === 'baixo' && !isBaixo) return false;
        if (filtroEstoqueStatus === 'disponivel' && (isEsgotado || isBaixo)) return false;
        if (q) {
          const alvo = `${item.nome} ${item.unidade_medida} ${item.observacao || ''}`.toLowerCase();
          if (!alvo.includes(q)) return false;
        }
        return true;
      });

      let valorTotalEst = 0;
      let qtdBaixos = 0;

      const rows = filtrados.map((item) => {
        const valorItem = item.quantidade_disponivel * item.preco_unitario;
        valorTotalEst += valorItem;
        const isEsgotado = item.quantidade_disponivel <= 0;
        const isBaixo = !isEsgotado && item.quantidade_disponivel <= item.alerta_minimo;
        if (isEsgotado || isBaixo) qtdBaixos += 1;

        return {
          nome: item.nome,
          quantidade_disponivel: String(item.quantidade_disponivel),
          unidade_medida: item.unidade_medida,
          preco_unitario: formatarMoeda(item.preco_unitario),
          valor_estoque: formatarMoeda(valorItem),
          alerta_minimo: String(item.alerta_minimo),
          status_estoque: isEsgotado ? 'Esgotado' : isBaixo ? 'Estoque Baixo' : 'Disponível',
          observacao: item.observacao || '',
        } as Record<string, string>;
      });

      return {
        linhas: rows,
        resumo: [
          { label: 'Produtos', valor: String(rows.length) },
          { label: 'Valor Total em Estoque', valor: `R$ ${formatarMoeda(valorTotalEst)}` },
          { label: 'Em Alerta / Esgotado', valor: String(qtdBaixos) },
        ],
      };
    }

    // cadastros
    const filtrados = contatos.filter((c) => {
      if (filtroTipoContato !== 'todos' && c.tipo !== filtroTipoContato) return false;
      if (filtroClassificacao !== 'todas' && c.status_crm !== filtroClassificacao) return false;
      if (q) {
        const alvo = `${c.nome} ${c.telefone || ''} ${c.endereco_fazenda || ''} ${c.razao_social || ''} ${c.cnpj || ''} ${c.produtos_oferecidos || ''} ${c.local_trabalho || ''} ${c.observacao || ''}`.toLowerCase();
        if (!alvo.includes(q)) return false;
      }
      return true;
    });

    const rows = filtrados.map((c) => {
      let detalhe = '-';
      if (c.tipo === 'cliente') {
        const partes: string[] = [];
        if (c.area_fazenda) partes.push(`Área: ${c.area_fazenda}`);
        if (c.quantidade_animais) partes.push(`Animais: ${c.quantidade_animais}`);
        detalhe = partes.join(' | ') || '-';
      } else if (c.tipo === 'terceiro') {
        detalhe = `${c.tipo_veiculo || 'Caminhão'} (${c.capacidade_carga_toneladas || 10}t)`;
      } else if (c.tipo === 'funcionario') {
        const sal = c.salario_valor != null ? `R$ ${formatarMoeda(c.salario_valor)} (${c.salario_tipo || 'mensal'})` : '';
        const vinc = c.vinculo_funcionario === 'temporario' ? 'Temporário' : 'Fixo';
        detalhe = [sal, vinc, c.local_trabalho].filter(Boolean).join(' | ') || '-';
      } else if (c.tipo === 'fornecedor') {
        detalhe = [c.razao_social, c.cnpj ? `CNPJ: ${c.cnpj}` : '', c.produtos_oferecidos].filter(Boolean).join(' | ') || '-';
      }

      return {
        nome: c.nome,
        tipo: c.tipo === 'terceiro' ? 'Terceiro / Freteiro' : c.tipo,
        classificacao:
          c.tipo === 'cliente'
            ? c.status_crm === 'possibilidade'
              ? 'Possibilidade (Novo)'
              : 'Ativo (Já Cliente)'
            : '-',
        telefone: c.telefone || '-',
        telefone_secundario: c.telefone_secundario || '-',
        endereco: c.endereco_fazenda || c.local_trabalho || '-',
        detalhe_extra: detalhe,
        observacao: c.observacao || '',
      } as Record<string, string>;
    });

    return {
      linhas: rows,
      resumo: [
        { label: 'Total Cadastros', valor: String(rows.length) },
        { label: 'Clientes', valor: String(filtrados.filter((c) => c.tipo === 'cliente').length) },
        { label: 'Freteiros / Terceiros', valor: String(filtrados.filter((c) => c.tipo === 'terceiro').length) },
        { label: 'Equipe / Fornecedores', valor: `${filtrados.filter((c) => c.tipo === 'funcionario').length} / ${filtrados.filter((c) => c.tipo === 'fornecedor').length}` },
      ],
    };
  }, [
    tipoRelatorio,
    pedidos,
    contatos,
    estoque,
    dataInicio,
    dataFim,
    buscaTexto,
    filtroEtapa,
    filtroStatusFin,
    filtroOperacao,
    filtroEstoqueStatus,
    filtroTipoContato,
    filtroClassificacao,
  ]);

  const exportarCSV = () => {
    const cabecalho = colunasAtivas.map((c) => escapeCsvCell(c.label)).join(';');
    const corpo = linhas.map((row) =>
      colunasAtivas.map((c) => escapeCsvCell(row[c.id])).join(';')
    );
    const csvContent = '\uFEFF' + [cabecalho, ...corpo].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dataHoje = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `caboclo-relatorio-${tipoRelatorio}-${dataHoje}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportarPDF = () => {
    const titulos: Record<TipoRelatorio, string> = {
      pedidos: 'Relatório de Pedidos & Vendas',
      financeiro: 'Relatório Financeiro & Recebimentos',
      estoque: 'Relatório de Estoque Atual',
      cadastros: 'Relatório de Cadastros',
    };
    const dataGeracao = new Date().toLocaleString('pt-BR');

    const filtrosUsados: string[] = [];
    if (dataInicio) filtrosUsados.push(`De: ${formatarDataBR(dataInicio)}`);
    if (dataFim) filtrosUsados.push(`Até: ${formatarDataBR(dataFim)}`);
    if (buscaTexto.trim()) filtrosUsados.push(`Busca: "${buscaTexto.trim()}"`);
    if (tipoRelatorio === 'pedidos' && filtroEtapa !== 'todas') filtrosUsados.push(`Etapa: ${filtroEtapa}`);
    if ((tipoRelatorio === 'pedidos' || tipoRelatorio === 'financeiro') && filtroStatusFin !== 'todos') {
      filtrosUsados.push(`Pagamento: ${filtroStatusFin}`);
    }
    if (tipoRelatorio === 'estoque' && filtroEstoqueStatus !== 'todos') {
      filtrosUsados.push(`Status Estoque: ${filtroEstoqueStatus}`);
    }
    if (tipoRelatorio === 'cadastros' && filtroTipoContato !== 'todos') {
      filtrosUsados.push(`Tipo: ${filtroTipoContato}`);
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(titulos[tipoRelatorio])} - Caboclo Agro CRM</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 20px; font-size: 11px; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 14px; }
    .header h1 { margin: 0; font-size: 18px; color: #064e3b; }
    .header p { margin: 2px 0 0; font-size: 11px; color: #475569; }
    .meta { text-align: right; font-size: 10px; color: #475569; }
    .filtros { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin-bottom: 12px; font-size: 10px; color: #334155; }
    .resumo { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; min-width: 120px; background: #f8fafc; }
    .card-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
    .card-val { font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 7px; text-align: left; vertical-align: top; }
    th { background: #0f172a; color: #ffffff; font-size: 10px; text-transform: uppercase; }
    tr:nth-child(even) td { background: #f8fafc; }
    @media print {
      body { margin: 10mm; }
      @page { size: landscape; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Caboclo Agro CRM</h1>
      <p>${escapeHtml(titulos[tipoRelatorio])}</p>
    </div>
    <div class="meta">
      <div>Gerado em: ${escapeHtml(dataGeracao)}</div>
      <div>Total de registros: ${linhas.length}</div>
    </div>
  </div>
  ${filtrosUsados.length > 0 ? `<div class="filtros"><strong>Filtros aplicados:</strong> ${escapeHtml(filtrosUsados.join(' • '))}</div>` : ''}
  <div class="resumo">
    ${resumo
      .map(
        (r) =>
          `<div class="card"><div class="card-label">${escapeHtml(r.label)}</div><div class="card-val">${escapeHtml(r.valor)}</div></div>`
      )
      .join('')}
  </div>
  <table>
    <thead>
      <tr>${colunasAtivas.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${
        linhas.length === 0
          ? `<tr><td colspan="${colunasAtivas.length}" style="text-align:center;color:#64748b;padding:16px;">Nenhum registro encontrado para os filtros selecionados.</td></tr>`
          : linhas
              .map(
                (row) =>
                  `<tr>${colunasAtivas.map((c) => `<td>${escapeHtml(row[c.id] || '-')}</td>`).join('')}</tr>`
              )
              .join('')
      }
    </tbody>
  </table>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 250);
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho e Seletor de Tipo de Relatório */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4 shrink-0" /> Gerador de Relatórios Personalizados
            </h3>
            <p className="text-[11px] text-slate-400">
              Filtre, personalize as colunas e exporte em CSV (Excel) ou PDF
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={exportarCSV}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar CSV
            </button>
            <button
              type="button"
              onClick={exportarPDF}
              className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all active:scale-95"
            >
              <FileText className="w-3.5 h-3.5" /> Exportar PDF
            </button>
          </div>
        </div>

        {/* Tipo de Relatório */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-bold">
          {[
            { id: 'pedidos', label: '📦 Pedidos' },
            { id: 'financeiro', label: '💰 Financeiro' },
            { id: 'estoque', label: '🏭 Estoque' },
            { id: 'cadastros', label: '👥 Cadastros' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTipoRelatorio(item.id as TipoRelatorio)}
              className={`py-2 px-2 rounded-xl border text-center transition-all ${
                tipoRelatorio === item.id
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros Personalizados */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-sky-400" /> Filtros do Relatório
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMostrarColunas((v) => !v)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3 h-3 text-amber-400" /> Colunas ({colunasAtivas.length})
            </button>
            <button
              type="button"
              onClick={limparFiltros}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Limpar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="sm:col-span-2">
            <label className="text-[10px] text-slate-400 block mb-1">Buscar por texto (nome, produto, endereço, obs...)</label>
            <input
              type="text"
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              placeholder="Digite para filtrar..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg p-2 text-white outline-none"
            />
          </div>

          {(tipoRelatorio === 'pedidos' || tipoRelatorio === 'financeiro') && (
            <>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Data Inicial</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Data Final</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                />
              </div>

              {tipoRelatorio === 'pedidos' && (
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Etapa do Pedido</label>
                  <select
                    value={filtroEtapa}
                    onChange={(e) => setFiltroEtapa(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                  >
                    <option value="todas">Todas as Etapas</option>
                    <option value="pre_pedido">1. Pré-Pedido</option>
                    <option value="aguardando_cliente">2. Aguardando Cliente</option>
                    <option value="agendado">3. Agendado</option>
                    <option value="carregado">4. Carregado</option>
                  </select>
                </div>
              )}

              {tipoRelatorio === 'financeiro' && (
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Tipo de Operação</label>
                  <select
                    value={filtroOperacao}
                    onChange={(e) => setFiltroOperacao(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                  >
                    <option value="todos">Todas (Vendas e Compras)</option>
                    <option value="venda">Somente Vendas</option>
                    <option value="compra">Somente Compras</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Status de Pagamento</label>
                <select
                  value={filtroStatusFin}
                  onChange={(e) => setFiltroStatusFin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                >
                  <option value="todos">Todos</option>
                  <option value="pago">✅ Pago</option>
                  <option value="pendente">⏳ Pendente</option>
                  <option value="atrasado">🚨 Atrasado</option>
                </select>
              </div>
            </>
          )}

          {tipoRelatorio === 'estoque' && (
            <div className="sm:col-span-2">
              <label className="text-[10px] text-slate-400 block mb-1">Status do Estoque</label>
              <select
                value={filtroEstoqueStatus}
                onChange={(e) => setFiltroEstoqueStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
              >
                <option value="todos">Todos os Produtos</option>
                <option value="disponivel">✅ Disponível</option>
                <option value="baixo">⚠️ Estoque Baixo</option>
                <option value="esgotado">❌ Esgotado</option>
              </select>
            </div>
          )}

          {tipoRelatorio === 'cadastros' && (
            <>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Tipo de Cadastro</label>
                <select
                  value={filtroTipoContato}
                  onChange={(e) => setFiltroTipoContato(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                >
                  <option value="todos">Todos</option>
                  <option value="cliente">👤 Clientes</option>
                  <option value="terceiro">🚚 Terceiros / Freteiros</option>
                  <option value="fornecedor">🏢 Fornecedores</option>
                  <option value="funcionario">👨‍🌾 Funcionários</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Classificação CRM</label>
                <select
                  value={filtroClassificacao}
                  onChange={(e) => setFiltroClassificacao(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                >
                  <option value="todas">Todas</option>
                  <option value="possibilidade">❓ Possibilidade (Novo Cliente)</option>
                  <option value="cliente_ativo">✅ Ativo (Já Cliente)</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Personalização de Colunas */}
        {mostrarColunas && (
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300">Colunas exibidas e exportadas:</span>
              <button
                type="button"
                onClick={() =>
                  setColunasSelecionadas((prev) => ({
                    ...prev,
                    [tipoRelatorio]: COLUNAS_POR_TIPO[tipoRelatorio].map((c) => c.id),
                  }))
                }
                className="text-[10px] text-sky-400 hover:underline font-semibold"
              >
                Selecionar todas
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COLUNAS_POR_TIPO[tipoRelatorio].map((col) => {
                const marcado = colunasSelecionadas[tipoRelatorio].includes(col.id);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => toggleColuna(col.id)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                      marcado
                        ? 'bg-sky-600/30 text-sky-200 border-sky-500/60'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {marcado ? '✓ ' : ''}
                    {col.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {resumo.map((r) => (
          <div key={r.label} className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold truncate">
              {r.label}
            </span>
            <span className="text-sm font-extrabold text-white block mt-0.5 break-words">
              {r.valor}
            </span>
          </div>
        ))}
      </div>

      {/* Pré-visualização da Tabela */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-300">
                {colunasAtivas.map((col) => (
                  <th key={col.id} className="py-2.5 px-3 font-bold uppercase whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {linhas.length === 0 ? (
                <tr>
                  <td colSpan={colunasAtivas.length} className="py-8 px-4 text-center text-slate-500">
                    Nenhum registro encontrado para os filtros aplicados.
                  </td>
                </tr>
              ) : (
                linhas.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    {colunasAtivas.map((col) => (
                      <td key={col.id} className="py-2 px-3 text-slate-200 whitespace-nowrap">
                        {row[col.id] || '-'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
