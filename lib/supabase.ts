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

export interface Contato {
  id?: string;
  tipo: TipoEntidade;
  status_crm: StatusCRM;
  nome: string;
  telefone?: string | null;
  cidade?: string | null;
  fazenda?: string | null;
  endereco_fazenda?: string | null;
  quantidade_animais?: number | string | null;
  capacidade_carga_toneladas?: number | null; // Para Terceiros/Transportadores
  tipo_veiculo?: string | null; // Ex: Toco, Truck, Carreta
  observacao?: string | null;
  created_at?: string;
}

export interface ItemEstoque {
  id: string;
  nome: string;
  quantidade_disponivel: number;
  unidade_medida: string; // Ex: 'toneladas', 'sacos', 'kg'
  preco_unitario: number; // Ex: 450.00
  alerta_minimo: number; // Ex: 20
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
    quantidade_animais: contato.quantidade_animais || null,
    capacidade_carga_toneladas: contato.capacidade_carga_toneladas ?? null,
    tipo_veiculo: contato.tipo_veiculo || null,
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
    mapa.set(entityId, {
      id: entityId,
      tipo: row.tipo || 'cliente',
      status_crm: row.status_crm || 'cliente_ativo',
      nome: nomeStr,
      telefone: row.telefone ?? null,
      cidade: row.cidade ?? extra.cidade ?? null,
      fazenda: null,
      endereco_fazenda: row.endereco_fazenda ?? extra.endereco_fazenda ?? null,
      quantidade_animais: row.quantidade_animais ?? extra.quantidade_animais ?? null,
      capacidade_carga_toneladas:
        row.capacidade_carga_toneladas ?? extra.capacidade_carga_toneladas ?? null,
      tipo_veiculo: row.tipo_veiculo ?? extra.tipo_veiculo ?? null,
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
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {}
  return null;
}
