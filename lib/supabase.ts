import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  !supabaseUrl.includes('sua-url-supabase') &&
  Boolean(supabaseAnonKey) &&
  !supabaseAnonKey.includes('sua-chave-anonima');

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
