import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://fqadknauvqulhqwatkol.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_urwkRI7uqpHSupA1B8ayDg_Shf5bq3x';

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseUrl =
  Boolean(envUrl) && !envUrl.includes('sua-url-supabase') ? envUrl : DEFAULT_SUPABASE_URL;
const supabaseAnonKey =
  Boolean(envKey) && !envKey.includes('sua-chave-anonima') ? envKey : DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  !supabaseUrl.includes('placeholder.supabase.co') &&
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== 'placeholder-key';

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key'
);

export type TipoEntidade = 'cliente' | 'funcionario' | 'terceiro' | 'fornecedor';
export type StatusCRM = 'possibilidade' | 'cliente_ativo' | 'inativo' | 'parceiro';
export type StatusFinanceiro = 'pendente' | 'pago' | 'atrasado';
export type EtapaPedido = 'pre_pedido' | 'aguardando_cliente' | 'agendado' | 'carregado';

export interface CustoExtraPedido {
  id: string;
  descricao: string; // Ex: 'Chapa / Ajudante', 'Lona', 'Pedágio'
  valor: number;
  tipo: 'repassar_cliente' | 'custo_interno';
}

export interface Contato {
  id?: string;
  tipo: TipoEntidade;
  status_crm: StatusCRM;
  nome: string;
  telefone?: string | null;
  telefone_secundario?: string | null;
  cidade?: string | null;
  fazenda?: string | null;
  endereco_fazenda?: string | null;
  area_fazenda?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  quantidade_animais?: number | string | null;
  capacidade_carga_toneladas?: number | null; // Para Terceiros/Transportadores
  tipo_veiculo?: string | null; // Ex: Toco, Truck, Carreta
  salario_valor?: number | null; // Para Funcionários
  salario_tipo?: 'diaria' | 'semanal' | 'quinzenal' | 'mensal' | null;
  vinculo_funcionario?: 'fixo' | 'temporario' | null;
  local_trabalho?: string | null;
  razao_social?: string | null; // Para Fornecedores
  cnpj?: string | null;
  produtos_oferecidos?: string | null;
  observacao?: string | null;
  created_at?: string;
}

export interface PivoIrrigacao {
  id: string;
  nome: string; // Ex: 'Pivô 01', 'Pivô 02 - Baixada'
  area_hectares?: string | null; // Ex: '45 ha'
  cultura_atual?: string | null; // Ex: 'Milho Safra', 'Sorgo'
  observacao?: string | null;
}

export interface ItemEstoque {
  id: string;
  nome: string;
  quantidade_disponivel: number;
  unidade_medida: string; // Ex: 'toneladas', 'sacos', 'kg', 'unidade'
  preco_unitario: number; // Ex: 450.00
  alerta_minimo: number; // Ex: 20
  pivo_id?: string | null;
  pivo_nome?: string | null;
  observacao?: string | null;
}

export interface ItemVendaPedido {
  estoque_id: string;
  nome_produto: string;
  quantidade: number;
  unidade_medida: string;
  preco_unitario: number;
  subtotal: number;
}

export interface Pedido {
  id?: string;
  contato_id?: string | null;
  terceiro_id?: string | null; // Transportador alocado
  nome_cliente: string;
  produto: string | null;
  quantidade: string | null;
  quantidade_toneladas_num?: number | null;
  itens_venda?: ItemVendaPedido[] | null;
  valor_total?: number | null;
  data_compra: string;
  data_previsao_fim_estoque?: string | null;
  data_vencimento_pagamento?: string | null;
  qtd_parcelas?: number | null;
  parcelas_pagas?: number | null;
  valor_adiantamento?: number | null;
  dia_pagamento_parcelas?: string | null;
  // Fluxo Operacional: Pré-Pedido -> Frete -> Cliente -> Agendamento/Funcionário -> Carregamento Real
  etapa_pedido?: EtapaPedido | null;
  tem_frete?: boolean | null;
  valor_frete?: number | null;
  tipo_frete_cobranca?: 'repassar_cliente' | 'custo_interno' | null;
  data_carregamento?: string | null;
  data_entrega?: string | null;
  funcionario_id?: string | null;
  nome_funcionario?: string | null;
  toneladas_real?: number | null;
  sacos_real?: number | null;
  valor_base_produtos?: number | null;
  custos_extras?: CustoExtraPedido[] | null;
  estoque_baixado?: boolean | null;
  foto_caminhao_carregado?: string | null;
  data_confirmacao_carga?: string | null;
  status_financeiro: StatusFinanceiro;
  tipo_operacao: 'venda' | 'compra';
  observacao?: string | null;
  created_at?: string;
}

export interface Atendimento {
  id?: string;
  contato_id?: string | null;
  tipo_entidade?: TipoEntidade | null;
  nome_cliente: string | null;
  telefone?: string | null;
  produto: string | null;
  quantidade: string | null;
  endereco_fazenda?: string | null;
  quantidade_animais?: string | null;
  capacidade_carga_toneladas?: number | null;
  tipo_veiculo?: string | null;
  valor_total?: number | null;
  data_proximo_contato: string | null;
  data_previsao_fim_estoque?: string | null;
  observacao: string | null;
  texto_transcrito?: string | null;
  created_at?: string;
}

export const DEMO_ID_MAP: Record<string, string> = {
  'demo-1': '11111111-1111-4111-8111-111111111101',
  'demo-2': '11111111-1111-4111-8111-111111111102',
  'demo-terc-1': '11111111-1111-4111-8111-111111111103',
  'demo-terc-2': '11111111-1111-4111-8111-111111111104',
  'demo-terc-3': '11111111-1111-4111-8111-111111111105',
  'demo-ped-1': '22222222-2222-4222-8222-222222222201',
  'demo-ped-2': '22222222-2222-4222-8222-222222222202',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(val?: string | null): boolean {
  if (!val) return false;
  return UUID_REGEX.test(val.trim());
}

export function gerarUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function normalizarId(id?: string | null): string {
  if (!id) return gerarUuid();
  if (DEMO_ID_MAP[id]) return DEMO_ID_MAP[id];
  if (isValidUuid(id)) return id;
  return gerarUuid();
}

const PEDIDO_META_MARKER = '\n__CABOCLO_META__:';

export async function salvarContatoNoBanco(contato: Contato): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const entityId = normalizarId(contato.id);
  const fazendaMeta = JSON.stringify({
    entity_id: entityId,
    deleted: false,
    updated_at: new Date().toISOString(),
    endereco_fazenda: contato.endereco_fazenda || null,
    area_fazenda: contato.area_fazenda || null,
    telefone_secundario: contato.telefone_secundario || null,
    latitude: contato.latitude ?? null,
    longitude: contato.longitude ?? null,
    quantidade_animais: contato.quantidade_animais || null,
    capacidade_carga_toneladas: contato.capacidade_carga_toneladas ?? null,
    tipo_veiculo: contato.tipo_veiculo || null,
    salario_valor: contato.salario_valor ?? null,
    salario_tipo: contato.salario_tipo || null,
    vinculo_funcionario: contato.vinculo_funcionario || null,
    local_trabalho: contato.local_trabalho || null,
    razao_social: contato.razao_social || null,
    cnpj: contato.cnpj || null,
    produtos_oferecidos: contato.produtos_oferecidos || null,
  });

  const payload = {
    tipo: contato.tipo || 'cliente',
    status_crm: contato.status_crm || 'cliente_ativo',
    nome: contato.nome.trim(),
    telefone: contato.telefone || null,
    cidade: contato.cidade || null,
    fazenda: fazendaMeta,
    observacao: contato.observacao || null,
  };

  const { error } = await supabase.from('contatos').insert([payload]);
  if (error) {
    console.warn('Erro ao salvar contato no Supabase:', error.message);
    return false;
  }
  return true;
}

export async function excluirContatoNoBanco(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const entityId = DEMO_ID_MAP[id] || id;
  const fazendaMeta = JSON.stringify({
    entity_id: entityId,
    deleted: true,
    updated_at: new Date().toISOString(),
  });

  const { error } = await supabase.from('contatos').insert([
    {
      tipo: 'cliente',
      status_crm: 'inativo',
      nome: '__DELETED__',
      fazenda: fazendaMeta,
    },
  ]);

  if (error) {
    console.warn('Erro ao excluir contato no Supabase:', error.message);
    return false;
  }
  return true;
}

export function parseContatosDoBanco(rows: any[]): Contato[] {
  const sorted = [...rows].sort((a, b) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tA - tB;
  });

  const mapa = new Map<string, Contato>();

  for (const row of sorted) {
    let extra: any = {};
    if (row.fazenda && typeof row.fazenda === 'string') {
      if (row.fazenda.trim().startsWith('{')) {
        try {
          extra = JSON.parse(row.fazenda);
        } catch {
          extra = { endereco_fazenda: row.fazenda };
        }
      } else {
        extra = { endereco_fazenda: row.fazenda };
      }
    }

    const entityId: string = extra.entity_id || row.id;
    if (!entityId) continue;

    if (extra.deleted === true) {
      mapa.delete(entityId);
      continue;
    }

    const nomeStr = typeof row.nome === 'string' ? row.nome.trim() : '';
    if (!nomeStr || nomeStr.startsWith('__') || nomeStr.toLowerCase() === 'teste tese') {
      continue;
    }

    const anterior = mapa.get(entityId);
    const defaultLat =
      entityId === '11111111-1111-4111-8111-111111111101'
        ? -20.4285
        : entityId === '11111111-1111-4111-8111-111111111102'
        ? -19.3911
        : null;
    const defaultLng =
      entityId === '11111111-1111-4111-8111-111111111101'
        ? -40.328
        : entityId === '11111111-1111-4111-8111-111111111102'
        ? -40.0722
        : null;

    mapa.set(entityId, {
      id: entityId,
      tipo: row.tipo || 'cliente',
      status_crm: row.status_crm || 'cliente_ativo',
      nome: nomeStr,
      telefone: row.telefone ?? null,
      telefone_secundario: row.telefone_secundario ?? extra.telefone_secundario ?? null,
      cidade: row.cidade ?? extra.cidade ?? null,
      fazenda: null,
      endereco_fazenda: row.endereco_fazenda ?? extra.endereco_fazenda ?? null,
      area_fazenda: row.area_fazenda ?? extra.area_fazenda ?? null,
      latitude:
        row.latitude != null
          ? Number(row.latitude)
          : extra.latitude != null
          ? Number(extra.latitude)
          : anterior?.latitude ?? defaultLat,
      longitude:
        row.longitude != null
          ? Number(row.longitude)
          : extra.longitude != null
          ? Number(extra.longitude)
          : anterior?.longitude ?? defaultLng,
      quantidade_animais: row.quantidade_animais ?? extra.quantidade_animais ?? null,
      capacidade_carga_toneladas:
        row.capacidade_carga_toneladas ?? extra.capacidade_carga_toneladas ?? null,
      tipo_veiculo: row.tipo_veiculo ?? extra.tipo_veiculo ?? null,
      salario_valor:
        row.salario_valor != null
          ? Number(row.salario_valor)
          : extra.salario_valor != null
          ? Number(extra.salario_valor)
          : null,
      salario_tipo: row.salario_tipo ?? extra.salario_tipo ?? null,
      vinculo_funcionario: row.vinculo_funcionario ?? extra.vinculo_funcionario ?? null,
      local_trabalho: row.local_trabalho ?? extra.local_trabalho ?? null,
      razao_social: row.razao_social ?? extra.razao_social ?? null,
      cnpj: row.cnpj ?? extra.cnpj ?? null,
      produtos_oferecidos: row.produtos_oferecidos ?? extra.produtos_oferecidos ?? null,
      observacao: row.observacao ?? null,
      created_at: anterior?.created_at || row.created_at || new Date().toISOString(),
    });
  }

  return Array.from(mapa.values()).sort((a, b) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tB - tA;
  });
}

export async function salvarPedidoNoBanco(pedido: Pedido): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const entityId = normalizarId(pedido.id);
  const cleanObs = (pedido.observacao || '').split(PEDIDO_META_MARKER)[0].trim();

  const meta = {
    entity_id: entityId,
    deleted: false,
    updated_at: new Date().toISOString(),
    contato_id: pedido.contato_id ? DEMO_ID_MAP[pedido.contato_id] || pedido.contato_id : null,
    terceiro_id: pedido.terceiro_id ? DEMO_ID_MAP[pedido.terceiro_id] || pedido.terceiro_id : null,
    quantidade_toneladas_num: pedido.quantidade_toneladas_num ?? null,
    itens_venda: pedido.itens_venda || null,
    data_vencimento_pagamento: pedido.data_vencimento_pagamento || null,
    qtd_parcelas: pedido.qtd_parcelas ?? null,
    parcelas_pagas: pedido.parcelas_pagas ?? null,
    valor_adiantamento: pedido.valor_adiantamento ?? null,
    dia_pagamento_parcelas: pedido.dia_pagamento_parcelas || null,
    etapa_pedido: pedido.etapa_pedido || 'pre_pedido',
    tem_frete: pedido.tem_frete ?? true,
    valor_frete: pedido.valor_frete ?? null,
    tipo_frete_cobranca: pedido.tipo_frete_cobranca || 'repassar_cliente',
    data_carregamento: pedido.data_carregamento || null,
    data_entrega: pedido.data_entrega || null,
    funcionario_id: pedido.funcionario_id || null,
    nome_funcionario: pedido.nome_funcionario || null,
    toneladas_real: pedido.toneladas_real ?? null,
    sacos_real: pedido.sacos_real ?? null,
    valor_base_produtos: pedido.valor_base_produtos ?? null,
    custos_extras: pedido.custos_extras || null,
    estoque_baixado: pedido.estoque_baixado ?? false,
    foto_caminhao_carregado: pedido.foto_caminhao_carregado || null,
    data_confirmacao_carga: pedido.data_confirmacao_carga || null,
  };

  const payload = {
    contato_id: null,
    nome_cliente: pedido.nome_cliente.trim(),
    produto: pedido.produto || 'Silagem',
    quantidade: pedido.quantidade || '1',
    valor_total: pedido.valor_total ?? 0,
    data_compra: pedido.data_compra || new Date().toISOString().split('T')[0],
    data_previsao_fim_estoque: pedido.data_previsao_fim_estoque || null,
    status_financeiro: pedido.status_financeiro || 'pendente',
    tipo_operacao: pedido.tipo_operacao || 'venda',
    observacao: `${cleanObs}${PEDIDO_META_MARKER}${JSON.stringify(meta)}`,
  };

  const { error } = await supabase.from('pedidos').insert([payload]);
  if (error) {
    console.warn('Erro ao salvar pedido no Supabase:', error.message);
    return false;
  }
  return true;
}

export async function excluirPedidoNoBanco(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const entityId = DEMO_ID_MAP[id] || id;
  const meta = {
    entity_id: entityId,
    deleted: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('pedidos').insert([
    {
      nome_cliente: '__DELETED__',
      data_compra: '2026-01-01',
      observacao: `${PEDIDO_META_MARKER}${JSON.stringify(meta)}`,
    },
  ]);

  if (error) {
    console.warn('Erro ao excluir pedido no Supabase:', error.message);
    return false;
  }
  return true;
}

export function parsePedidosDoBanco(rows: any[]): Pedido[] {
  const sorted = [...rows].sort((a, b) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tA - tB;
  });

  const mapa = new Map<string, Pedido>();

  for (const row of sorted) {
    const rawObs = typeof row.observacao === 'string' ? row.observacao : '';
    let cleanObs: string | null = rawObs || null;
    let meta: any = {};

    if (rawObs.includes(PEDIDO_META_MARKER)) {
      const idx = rawObs.indexOf(PEDIDO_META_MARKER);
      cleanObs = rawObs.slice(0, idx).trim() || null;
      const metaStr = rawObs.slice(idx + PEDIDO_META_MARKER.length);
      try {
        meta = JSON.parse(metaStr);
      } catch {}
    }

    const entityId: string = meta.entity_id || row.id;
    if (!entityId) continue;

    if (meta.deleted === true) {
      mapa.delete(entityId);
      continue;
    }

    const nomeCliente = typeof row.nome_cliente === 'string' ? row.nome_cliente.trim() : '';
    if (!nomeCliente || nomeCliente.startsWith('__') || nomeCliente.toLowerCase() === 'teste tese') {
      continue;
    }

    const anterior = mapa.get(entityId);
    mapa.set(entityId, {
      id: entityId,
      contato_id: meta.contato_id ?? row.contato_id ?? null,
      terceiro_id: meta.terceiro_id ?? row.terceiro_id ?? null,
      nome_cliente: nomeCliente,
      produto: row.produto || null,
      quantidade: row.quantidade || null,
      quantidade_toneladas_num: meta.quantidade_toneladas_num ?? row.quantidade_toneladas_num ?? 10,
      itens_venda: meta.itens_venda ?? row.itens_venda ?? null,
      valor_total: row.valor_total != null ? Number(row.valor_total) : 0,
      data_compra: row.data_compra || new Date().toISOString().split('T')[0],
      data_previsao_fim_estoque: row.data_previsao_fim_estoque || null,
      data_vencimento_pagamento:
        meta.data_vencimento_pagamento ?? anterior?.data_vencimento_pagamento ?? null,
      qtd_parcelas: meta.qtd_parcelas ?? anterior?.qtd_parcelas ?? null,
      parcelas_pagas:
        meta.parcelas_pagas != null ? Number(meta.parcelas_pagas) : anterior?.parcelas_pagas ?? 0,
      valor_adiantamento:
        meta.valor_adiantamento != null
          ? Number(meta.valor_adiantamento)
          : anterior?.valor_adiantamento ?? null,
      dia_pagamento_parcelas:
        meta.dia_pagamento_parcelas ?? anterior?.dia_pagamento_parcelas ?? null,
      etapa_pedido:
        meta.etapa_pedido ??
        anterior?.etapa_pedido ??
        (entityId === '22222222-2222-4222-8222-222222222201' ? 'carregado' : 'pre_pedido'),
      tem_frete: meta.tem_frete ?? anterior?.tem_frete ?? true,
      valor_frete:
        meta.valor_frete != null ? Number(meta.valor_frete) : anterior?.valor_frete ?? null,
      tipo_frete_cobranca:
        meta.tipo_frete_cobranca ?? anterior?.tipo_frete_cobranca ?? 'repassar_cliente',
      data_carregamento: meta.data_carregamento ?? anterior?.data_carregamento ?? null,
      data_entrega: meta.data_entrega ?? anterior?.data_entrega ?? null,
      funcionario_id: meta.funcionario_id ?? anterior?.funcionario_id ?? null,
      nome_funcionario: meta.nome_funcionario ?? anterior?.nome_funcionario ?? null,
      toneladas_real:
        meta.toneladas_real != null ? Number(meta.toneladas_real) : anterior?.toneladas_real ?? null,
      sacos_real:
        meta.sacos_real != null ? Number(meta.sacos_real) : anterior?.sacos_real ?? null,
      valor_base_produtos:
        meta.valor_base_produtos != null
          ? Number(meta.valor_base_produtos)
          : anterior?.valor_base_produtos ?? null,
      custos_extras: meta.custos_extras ?? anterior?.custos_extras ?? null,
      estoque_baixado: meta.estoque_baixado ?? anterior?.estoque_baixado ?? false,
      foto_caminhao_carregado:
        meta.foto_caminhao_carregado ?? anterior?.foto_caminhao_carregado ?? null,
      data_confirmacao_carga:
        meta.data_confirmacao_carga ?? anterior?.data_confirmacao_carga ?? null,
      status_financeiro: row.status_financeiro || 'pendente',
      tipo_operacao: row.tipo_operacao || 'venda',
      observacao: cleanObs,
      created_at: anterior?.created_at || row.created_at || new Date().toISOString(),
    });
  }

  return Array.from(mapa.values()).sort((a, b) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tB - tA;
  });
}

export async function salvarEstoqueNoBanco(itens: ItemEstoque[]): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('atendimentos').insert([
    {
      nome_cliente: '__ESTOQUE_SYNC__',
      texto_transcrito: JSON.stringify(itens),
    },
  ]);
  if (error) {
    console.warn('Erro ao salvar estoque no Supabase:', error.message);
    return false;
  }
  return true;
}

export async function carregarEstoqueDoBanco(): Promise<ItemEstoque[] | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('atendimentos')
    .select('texto_transcrito, created_at')
    .eq('nome_cliente', '__ESTOQUE_SYNC__')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0 || !data[0].texto_transcrito) {
    return null;
  }

  try {
    const parsed = JSON.parse(data[0].texto_transcrito);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {}
  return null;
}

export interface LembretesSyncState {
  adiados: Record<string, string>;
  excluidos: string[];
  respondidos: any[];
}

export async function salvarLembretesEstadoNoBanco(state: LembretesSyncState): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('atendimentos').insert([
    {
      nome_cliente: '__LEMBRETES_SYNC__',
      texto_transcrito: JSON.stringify(state),
    },
  ]);
  if (error) {
    console.warn('Erro ao salvar lembretes no Supabase:', error.message);
    return false;
  }
  return true;
}

export async function carregarLembretesEstadoDoBanco(): Promise<LembretesSyncState | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('atendimentos')
    .select('texto_transcrito, created_at')
    .eq('nome_cliente', '__LEMBRETES_SYNC__')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0 || !data[0].texto_transcrito) {
    return null;
  }

  try {
    const parsed = JSON.parse(data[0].texto_transcrito);
    if (parsed && typeof parsed === 'object') {
      return {
        adiados: parsed.adiados && typeof parsed.adiados === 'object' ? parsed.adiados : {},
        excluidos: Array.isArray(parsed.excluidos) ? parsed.excluidos : [],
        respondidos: Array.isArray(parsed.respondidos) ? parsed.respondidos : [],
      };
    }
  } catch {}
  return null;
}

export async function salvarPivosNoBanco(pivos: PivoIrrigacao[]): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('atendimentos').insert([
    {
      nome_cliente: '__PIVOS_SYNC__',
      texto_transcrito: JSON.stringify(pivos),
    },
  ]);
  if (error) {
    console.warn('Erro ao salvar pivôs no Supabase:', error.message);
    return false;
  }
  return true;
}

export async function carregarPivosDoBanco(): Promise<PivoIrrigacao[] | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('atendimentos')
    .select('texto_transcrito, created_at')
    .eq('nome_cliente', '__PIVOS_SYNC__')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0 || !data[0].texto_transcrito) {
    return null;
  }

  try {
    const parsed = JSON.parse(data[0].texto_transcrito);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {}
  return null;
}

export function comprimirFotoCaminhao(file: File, maxWidth = 800, quality = 0.65): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Falha ao ler arquivo de imagem'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Erro ao processar foto'));
    reader.readAsDataURL(file);
  });
}
