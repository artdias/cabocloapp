'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  supabase,
  Atendimento,
  Contato,
  Pedido,
  ItemEstoque,
  ItemVendaPedido,
  isSupabaseConfigured,
  TipoEntidade,
  StatusCRM,
  StatusFinanceiro,
  DEMO_ID_MAP,
  gerarUuid,
  normalizarId,
  salvarContatoNoBanco,
  excluirContatoNoBanco,
  parseContatosDoBanco,
  salvarPedidoNoBanco,
  excluirPedidoNoBanco,
  parsePedidosDoBanco,
  salvarEstoqueNoBanco,
  carregarEstoqueDoBanco,
} from '@/lib/supabase';
import {
  Mic,
  Square,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User,
  Package,
  Calendar,
  FileText,
  Clock,
  Volume2,
  Plus,
  Users,
  ShoppingBag,
  DollarSign,
  Edit3,
  Phone,
  AlertTriangle,
  Check,
  X,
  BellRing,
  UserPlus,
  Truck,
  MapPin,
  Home,
  Trash2,
  FileEdit,
  Save,
  Inbox,
  Wifi,
  WifiOff,
  RotateCcw,
  Sun,
  Cloud,
  CloudRain,
  Droplets,
  Wind,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

type TabType = 'inicio' | 'pedidos' | 'estoque' | 'cadastro' | 'financeiro';

export interface RascunhoVoz {
  id: string;
  texto: string;
  created_at: string;
}

export interface LembreteRespondidoItem {
  id: string;
  nome: string;
  tipo: 'estoque' | 'prospect';
  detalhe: string;
  data_resposta: string;
}

export interface DadosClima {
  cidade: string;
  temp: number;
  condicao: string;
  umidade: number;
  chuvaProb: number;
  vento: string;
  previsaoDias: { dia: string; tempMax: number; icone: string }[];
}

const CLIMA_INICIAL: DadosClima = {
  cidade: 'Montanha - ES',
  temp: 28,
  condicao: 'Sol com Nuvens',
  umidade: 62,
  chuvaProb: 10,
  vento: '14 km/h SE',
  previsaoDias: [
    { dia: 'Hoje', tempMax: 29, icone: '☀️' },
    { dia: 'Amanhã', tempMax: 30, icone: '🌤️' },
    { dia: 'Sex', tempMax: 27, icone: '🌧️' },
    { dia: 'Sáb', tempMax: 28, icone: '☀️' },
  ],
};

// Dados de Exemplo para Demonstração Imediata (com IDs sincronizados no Supabase)
const DEMO_CONTATOS: Contato[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    tipo: 'cliente',
    status_crm: 'cliente_ativo',
    nome: 'João Paulo - Fazenda Bela Vista',
    telefone: '27999887766',
    cidade: 'Vila Velha',
    endereco_fazenda: 'Rodovia do Sol, Km 18, Zona Rural, Vila Velha - ES',
    quantidade_animais: '120 cabeças de gado',
    observacao: 'Comprou 10 toneladas de silagem de milho. Estoque acabando esta semana!',
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    tipo: 'cliente',
    status_crm: 'possibilidade',
    nome: 'Marcos Ribeiro - Sítio São José',
    telefone: '27998881122',
    cidade: 'Linhares',
    endereco_fazenda: 'Estrada do Guaraná, S/N, Linhares - ES',
    quantidade_animais: '45 vacas de leite',
    observacao: 'Cotou 50 sacos de silagem de sorgo. Retornar ligação esta semana!',
    created_at: '2026-09-25T14:30:00Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    tipo: 'terceiro',
    status_crm: 'parceiro',
    nome: 'Sebastião Fretes (Caminhão Toco)',
    telefone: '27995551122',
    cidade: 'Viana',
    capacidade_carga_toneladas: 5,
    tipo_veiculo: 'Caminhão Toco (5t)',
    observacao: 'Disponível para fretes curtos na grande Vitória e Viana.',
    created_at: '2026-09-10T08:00:00Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111104',
    tipo: 'terceiro',
    status_crm: 'parceiro',
    nome: 'Gilmar Transportes (Caminhão Truck)',
    telefone: '27994443322',
    cidade: 'Linhares',
    capacidade_carga_toneladas: 14,
    tipo_veiculo: 'Truck 3 Eixos (14t)',
    observacao: 'Freteiro com basculante de alta capacidade.',
    created_at: '2026-09-12T09:00:00Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111105',
    tipo: 'terceiro',
    status_crm: 'parceiro',
    nome: 'TransSilagem Bitrem',
    telefone: '27993332211',
    cidade: 'Cachoeiro',
    capacidade_carga_toneladas: 30,
    tipo_veiculo: 'Carreta Bitrem (30t)',
    observacao: 'Transportes de grande volume para fazendas de grande porte.',
    created_at: '2026-09-14T11:00:00Z',
  },
];

const DEMO_PEDIDOS: Pedido[] = [
  {
    id: '22222222-2222-4222-8222-222222222201',
    contato_id: '11111111-1111-4111-8111-111111111101',
    nome_cliente: 'João Paulo - Fazenda Bela Vista',
    produto: 'Silagem de Milho',
    quantidade: '10 toneladas',
    quantidade_toneladas_num: 10,
    valor_total: 4500.0,
    data_compra: '2026-09-01',
    data_previsao_fim_estoque: '2026-10-03',
    status_financeiro: 'pago',
    tipo_operacao: 'venda',
    observacao: 'Entrega pendente na Rodovia do Sol, Km 18',
  },
  {
    id: '22222222-2222-4222-8222-222222222202',
    contato_id: '11111111-1111-4111-8111-111111111102',
    nome_cliente: 'Marcos Ribeiro - Sítio São José',
    produto: 'Silagem de Sorgo',
    quantidade: '50 sacos (approx 2.5t)',
    quantidade_toneladas_num: 2.5,
    valor_total: 1250.0,
    data_compra: '2026-09-25',
    data_previsao_fim_estoque: '2026-10-25',
    status_financeiro: 'pendente',
    tipo_operacao: 'venda',
    observacao: 'Aguardando confirmação de entrega em Linhares',
  },
];

const DEMO_ESTOQUE: ItemEstoque[] = [
  {
    id: 'est-1',
    nome: 'Silagem de Milho Premium',
    quantidade_disponivel: 140.0,
    unidade_medida: 'toneladas',
    preco_unitario: 450.0,
    alerta_minimo: 25.0,
    observacao: 'Safra nova, alta digestibilidade e grão inteiro.',
  },
  {
    id: 'est-2',
    nome: 'Silagem de Sorgo Forrageiro',
    quantidade_disponivel: 85.0,
    unidade_medida: 'toneladas',
    preco_unitario: 380.0,
    alerta_minimo: 15.0,
    observacao: 'Excelente custo-benefício para gado de corte e leite.',
  },
  {
    id: 'est-3',
    nome: 'Silagem de Capim Açú',
    quantidade_disponivel: 60.0,
    unidade_medida: 'toneladas',
    preco_unitario: 320.0,
    alerta_minimo: 10.0,
    observacao: 'Rica em fibra para suplementação seca.',
  },
  {
    id: 'est-4',
    nome: 'Saco de Silagem de Milho (30kg)',
    quantidade_disponivel: 450.0,
    unidade_medida: 'sacos',
    preco_unitario: 25.0,
    alerta_minimo: 50.0,
    observacao: 'Embalagem reforçada selada à vácuo.',
  },
];

function limparContatosLocais(lista: Contato[]): Contato[] {
  const vistos = new Set<string>();
  const resultado: Contato[] = [];

  for (const c of lista) {
    if (!c || !c.nome) continue;
    const nomeLimpo = c.nome.trim();
    if (!nomeLimpo || nomeLimpo.startsWith('__') || nomeLimpo.toLowerCase() === 'teste tese') {
      continue;
    }

    const idNorm = c.id && DEMO_ID_MAP[c.id] ? DEMO_ID_MAP[c.id] : c.id;
    const chaveUnica = `${c.tipo || 'cliente'}:${nomeLimpo.toLowerCase()}`;

    if (idNorm?.startsWith('local-') && vistos.has(chaveUnica)) {
      continue;
    }
    vistos.add(chaveUnica);
    resultado.push({ ...c, id: idNorm, nome: nomeLimpo });
  }

  return resultado;
}

function limparPedidosLocais(lista: Pedido[]): Pedido[] {
  const resultado: Pedido[] = [];
  for (const p of lista) {
    if (!p || !p.nome_cliente) continue;
    const nomeLimpo = p.nome_cliente.trim();
    if (!nomeLimpo || nomeLimpo.startsWith('__') || nomeLimpo.toLowerCase() === 'teste tese') {
      continue;
    }
    const idNorm = p.id && DEMO_ID_MAP[p.id] ? DEMO_ID_MAP[p.id] : p.id;
    const contatoNorm = p.contato_id && DEMO_ID_MAP[p.contato_id] ? DEMO_ID_MAP[p.contato_id] : p.contato_id;
    resultado.push({ ...p, id: idNorm, contato_id: contatoNorm });
  }
  return resultado;
}

export default function CabocloAgroCRM() {
  const [activeTab, setActiveTab] = useState<TabType>('inicio');
  const [status, setStatus] = useState<string>('Pronto para gravar');
  const [transcript, setTranscript] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Trava contra múltiplos cliques / travamentos ao salvar
  const salvandoRef = useRef<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Validação e foco automático nos campos obrigatórios (Cadastro Manual & Voz)
  const [errosCadastro, setErrosCadastro] = useState<Record<string, string>>({});
  const [avisoValidacaoCadastro, setAvisoValidacaoCadastro] = useState<string | null>(null);

  const manualNomeRef = useRef<HTMLInputElement>(null);
  const manualEnderecoRef = useRef<HTMLInputElement>(null);
  const manualCapacidadeRef = useRef<HTMLInputElement>(null);
  const manualVeiculoRef = useRef<HTMLInputElement>(null);
  const manualTelefoneRef = useRef<HTMLInputElement>(null);

  const vozNomeRef = useRef<HTMLInputElement>(null);
  const vozEnderecoRef = useRef<HTMLInputElement>(null);
  const vozCapacidadeRef = useRef<HTMLInputElement>(null);
  const vozVeiculoRef = useRef<HTMLInputElement>(null);
  const vozTelefoneRef = useRef<HTMLInputElement>(null);

  // Validação e foco automático nos campos obrigatórios (Novo Pedido)
  const [errosPedido, setErrosPedido] = useState<Record<string, string>>({});
  const [avisoValidacaoPedido, setAvisoValidacaoPedido] = useState<string | null>(null);
  const pedidoClienteRef = useRef<HTMLSelectElement>(null);
  const pedidoQtdRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Validação e foco automático nos campos obrigatórios (Estoque)
  const [errosEstoque, setErrosEstoque] = useState<Record<string, string>>({});
  const [avisoValidacaoEstoque, setAvisoValidacaoEstoque] = useState<string | null>(null);
  const estoqueNomeRef = useRef<HTMLInputElement>(null);
  const estoqueQtdRef = useRef<HTMLInputElement>(null);
  const estoquePrecoRef = useRef<HTMLInputElement>(null);

  // Estado do Estoque e Sub-abas de Pedidos
  const [estoque, setEstoque] = useState<ItemEstoque[]>(DEMO_ESTOQUE);
  const [subAbaPedidos, setSubAbaPedidos] = useState<'pedidos' | 'estoque'>('pedidos');
  const [isNovoPedidoModalOpen, setIsNovoPedidoModalOpen] = useState<boolean>(false);
  const [isNovoItemEstoqueModalOpen, setIsNovoItemEstoqueModalOpen] = useState<boolean>(false);

  // Form State para Novo Pedido com Seleção de Cliente e Itens
  const [novoPedidoForm, setNovoPedidoForm] = useState<{
    clienteId: string;
    terceiroId: string;
    itens: { estoqueId: string; quantidade: string }[];
    dataCompra: string;
    diasEstoqueFim: string;
    statusFinanceiro: StatusFinanceiro;
    observacao: string;
  }>({
    clienteId: '',
    terceiroId: '',
    itens: [{ estoqueId: 'est-1', quantidade: '10' }],
    dataCompra: new Date().toISOString().split('T')[0],
    diasEstoqueFim: '30',
    statusFinanceiro: 'pendente',
    observacao: '',
  });

  // Form State para Entrada / Cadastro de Novo Item no Estoque
  const [novoItemEstoqueForm, setNovoItemEstoqueForm] = useState<{
    nome: string;
    quantidade: string;
    unidade: string;
    preco: string;
    alerta: string;
    observacao: string;
  }>({
    nome: '',
    quantidade: '',
    unidade: 'toneladas',
    preco: '',
    alerta: '10',
    observacao: '',
  });

  // Rascunhos de Voz Off-line
  const [rascunhos, setRascunhos] = useState<RascunhoVoz[]>([]);
  const [isRascunhosModalOpen, setIsRascunhosModalOpen] = useState<boolean>(false);

  // Controle de Edição de Registro Existente
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEstoqueId, setEditingEstoqueId] = useState<string | null>(null);
  const [editingPedidoId, setEditingPedidoId] = useState<string | null>(null);

  // Modal de Cadastro Manual / Edição
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);

  // Form State para Confirmação de Voz, Cadastro ou Edição Manual
  const [formData, setFormData] = useState<{
    tipo: TipoEntidade;
    status_crm: StatusCRM;
    nome: string;
    telefone: string;
    endereco_fazenda: string;
    quantidade_animais: string;
    capacidade_carga_toneladas: string;
    tipo_veiculo: string;
    produto: string;
    quantidade: string;
    valor_total: string;
    data_proximo_contato: string;
    data_previsao_fim_estoque: string;
    observacao: string;
  } | null>(null);

  // Listas de Dados
  const [contatos, setContatos] = useState<Contato[]>(DEMO_CONTATOS);
  const [pedidos, setPedidos] = useState<Pedido[]>(DEMO_PEDIDOS);
  const [loading, setLoading] = useState<boolean>(false);

  // Filtros de Contatos
  const [filtroContato, setFiltroContato] = useState<string>('todos');

  // Modal WhatsApp
  const [whatsappModal, setWhatsappModal] = useState<{
    isOpen: boolean;
    telefone: string;
    mensagem: string;
    nomeCliente: string;
    reminderId?: string;
    reminderTipo?: 'estoque' | 'prospect';
    reminderDetalhe?: string;
  }>({
    isOpen: false,
    telefone: '',
    mensagem: '',
    nomeCliente: '',
  });

  // Estado para Gerenciamento de Lembretes (Adiar, Excluir, Respondidos)
  const [lembretesAdiados, setLembretesAdiados] = useState<Record<string, string>>({});
  const [lembretesExcluidos, setLembretesExcluidos] = useState<string[]>([]);
  const [lembretesRespondidos, setLembretesRespondidos] = useState<LembreteRespondidoItem[]>([]);
  const [abaLembretes, setAbaLembretes] = useState<'pendentes' | 'respondidos'>('pendentes');
  const [adiarModal, setAdiarModal] = useState<{ id: string; nome: string } | null>(null);
  // Estados da Aba Financeiro
  const [subAbaFinanceiro, setSubAbaFinanceiro] = useState<'periodo' | 'clientes' | 'lancamentos'>('periodo');
  const [filtroPeriodoFinanceiro, setFiltroPeriodoFinanceiro] = useState<'mes_atual' | '30dias' | 'ano_atual' | 'todos'>('mes_atual');

  // Estado para Sanfona (Expandir/Recolher Detalhes dos Contatos)
  const [contatosExpandidos, setContatosExpandidos] = useState<Record<string, boolean>>({});

  const toggleExpandContato = (id: string) => {
    setContatosExpandidos((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const [clima, setClima] = useState<DadosClima>(CLIMA_INICIAL);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);
  const hojeStr = new Date().toISOString().split('T')[0];

  const limparErroCampoCadastro = (campo: string) => {
    setErrosCadastro((prev) => {
      if (!prev[campo]) return prev;
      const copia = { ...prev };
      delete copia[campo];
      if (Object.keys(copia).length === 0) {
        setAvisoValidacaoCadastro(null);
      }
      return copia;
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      carregarClimaReal();

      const handleOnline = () => {
        setIsOnline(true);
        carregarTodosDados();
        carregarClimaReal();
      };

      const handleOffline = () => {
        setIsOnline(false);
      };

      const handleFocus = () => {
        if (navigator.onLine && !salvandoRef.current) {
          carregarTodosDados(true);
        }
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      window.addEventListener('focus', handleFocus);

      const syncInterval = setInterval(() => {
        if (navigator.onLine && !salvandoRef.current) {
          carregarTodosDados(true);
        }
      }, 20000);

      // Carrega rascunhos salvos no localStorage
      const salvos = localStorage.getItem('caboclo_rascunhos_voz');
      if (salvos) {
        try {
          setRascunhos(JSON.parse(salvos));
        } catch (e) {}
      }

      // Carrega dados de lembretes salvos (Adiados, Excluídos e Respondidos)
      const salvosAdiados = localStorage.getItem('caboclo_lembretes_adiados');
      if (salvosAdiados) {
        try { setLembretesAdiados(JSON.parse(salvosAdiados)); } catch (e) {}
      }

      const salvosExcluidos = localStorage.getItem('caboclo_lembretes_excluidos');
      if (salvosExcluidos) {
        try { setLembretesExcluidos(JSON.parse(salvosExcluidos)); } catch (e) {}
      }

      const salvosRespondidos = localStorage.getItem('caboclo_lembretes_respondidos');
      if (salvosRespondidos) {
        try { setLembretesRespondidos(JSON.parse(salvosRespondidos)); } catch (e) {}
      }

      const salvosEstoque = localStorage.getItem('caboclo_estoque');
      if (salvosEstoque) {
        try { setEstoque(JSON.parse(salvosEstoque)); } catch (e) {}
      }

      const salvosContatos = localStorage.getItem('caboclo_contatos');
      if (salvosContatos) {
        try {
          const limpos = limparContatosLocais(JSON.parse(salvosContatos));
          setContatos(limpos);
          localStorage.setItem('caboclo_contatos', JSON.stringify(limpos));
        } catch (e) {}
      }

      const salvosPedidos = localStorage.getItem('caboclo_pedidos');
      if (salvosPedidos) {
        try {
          const limposP = limparPedidosLocais(JSON.parse(salvosPedidos));
          setPedidos(limposP);
          localStorage.setItem('caboclo_pedidos', JSON.stringify(limposP));
        } catch (e) {}
      }

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'pt-BR';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'no-speech') {
            setIsRecording(false);
            setStatus((prev) => (prev === '🎙️ Ouvindo...' ? 'Pronto para gravar' : prev));
            return;
          }
          if (event.error === 'aborted') {
            setIsRecording(false);
            return;
          }
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
          setStatus((prev) => (prev === '🎙️ Ouvindo...' ? 'Pronto para gravar' : prev));
        };

        recognitionRef.current = recognition;
      }

      carregarTodosDados();

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('focus', handleFocus);
        clearInterval(syncInterval);
      };
    }
  }, []);

  const carregarTodosDados = async (silencioso: boolean = false) => {
    if (!isSupabaseConfigured) return;

    if (!silencioso) setLoading(true);
    try {
      // 1. Migrar e enviar para o Supabase quaisquer cadastros locais (local-*) ainda não sincronizados
      if (typeof window !== 'undefined') {
        const salvosLocal = localStorage.getItem('caboclo_contatos');
        if (salvosLocal) {
          try {
            const contatosLocais = limparContatosLocais(JSON.parse(salvosLocal));
            let houveMigracao = false;
            const contatosMigrados: Contato[] = [];

            for (const c of contatosLocais) {
              if (c.id && c.id.startsWith('local-')) {
                const novoUuid = gerarUuid();
                const contatoAtualizado = { ...c, id: novoUuid };
                const ok = await salvarContatoNoBanco(contatoAtualizado);
                if (ok) {
                  contatosMigrados.push(contatoAtualizado);
                  houveMigracao = true;
                } else {
                  contatosMigrados.push(c);
                }
              } else {
                contatosMigrados.push(c);
              }
            }

            if (houveMigracao) {
              localStorage.setItem('caboclo_contatos', JSON.stringify(contatosMigrados));
            }
          } catch {}
        }

        const salvosLocalP = localStorage.getItem('caboclo_pedidos');
        if (salvosLocalP) {
          try {
            const pedidosLocais = limparPedidosLocais(JSON.parse(salvosLocalP));
            let houveMigracaoP = false;
            const pedidosMigrados: Pedido[] = [];

            for (const p of pedidosLocais) {
              if (p.id && (p.id.startsWith('local-ped-') || p.id.startsWith('ped-'))) {
                const novoUuid = gerarUuid();
                const pedidoAtualizado = { ...p, id: novoUuid };
                const ok = await salvarPedidoNoBanco(pedidoAtualizado);
                if (ok) {
                  pedidosMigrados.push(pedidoAtualizado);
                  houveMigracaoP = true;
                } else {
                  pedidosMigrados.push(p);
                }
              } else {
                pedidosMigrados.push(p);
              }
            }

            if (houveMigracaoP) {
              localStorage.setItem('caboclo_pedidos', JSON.stringify(pedidosMigrados));
            }
          } catch {}
        }
      }

      // 2. Buscar dados atualizados do banco (fonte da verdade para todos os dispositivos)
      const { data: dataContatos, error: errContatos } = await supabase
        .from('contatos')
        .select('*')
        .order('created_at', { ascending: true });

      if (!errContatos && dataContatos) {
        const contatosDoBanco = parseContatosDoBanco(dataContatos);
        if (contatosDoBanco.length > 0) {
          setContatos(contatosDoBanco);
          if (typeof window !== 'undefined') {
            localStorage.setItem('caboclo_contatos', JSON.stringify(contatosDoBanco));
          }
        }
      }

      const { data: dataPedidos, error: errPedidos } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: true });

      if (!errPedidos && dataPedidos) {
        const pedidosDoBanco = parsePedidosDoBanco(dataPedidos);
        if (pedidosDoBanco.length > 0) {
          setPedidos(pedidosDoBanco);
          if (typeof window !== 'undefined') {
            localStorage.setItem('caboclo_pedidos', JSON.stringify(pedidosDoBanco));
          }
        }
      }

      const estoqueBanco = await carregarEstoqueDoBanco();
      if (estoqueBanco && estoqueBanco.length > 0) {
        setEstoque(estoqueBanco);
        if (typeof window !== 'undefined') {
          localStorage.setItem('caboclo_estoque', JSON.stringify(estoqueBanco));
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar dados:', err);
    } finally {
      if (!silencioso) setLoading(false);
    }
  };

  const carregarClimaReal = async () => {
    try {
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=-18.12&longitude=-40.36&current=temperature_2m,relative_humidity_2m,precipitation_probability_max,wind_speed_10m&daily=temperature_2m_max,precipitation_probability_max&timezone=America%2FSao_Paulo'
      );
      if (res.ok) {
        const d = await res.json();
        const cur = d.current;
        const tempAtual = Math.round(cur.temperature_2m);
        const umid = Math.round(cur.relative_humidity_2m);
        const probChuva = d.daily?.precipitation_probability_max?.[0] || 10;
        const ventoVel = Math.round(cur.wind_speed_10m || 12);

        setClima({
          cidade: 'Montanha - ES',
          temp: tempAtual,
          condicao: probChuva > 40 ? 'Nublado c/ Chuva' : probChuva > 20 ? 'Parcialmente Nublado' : 'Sol e Tempo Bom',
          umidade: umid,
          chuvaProb: probChuva,
          vento: `${ventoVel} km/h`,
          previsaoDias: [
            { dia: 'Hoje', tempMax: Math.round(d.daily?.temperature_2m_max?.[0] || 29), icone: probChuva > 40 ? '🌧️' : '☀️' },
            { dia: 'Amanhã', tempMax: Math.round(d.daily?.temperature_2m_max?.[1] || 30), icone: '🌤️' },
            { dia: 'Sex', tempMax: Math.round(d.daily?.temperature_2m_max?.[2] || 27), icone: '☁️' },
            { dia: 'Sáb', tempMax: Math.round(d.daily?.temperature_2m_max?.[3] || 28), icone: '☀️' },
          ],
        });
      }
    } catch (e) {
      console.warn('Usando clima fallback:', e);
    }
  };

  // Salvar Rascunho Manualmente ou por Falha da IA
  const salvarRascunho = (textoParaSalvar?: string) => {
    const textoFinal = textoParaSalvar || transcript;
    if (!textoFinal || !textoFinal.trim()) return;

    const novoRascunho: RascunhoVoz = {
      id: `rascunho-${Date.now()}`,
      texto: textoFinal,
      created_at: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    const novaLista = [novoRascunho, ...rascunhos];
    setRascunhos(novaLista);
    if (typeof window !== 'undefined') {
      localStorage.setItem('caboclo_rascunhos_voz', JSON.stringify(novaLista));
    }

    setStatus('📝 Salvo em Rascunhos');
    setErrorMessage('Áudio salvo na sua lista de Rascunhos! Você pode reprocessar ou cadastrar a qualquer momento.');
  };

  const excluirRascunho = (id: string) => {
    const novaLista = rascunhos.filter((r) => r.id !== id);
    setRascunhos(novaLista);
    if (typeof window !== 'undefined') {
      localStorage.setItem('caboclo_rascunhos_voz', JSON.stringify(novaLista));
    }
  };

  // Preenche cadastro manual a partir de um rascunho
  const cadastrarAPartirDoRascunho = (rascunho: RascunhoVoz) => {
    const prox = new Date();
    prox.setDate(prox.getDate() + 7);

    setEditingId(null);
    setErrosCadastro({});
    setAvisoValidacaoCadastro(null);
    setFormData({
      tipo: 'cliente',
      status_crm: 'cliente_ativo',
      nome: '',
      telefone: '',
      endereco_fazenda: '',
      quantidade_animais: '',
      capacidade_carga_toneladas: '',
      tipo_veiculo: '',
      produto: 'Silagem de Milho',
      quantidade: '',
      valor_total: '',
      data_proximo_contato: prox.toISOString().split('T')[0],
      data_previsao_fim_estoque: '',
      observacao: rascunho.texto,
    });
    setIsRascunhosModalOpen(false);
    setIsManualModalOpen(true);
  };

  // Abrir Modal de Cadastro Manual Novo
  const abrirCadastroManual = (tipoInicial: TipoEntidade = 'cliente') => {
    const prox = new Date();
    prox.setDate(prox.getDate() + 7);

    setEditingId(null);
    setErrosCadastro({});
    setAvisoValidacaoCadastro(null);
    setFormData({
      tipo: tipoInicial,
      status_crm: tipoInicial === 'terceiro' ? 'parceiro' : 'cliente_ativo',
      nome: '',
      telefone: '',
      endereco_fazenda: '',
      quantidade_animais: '',
      capacidade_carga_toneladas: '',
      tipo_veiculo: '',
      produto: tipoInicial === 'terceiro' ? '' : 'Silagem de Milho',
      quantidade: '',
      valor_total: '',
      data_proximo_contato: prox.toISOString().split('T')[0],
      data_previsao_fim_estoque: '',
      observacao: '',
    });
    setIsManualModalOpen(true);
  };

  // Abrir Modal de Edição de Cadastro Existente
  const abrirEdicaoContato = (contato: Contato) => {
    const pedidoRelacionado = pedidos.find((p) => p.nome_cliente === contato.nome || (contato.id && p.contato_id === contato.id));

    const targetId = contato.id || contato.nome;
    setEditingId(targetId);
    setErrosCadastro({});
    setAvisoValidacaoCadastro(null);
    setFormData({
      tipo: contato.tipo,
      status_crm: contato.status_crm,
      nome: contato.nome,
      telefone: contato.telefone || '',
      endereco_fazenda: contato.endereco_fazenda || '',
      quantidade_animais: contato.quantidade_animais ? String(contato.quantidade_animais) : '',
      capacidade_carga_toneladas: contato.capacidade_carga_toneladas ? String(contato.capacidade_carga_toneladas) : '',
      tipo_veiculo: contato.tipo_veiculo || '',
      produto: pedidoRelacionado?.produto || 'Silagem de Milho',
      quantidade: pedidoRelacionado?.quantidade || '',
      valor_total: pedidoRelacionado?.valor_total ? String(pedidoRelacionado.valor_total) : '',
      data_proximo_contato: '',
      data_previsao_fim_estoque: pedidoRelacionado?.data_previsao_fim_estoque || '',
      observacao: contato.observacao || '',
    });
    setIsManualModalOpen(true);
  };

  // Excluir Cadastro
  const excluirContato = async (id: string) => {
    if (!confirm('Deseja realmente excluir este cadastro?')) return;

    const idAlvo = DEMO_ID_MAP[id] || id;
    const novosContatos = contatos.filter((c) => c.id !== id && c.id !== idAlvo && c.nome !== id);
    setContatos(novosContatos);

    if (typeof window !== 'undefined') {
      localStorage.setItem('caboclo_contatos', JSON.stringify(novosContatos));
    }

    setIsManualModalOpen(false);
    setEditingId(null);
    setFormData(null);

    await excluirContatoNoBanco(idAlvo);
  };

  // Gravação de Voz
  const startRecording = () => {
    setErrorMessage(null);
    setTranscript('');
    setEditingId(null);
    setFormData(null);
    setErrosCadastro({});
    setAvisoValidacaoCadastro(null);

    try {
      recognitionRef.current?.start();
      setIsRecording(true);
      setStatus('🎙️ Ouvindo...');
    } catch (err) {
      setIsRecording(false);
      setStatus('Pronto para gravar');
    }
  };

  const stopRecordingAndProcess = async () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    if (!transcript || transcript.trim().length === 0) {
      setErrorMessage('Nenhuma fala capturada. Tente falar novamente.');
      setStatus('Pronto para gravar');
      return;
    }

    await processAudioText(transcript);
  };

  const processAudioText = async (texto: string) => {
    try {
      setStatus('Processando com IA...');
      setErrorMessage(null);

      const response = await fetch('/api/entender-voz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao processar dados de voz com IA.');
      }

      const res = await response.json();

      setEditingId(null);
      setErrosCadastro({});
      setAvisoValidacaoCadastro(null);
      setFormData({
        tipo: res.tipo_entidade || 'cliente',
        status_crm: res.status_crm || 'possibilidade',
        nome: res.nome_cliente || '',
        telefone: res.telefone || '',
        endereco_fazenda: res.endereco_fazenda || '',
        quantidade_animais: res.quantidade_animais || '',
        capacidade_carga_toneladas: res.capacidade_carga_toneladas ? String(res.capacidade_carga_toneladas) : '',
        tipo_veiculo: res.tipo_veiculo || '',
        produto: res.produto || '',
        quantidade: res.quantidade || '',
        valor_total: res.valor_total ? String(res.valor_total) : '',
        data_proximo_contato: res.data_proximo_contato || '',
        data_previsao_fim_estoque: res.data_previsao_fim_estoque || '',
        observacao: res.observacao || '',
      });

      setStatus('Conferir & Confirmar');
    } catch (err: any) {
      salvarRascunho(texto);
      setErrorMessage(
        'Serviço de IA instável no momento. Seu áudio foi SALVO NOS RASCUNHOS! Você pode conferir e cadastrar mais tarde.'
      );
    }
  };

  // Salvar ou Atualizar Cadastro com Validação de Campos Obrigatórios, Foco Automático e Sincronização no Banco
  const salvarCadastroConfirmado = async () => {
    if (!formData || salvandoRef.current) return;

    // 1. Validar Campos Obrigatórios e Focar no Primeiro Campo Faltante
    const novosErros: Record<string, string> = {};
    const nomesCamposFaltantes: string[] = [];

    if (!formData.nome.trim()) {
      novosErros.nome = 'Informe o nome (obrigatório)';
      nomesCamposFaltantes.push('Nome');
    }

    if (formData.tipo === 'cliente' && !formData.endereco_fazenda.trim()) {
      novosErros.endereco_fazenda = 'Informe o endereço da fazenda (obrigatório)';
      nomesCamposFaltantes.push('Endereço da Fazenda');
    }

    if (formData.tipo === 'terceiro') {
      const capVal = parseFloat(formData.capacidade_carga_toneladas);
      if (!formData.capacidade_carga_toneladas.trim() || isNaN(capVal) || capVal <= 0) {
        novosErros.capacidade_carga_toneladas = 'Informe a capacidade em toneladas (obrigatório)';
        nomesCamposFaltantes.push('Capacidade (Toneladas)');
      }
      if (!formData.tipo_veiculo.trim()) {
        novosErros.tipo_veiculo = 'Informe o tipo de veículo/caminhão (obrigatório)';
        nomesCamposFaltantes.push('Tipo de Veículo');
      }
    }

    if (!formData.telefone.trim()) {
      novosErros.telefone = 'Informe o telefone / WhatsApp (obrigatório)';
      nomesCamposFaltantes.push('Telefone / WhatsApp');
    }

    if (Object.keys(novosErros).length > 0) {
      setErrosCadastro(novosErros);
      setAvisoValidacaoCadastro(
        `Preencha os campos obrigatórios destacados em vermelho: ${nomesCamposFaltantes.join(', ')}.`
      );

      const primeiroInputComErro = isManualModalOpen
        ? novosErros.nome
          ? manualNomeRef.current
          : novosErros.endereco_fazenda
          ? manualEnderecoRef.current
          : novosErros.capacidade_carga_toneladas
          ? manualCapacidadeRef.current
          : novosErros.tipo_veiculo
          ? manualVeiculoRef.current
          : manualTelefoneRef.current
        : novosErros.nome
        ? vozNomeRef.current
        : novosErros.endereco_fazenda
        ? vozEnderecoRef.current
        : novosErros.capacidade_carga_toneladas
        ? vozCapacidadeRef.current
        : novosErros.tipo_veiculo
        ? vozVeiculoRef.current
        : vozTelefoneRef.current;

      if (primeiroInputComErro) {
        primeiroInputComErro.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          primeiroInputComErro.focus();
        }, 50);
      }
      return;
    }

    // 2. Trava síncrona imediata para impedir duplicidade por múltiplos cliques
    salvandoRef.current = true;
    setIsSaving(true);
    setErrosCadastro({});
    setAvisoValidacaoCadastro(null);

    try {
      const capNum = formData.capacidade_carga_toneladas ? parseFloat(formData.capacidade_carga_toneladas) : null;
      const nomeLimpo = formData.nome.trim();

      if (editingId) {
        const idNormalizado = normalizarId(editingId);
        let contatoEditadoObj: Contato | null = null;

        const novosContatos = contatos.map((c) => {
          const isTarget = (c.id && (c.id === editingId || c.id === idNormalizado)) || c.nome === editingId;
          if (isTarget) {
            contatoEditadoObj = {
              ...c,
              id: idNormalizado,
              tipo: formData.tipo,
              status_crm: formData.status_crm,
              nome: nomeLimpo,
              telefone: formData.telefone.trim() || null,
              endereco_fazenda: formData.endereco_fazenda.trim() || null,
              quantidade_animais: formData.quantidade_animais.trim() || null,
              capacidade_carga_toneladas: capNum,
              tipo_veiculo: formData.tipo_veiculo.trim() || null,
              observacao: formData.observacao.trim() || null,
            };
            return contatoEditadoObj;
          }
          return c;
        });

        setContatos(novosContatos);

        const novosPedidos = pedidos.map((p) =>
          p.contato_id === editingId || p.contato_id === idNormalizado || p.nome_cliente === editingId
            ? { ...p, contato_id: idNormalizado, nome_cliente: nomeLimpo }
            : p
        );
        setPedidos(novosPedidos);

        if (typeof window !== 'undefined') {
          localStorage.setItem('caboclo_contatos', JSON.stringify(novosContatos));
          localStorage.setItem('caboclo_pedidos', JSON.stringify(novosPedidos));
        }

        // Fecha o modal imediatamente para evitar travamento visual e cliques repetidos
        setIsManualModalOpen(false);
        setEditingId(null);
        setFormData(null);
        setTranscript('');
        setStatus('✅ Salvo com sucesso!');

        if (contatoEditadoObj) {
          await salvarContatoNoBanco(contatoEditadoObj);
        }
      } else {
        // Verifica se já existe exatamente o mesmo nome + tipo para evitar duplicação acidental
        const existenteMesmoNome = contatos.find(
          (c) => c.tipo === formData.tipo && c.nome.trim().toLowerCase() === nomeLimpo.toLowerCase()
        );

        const idFinal = existenteMesmoNome?.id ? normalizarId(existenteMesmoNome.id) : gerarUuid();

        const novoContato: Contato = {
          id: idFinal,
          tipo: formData.tipo,
          status_crm: formData.status_crm,
          nome: nomeLimpo,
          telefone: formData.telefone.trim() || null,
          endereco_fazenda: formData.endereco_fazenda.trim() || null,
          quantidade_animais: formData.quantidade_animais.trim() || null,
          capacidade_carga_toneladas: capNum,
          tipo_veiculo: formData.tipo_veiculo.trim() || null,
          observacao: formData.observacao.trim() || null,
          created_at: existenteMesmoNome?.created_at || new Date().toISOString(),
        };

        const novosContatos = existenteMesmoNome
          ? contatos.map((c) => (c.id === existenteMesmoNome.id ? novoContato : c))
          : [novoContato, ...contatos];

        setContatos(novosContatos);

        let pedidoCriadoParaBanco: Pedido | null = null;
        let novosPedidos = pedidos;

        if (formData.tipo !== 'terceiro' && (formData.quantidade.trim() || formData.valor_total.trim())) {
          let qtdTonNum = 1.0;
          if (formData.quantidade) {
            const match = formData.quantidade.match(/(\d+([.,]\d+)?)/);
            if (match) qtdTonNum = parseFloat(match[1].replace(',', '.'));
          }

          const novoPedido: Pedido = {
            id: gerarUuid(),
            contato_id: novoContato.id,
            nome_cliente: nomeLimpo,
            produto: formData.produto.trim() || 'Silagem de Milho',
            quantidade: formData.quantidade.trim() || '1',
            quantidade_toneladas_num: qtdTonNum,
            valor_total: formData.valor_total ? parseFloat(formData.valor_total) : 0,
            data_compra: hojeStr,
            data_previsao_fim_estoque: formData.data_previsao_fim_estoque || null,
            status_financeiro: 'pendente',
            tipo_operacao: formData.tipo === 'fornecedor' ? 'compra' : 'venda',
            observacao: formData.observacao.trim() || null,
            created_at: new Date().toISOString(),
          };

          pedidoCriadoParaBanco = novoPedido;
          novosPedidos = [novoPedido, ...pedidos];
          setPedidos(novosPedidos);
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('caboclo_contatos', JSON.stringify(novosContatos));
          localStorage.setItem('caboclo_pedidos', JSON.stringify(novosPedidos));
        }

        // Fecha o modal e limpa o formulário imediatamente
        setIsManualModalOpen(false);
        setEditingId(null);
        setFormData(null);
        setTranscript('');
        setStatus('✅ Salvo com sucesso!');

        await salvarContatoNoBanco(novoContato);
        if (pedidoCriadoParaBanco) {
          await salvarPedidoNoBanco(pedidoCriadoParaBanco);
        }
      }

      setTimeout(() => {
        setStatus('Pronto para gravar');
      }, 1500);
    } finally {
      salvandoRef.current = false;
      setIsSaving(false);
    }
  };

  // Funções de Criação de Pedido com Cliente + Itens do Estoque
  const adicionarLinhaItemPedido = () => {
    const itemPadrao = estoque[0]?.id || 'est-1';
    setNovoPedidoForm((prev) => ({
      ...prev,
      itens: [...prev.itens, { estoqueId: itemPadrao, quantidade: '1' }],
    }));
  };

  const removerLinhaItemPedido = (index: number) => {
    setNovoPedidoForm((prev) => ({
      ...prev,
      itens: prev.itens.filter((_, idx) => idx !== index),
    }));
  };

  // Abrir Modal de Edição de Pedido Existente
  const abrirEdicaoPedido = (pedido: Pedido) => {
    setEditingPedidoId(pedido.id || null);
    setErrosPedido({});
    setAvisoValidacaoPedido(null);
    setNovoPedidoForm({
      clienteId: pedido.contato_id || pedido.nome_cliente || '',
      terceiroId: pedido.terceiro_id || '',
      itens: pedido.itens_venda && pedido.itens_venda.length > 0
        ? pedido.itens_venda.map((i) => ({ estoqueId: i.estoque_id, quantidade: String(i.quantidade) }))
        : [{ estoqueId: estoque[0]?.id || 'est-1', quantidade: String(pedido.quantidade_toneladas_num || 10) }],
      dataCompra: pedido.data_compra || hojeStr,
      diasEstoqueFim: '30',
      statusFinanceiro: pedido.status_financeiro || 'pendente',
      observacao: pedido.observacao || '',
    });
    setIsNovoPedidoModalOpen(true);
  };

  // Excluir Pedido
  const excluirPedido = async (id: string) => {
    if (!confirm('Deseja realmente excluir este pedido?')) return;

    const idAlvo = DEMO_ID_MAP[id] || id;
    const novaLista = pedidos.filter((p) => p.id !== id && p.id !== idAlvo);
    setPedidos(novaLista);

    if (typeof window !== 'undefined') {
      localStorage.setItem('caboclo_pedidos', JSON.stringify(novaLista));
    }

    await excluirPedidoNoBanco(idAlvo);
  };

  const salvarNovoPedido = async () => {
    if (salvandoRef.current) return;

    const novosErrosP: Record<string, string> = {};
    const faltantesP: string[] = [];

    if (!novoPedidoForm.clienteId) {
      novosErrosP.clienteId = 'Selecione o cliente para este pedido (obrigatório)';
      faltantesP.push('Selecionar Cliente');
    }

    let primeiroIndiceItemInvalido: number | null = null;
    novoPedidoForm.itens.forEach((itemForm, idx) => {
      const q = parseFloat(itemForm.quantidade);
      if (!itemForm.quantidade || !itemForm.quantidade.trim() || isNaN(q) || q <= 0) {
        novosErrosP[`item_${idx}`] = 'Informe uma quantidade maior que zero';
        if (primeiroIndiceItemInvalido === null) {
          primeiroIndiceItemInvalido = idx;
          faltantesP.push(`Quantidade do Item #${idx + 1}`);
        }
      }
    });

    if (Object.keys(novosErrosP).length > 0) {
      setErrosPedido(novosErrosP);
      setAvisoValidacaoPedido(
        `Preencha os campos obrigatórios destacados em vermelho: ${faltantesP.join(', ')}.`
      );

      if (novosErrosP.clienteId && pedidoClienteRef.current) {
        pedidoClienteRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => pedidoClienteRef.current?.focus(), 50);
      } else if (primeiroIndiceItemInvalido !== null) {
        const refQtd = pedidoQtdRefs.current[primeiroIndiceItemInvalido];
        if (refQtd) {
          refQtd.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => refQtd.focus(), 50);
        }
      }
      return;
    }

    salvandoRef.current = true;
    setIsSaving(true);
    setErrosPedido({});
    setAvisoValidacaoPedido(null);

    try {
      const clienteObj = contatos.find((c) => c.id === novoPedidoForm.clienteId || c.nome === novoPedidoForm.clienteId);
      const nomeClienteFinal = clienteObj?.nome || novoPedidoForm.clienteId;

      let valorTotalCalculado = 0;
      let totalToneladasNum = 0;
      const descricoesItens: string[] = [];
      const itensVendaResultado: ItemVendaPedido[] = [];

      const novoEstoque = [...estoque];

      for (const itemForm of novoPedidoForm.itens) {
        const prodIndex = novoEstoque.findIndex((e) => e.id === itemForm.estoqueId);
        if (prodIndex >= 0) {
          const prod = novoEstoque[prodIndex];
          const qtdNum = parseFloat(itemForm.quantidade) || 1;
          const sub = qtdNum * prod.preco_unitario;

          valorTotalCalculado += sub;
          if (prod.unidade_medida === 'toneladas') {
            totalToneladasNum += qtdNum;
          } else {
            totalToneladasNum += (qtdNum * 30) / 1000;
          }

          descricoesItens.push(`${prod.nome} (${qtdNum} ${prod.unidade_medida})`);
          itensVendaResultado.push({
            estoque_id: prod.id,
            nome_produto: prod.nome,
            quantidade: qtdNum,
            unidade_medida: prod.unidade_medida,
            preco_unitario: prod.preco_unitario,
            subtotal: sub,
          });

          // Dar baixa automática no Estoque apenas se for novo pedido!
          if (!editingPedidoId) {
            novoEstoque[prodIndex] = {
              ...prod,
              quantidade_disponivel: Math.max(0, prod.quantidade_disponivel - qtdNum),
            };
          }
        }
      }

      const dias = parseInt(novoPedidoForm.diasEstoqueFim) || 30;
      const dPrevisao = new Date();
      dPrevisao.setDate(dPrevisao.getDate() + dias);
      const dataPrevisaoStr = dPrevisao.toISOString().split('T')[0];

      if (editingPedidoId) {
        const idPedNorm = normalizarId(editingPedidoId);
        const pedExistente = pedidos.find((p) => p.id === editingPedidoId || p.id === idPedNorm);
        const updatedPed: Pedido = {
          ...pedExistente,
          id: idPedNorm,
          contato_id: clienteObj?.id || null,
          terceiro_id: novoPedidoForm.terceiroId || null,
          nome_cliente: nomeClienteFinal,
          produto: descricoesItens.join(' + ') || 'Silagem',
          quantidade: descricoesItens.join(', '),
          quantidade_toneladas_num: totalToneladasNum,
          itens_venda: itensVendaResultado,
          valor_total: valorTotalCalculado,
          data_compra: novoPedidoForm.dataCompra || hojeStr,
          data_previsao_fim_estoque: dataPrevisaoStr,
          status_financeiro: novoPedidoForm.statusFinanceiro,
          tipo_operacao: pedExistente?.tipo_operacao || 'venda',
          observacao: novoPedidoForm.observacao || null,
        };

        const novaLista = pedidos.map((p) => (p.id === editingPedidoId || p.id === idPedNorm ? updatedPed : p));
        setPedidos(novaLista);

        if (typeof window !== 'undefined') {
          localStorage.setItem('caboclo_pedidos', JSON.stringify(novaLista));
        }

        setEditingPedidoId(null);
        setIsNovoPedidoModalOpen(false);
        setStatus('✅ Pedido atualizado com sucesso!');

        await salvarPedidoNoBanco(updatedPed);
        setTimeout(() => setStatus('Pronto para gravar'), 2000);
        return;
      }

      const novoPed: Pedido = {
        id: gerarUuid(),
        contato_id: clienteObj?.id || null,
        terceiro_id: novoPedidoForm.terceiroId || null,
        nome_cliente: nomeClienteFinal,
        produto: descricoesItens.join(' + ') || 'Silagem',
        quantidade: descricoesItens.join(', '),
        quantidade_toneladas_num: totalToneladasNum,
        itens_venda: itensVendaResultado,
        valor_total: valorTotalCalculado,
        data_compra: novoPedidoForm.dataCompra || hojeStr,
        data_previsao_fim_estoque: dataPrevisaoStr,
        status_financeiro: novoPedidoForm.statusFinanceiro,
        tipo_operacao: 'venda',
        observacao: novoPedidoForm.observacao || null,
        created_at: new Date().toISOString(),
      };

      const novaListaPed = [novoPed, ...pedidos];
      setPedidos(novaListaPed);
      setEstoque(novoEstoque);

      if (typeof window !== 'undefined') {
        localStorage.setItem('caboclo_pedidos', JSON.stringify(novaListaPed));
        localStorage.setItem('caboclo_estoque', JSON.stringify(novoEstoque));
      }

      setIsNovoPedidoModalOpen(false);
      setStatus('✅ Pedido criado e estoque atualizado!');

      await salvarPedidoNoBanco(novoPed);
      await salvarEstoqueNoBanco(novoEstoque);
      setTimeout(() => setStatus('Pronto para gravar'), 2000);
    } finally {
      salvandoRef.current = false;
      setIsSaving(false);
    }
  };

  // Abrir Modal de Edição de Item do Estoque Existente
  const abrirEdicaoEstoque = (item: ItemEstoque) => {
    setEditingEstoqueId(item.id);
    setErrosEstoque({});
    setAvisoValidacaoEstoque(null);
    setNovoItemEstoqueForm({
      nome: item.nome,
      quantidade: String(item.quantidade_disponivel),
      unidade: item.unidade_medida,
      preco: String(item.preco_unitario),
      alerta: String(item.alerta_minimo),
      observacao: item.observacao || '',
    });
    setIsNovoItemEstoqueModalOpen(true);
  };

  // Excluir Item do Estoque
  const excluirItemEstoque = async (id: string) => {
    if (!confirm('Deseja realmente excluir este produto do estoque?')) return;

    const novaLista = estoque.filter((item) => item.id !== id);
    setEstoque(novaLista);

    if (typeof window !== 'undefined') {
      localStorage.setItem('caboclo_estoque', JSON.stringify(novaLista));
    }

    await salvarEstoqueNoBanco(novaLista);
  };

  const salvarNovoItemEstoque = async () => {
    if (salvandoRef.current) return;

    const novosErrosE: Record<string, string> = {};
    const faltantesE: string[] = [];

    if (!novoItemEstoqueForm.nome.trim()) {
      novosErrosE.nome = 'Informe o nome do produto (obrigatório)';
      faltantesE.push('Nome do Produto');
    }
    if (!novoItemEstoqueForm.quantidade.trim() || isNaN(parseFloat(novoItemEstoqueForm.quantidade))) {
      novosErrosE.quantidade = 'Informe a quantidade (obrigatório)';
      faltantesE.push('Quantidade Inicial');
    }
    if (!novoItemEstoqueForm.preco.trim() || isNaN(parseFloat(novoItemEstoqueForm.preco))) {
      novosErrosE.preco = 'Informe o preço unitário (obrigatório)';
      faltantesE.push('Preço Unitário');
    }

    if (Object.keys(novosErrosE).length > 0) {
      setErrosEstoque(novosErrosE);
      setAvisoValidacaoEstoque(
        `Preencha os campos obrigatórios destacados em vermelho: ${faltantesE.join(', ')}.`
      );

      const alvoRef = novosErrosE.nome
        ? estoqueNomeRef.current
        : novosErrosE.quantidade
        ? estoqueQtdRef.current
        : estoquePrecoRef.current;

      if (alvoRef) {
        alvoRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => alvoRef.focus(), 50);
      }
      return;
    }

    salvandoRef.current = true;
    setIsSaving(true);
    setErrosEstoque({});
    setAvisoValidacaoEstoque(null);

    try {
      let novaListaEstoque: ItemEstoque[] = [];

      if (editingEstoqueId) {
        novaListaEstoque = estoque.map((item) =>
          item.id === editingEstoqueId
            ? {
                ...item,
                nome: novoItemEstoqueForm.nome.trim(),
                quantidade_disponivel: parseFloat(novoItemEstoqueForm.quantidade) || 0,
                unidade_medida: novoItemEstoqueForm.unidade || 'toneladas',
                preco_unitario: parseFloat(novoItemEstoqueForm.preco) || 0,
                alerta_minimo: parseFloat(novoItemEstoqueForm.alerta) || 10,
                observacao: novoItemEstoqueForm.observacao || null,
              }
            : item
        );
        setEditingEstoqueId(null);
      } else {
        const novoItem: ItemEstoque = {
          id: `est-${Date.now()}`,
          nome: novoItemEstoqueForm.nome.trim(),
          quantidade_disponivel: parseFloat(novoItemEstoqueForm.quantidade) || 0,
          unidade_medida: novoItemEstoqueForm.unidade || 'toneladas',
          preco_unitario: parseFloat(novoItemEstoqueForm.preco) || 0,
          alerta_minimo: parseFloat(novoItemEstoqueForm.alerta) || 10,
          observacao: novoItemEstoqueForm.observacao || null,
        };
        novaListaEstoque = [novoItem, ...estoque];
      }

      setEstoque(novaListaEstoque);

      if (typeof window !== 'undefined') {
        localStorage.setItem('caboclo_estoque', JSON.stringify(novaListaEstoque));
      }

      setIsNovoItemEstoqueModalOpen(false);
      setNovoItemEstoqueForm({
        nome: '',
        quantidade: '',
        unidade: 'toneladas',
        preco: '',
        alerta: '10',
        observacao: '',
      });

      await salvarEstoqueNoBanco(novaListaEstoque);
    } finally {
      salvandoRef.current = false;
      setIsSaving(false);
    }
  };

  // Funções de Gerenciamento de Lembretes (Adiar, Excluir, Respondidos)
  const isLembreteAtivo = (id?: string) => {
    if (!id) return false;
    if (lembretesExcluidos.includes(id)) return false;
    if (lembretesRespondidos.some((r) => r.id === id)) return false;
    const dataAdiado = lembretesAdiados[id];
    if (dataAdiado && dataAdiado > hojeStr) return false;
    return true;
  };

  const adiarLembrete = (id: string | undefined, numDias: number) => {
    if (!id) return;
    const d = new Date();
    d.setDate(d.getDate() + numDias);
    const dataStr = d.toISOString().split('T')[0];

    const novosAdiados = { ...lembretesAdiados, [id]: dataStr };
    setLembretesAdiados(novosAdiados);
    if (typeof window !== 'undefined') {
      localStorage.setItem('caboclo_lembretes_adiados', JSON.stringify(novosAdiados));
    }
    setAdiarModal(null);
  };

  const excluirLembrete = (id?: string) => {
    if (!id) return;
    const novosExcluidos = [...lembretesExcluidos, id];
    setLembretesExcluidos(novosExcluidos);
    if (typeof window !== 'undefined') {
      localStorage.setItem('caboclo_lembretes_excluidos', JSON.stringify(novosExcluidos));
    }
  };

  const marcarComoRespondido = (
    id: string | undefined,
    nome: string,
    tipo: 'estoque' | 'prospect',
    detalhe: string
  ) => {
    if (!id) return;
    if (lembretesRespondidos.some((r) => r.id === id)) return;

    const dataHoraStr =
      new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
      ' às ' +
      new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const novoItem: LembreteRespondidoItem = {
      id,
      nome,
      tipo,
      detalhe,
      data_resposta: dataHoraStr,
    };

    const novosRespondidos = [novoItem, ...lembretesRespondidos];
    setLembretesRespondidos(novosRespondidos);
    if (typeof window !== 'undefined') {
      localStorage.setItem('caboclo_lembretes_respondidos', JSON.stringify(novosRespondidos));
    }
  };

  const restaurarLembreteRespondido = (id: string) => {
    const novosRespondidos = lembretesRespondidos.filter((r) => r.id !== id);
    setLembretesRespondidos(novosRespondidos);
    const novosExcluidos = lembretesExcluidos.filter((exId) => exId !== id);
    setLembretesExcluidos(novosExcluidos);
    const novosAdiados = { ...lembretesAdiados };
    delete novosAdiados[id];
    setLembretesAdiados(novosAdiados);

    if (typeof window !== 'undefined') {
      localStorage.setItem('caboclo_lembretes_respondidos', JSON.stringify(novosRespondidos));
      localStorage.setItem('caboclo_lembretes_excluidos', JSON.stringify(novosExcluidos));
      localStorage.setItem('caboclo_lembretes_adiados', JSON.stringify(novosAdiados));
    }
  };

  // WhatsApp Message Generator
  const abrirWhatsAppComMensagem = (
    nome: string,
    telefone?: string | null,
    tipoMensagem?: 'reordenar' | 'prospeccao' | 'frete_terceiro' | 'geral',
    detalhesPedido?: { data_compra?: string; produto?: string; quantidade?: string; endereco_fazenda?: string },
    lembreteInfo?: { id: string; tipo: 'estoque' | 'prospect'; detalhe: string }
  ) => {
    let msg = '';
    const dataCompraFormatada = detalhesPedido?.data_compra || 'recente';
    const prod = detalhesPedido?.produto || 'Silagem de Milho';
    const qtd = detalhesPedido?.quantidade || 'quantidade habitual';
    const end = detalhesPedido?.endereco_fazenda || 'na fazenda do cliente';

    if (tipoMensagem === 'reordenar') {
      msg = `Olá cliente parceiro ${nome}, vi que a sua última compra foi em ${dataCompraFormatada}. Pode ser que precise mais de nossos produtos! Gostaria de repetir a compra do produto: ${prod} (${qtd})?`;
    } else if (tipoMensagem === 'prospeccao') {
      msg = `Olá ${nome}, tudo bem? Vi que conversamos recentemente sobre a ${prod}. Gostaria de tirar dúvidas ou fechar o seu pedido de silagem hoje?`;
    } else if (tipoMensagem === 'frete_terceiro') {
      msg = `Olá parceiro ${nome}! Temos um frete de entrega de ${qtd} de ${prod} para levar em: ${end}. Seu caminhão tem disponibilidade para realizar essa entrega?`;
    } else {
      msg = `Olá ${nome}, tudo bem? Entro em contato da Caboclo Silagem sobre o seu atendimento. Como podemos te ajudar hoje?`;
    }

    if (lembreteInfo) {
      marcarComoRespondido(lembreteInfo.id, nome, lembreteInfo.tipo, lembreteInfo.detalhe);
    }

    setWhatsappModal({
      isOpen: true,
      telefone: telefone || '',
      mensagem: msg,
      nomeCliente: nome,
    });
  };

  const enviarWhatsApp = () => {
    const numLimpo = whatsappModal.telefone.replace(/\D/g, '');
    const numFinal = numLimpo ? (numLimpo.startsWith('55') ? numLimpo : `55${numLimpo}`) : '';
    const linkWA = numFinal
      ? `https://wa.me/${numFinal}?text=${encodeURIComponent(whatsappModal.mensagem)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappModal.mensagem)}`;

    window.open(linkWA, '_blank');
    setWhatsappModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Alternar Status Financeiro (Pago / Pendente)
  const alternarStatusFinanceiro = async (pedidoId: string) => {
    let pedidoAlterado: Pedido | null = null;
    const novosPedidos = pedidos.map((p) => {
      if (p.id === pedidoId) {
        const novoStatus: StatusFinanceiro = p.status_financeiro === 'pago' ? 'pendente' : 'pago';
        pedidoAlterado = { ...p, status_financeiro: novoStatus };
        return pedidoAlterado;
      }
      return p;
    });

    setPedidos(novosPedidos);

    if (typeof window !== 'undefined') {
      localStorage.setItem('caboclo_pedidos', JSON.stringify(novosPedidos));
    }

    if (pedidoAlterado) {
      await salvarPedidoNoBanco(pedidoAlterado);
    }
  };

  const terceirosTransportadores = contatos.filter((c) => c.tipo === 'terceiro');

  const limiteSeteDias = new Date();
  limiteSeteDias.setDate(limiteSeteDias.getDate() + 7);
  const limiteSeteDiasStr = limiteSeteDias.toISOString().split('T')[0];

  const lembretesEstoqueSemana = pedidos.filter(
    (p) => p.data_previsao_fim_estoque && p.data_previsao_fim_estoque <= limiteSeteDiasStr && isLembreteAtivo(p.id)
  );
  const lembretesProspectsSemana = contatos.filter(
    (c) => c.status_crm === 'possibilidade' && isLembreteAtivo(c.id)
  );

  const contatosFiltrados = contatos.filter((c) => {
    if (filtroContato === 'todos') return true;
    if (filtroContato === 'possibilidade') return c.status_crm === 'possibilidade';
    return c.tipo === filtroContato;
  });

  const totalVendas = pedidos
    .filter((p) => p.tipo_operacao === 'venda')
    .reduce((acc, curr) => acc + (curr.valor_total || 0), 0);

  const totalCompras = pedidos
    .filter((p) => p.tipo_operacao === 'compra')
    .reduce((acc, curr) => acc + (curr.valor_total || 0), 0);

  // Cálculos Financeiros por Período
  const hoje = new Date();
  const mesAtualNum = hoje.getMonth();
  const anoAtualNum = hoje.getFullYear();

  const pedidosVendaPeriodo = pedidos.filter((p) => {
    if (p.tipo_operacao !== 'venda') return false;
    if (filtroPeriodoFinanceiro === 'todos') return true;

    const dataP = new Date(p.data_compra);
    if (isNaN(dataP.getTime())) return true;

    if (filtroPeriodoFinanceiro === 'mes_atual') {
      return dataP.getMonth() === mesAtualNum && dataP.getFullYear() === anoAtualNum;
    }
    if (filtroPeriodoFinanceiro === '30dias') {
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
      return dataP >= trintaDiasAtras;
    }
    if (filtroPeriodoFinanceiro === 'ano_atual') {
      return dataP.getFullYear() === anoAtualNum;
    }
    return true;
  });

  const totalVendasPeriodo = pedidosVendaPeriodo.reduce((acc, p) => acc + (p.valor_total || 0), 0);
  const totalToneladasPeriodo = pedidosVendaPeriodo.reduce((acc, p) => acc + (p.quantidade_toneladas_num || 0), 0);
  const ticketMedioPeriodo = pedidosVendaPeriodo.length > 0 ? totalVendasPeriodo / pedidosVendaPeriodo.length : 0;

  // Agrupamento de Vendas por Cliente
  const vendasAgrupadasPorCliente = useMemo(() => {
    const mapa = new Map<
      string,
      {
        nomeCliente: string;
        totalComprado: number;
        totalQtdTon: number;
        qtdPedidos: number;
        ultimoPedidoData: string | null;
        ultimoProduto: string | null;
      }
    >();

    pedidos.forEach((p) => {
      if (p.tipo_operacao !== 'venda') return;

      const key = p.nome_cliente || 'Cliente Diversos';
      const atual = mapa.get(key) || {
        nomeCliente: key,
        totalComprado: 0,
        totalQtdTon: 0,
        qtdPedidos: 0,
        ultimoPedidoData: null,
        ultimoProduto: null,
      };

      mapa.set(key, {
        nomeCliente: key,
        totalComprado: atual.totalComprado + (p.valor_total || 0),
        totalQtdTon: atual.totalQtdTon + (p.quantidade_toneladas_num || 0),
        qtdPedidos: atual.qtdPedidos + 1,
        ultimoPedidoData: atual.ultimoPedidoData || p.data_compra,
        ultimoProduto: atual.ultimoProduto || p.produto,
      });
    });

    return Array.from(mapa.values()).sort((a, b) => b.totalComprado - a.totalComprado);
  }, [pedidos]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col pb-24">
      {/* Banner Off-line quando sem sinal de internet */}
      {!isOnline && (
        <div className="bg-amber-950/90 text-amber-200 border-b border-amber-800/80 px-3 py-1.5 text-center text-xs font-semibold flex items-center justify-center gap-1.5 sticky top-0 z-40">
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Modo Off-line — Dados e rascunhos guardados no aparelho. Sincroniza ao reconectar!</span>
        </div>
      )}

      {/* Header com Botões de Ação */}
      <header className="w-full bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white p-1 rounded-xl shadow shrink-0 overflow-hidden w-9 h-9 flex items-center justify-center border border-slate-700">
              <img src="/logo.png" alt="Logo Caboclo" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                Caboclo Agro CRM
                {isOnline ? (
                  <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded font-normal" title="Conectado à internet">
                    <Wifi className="w-2.5 h-2.5" /> On
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[9px] bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.2 rounded font-normal" title="Modo sem internet">
                    <WifiOff className="w-2.5 h-2.5" /> Off
                  </span>
                )}
              </h1>
              <span className="text-[10px] text-emerald-400 font-medium">Gestão e Otimização Inteligente</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* BOTÃO MANUAL DE USO (PDF) */}
            <a
              href="/manual-de-uso.html"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
              title="Abrir Manual de Uso e salvar em PDF"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Manual</span>
            </a>

            {/* BOTÃO RASCUNHOS COM BADGE DE CONTAGEM */}
            <button
              onClick={() => setIsRascunhosModalOpen(true)}
              className="relative bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
              title="Ver rascunhos salvos"
            >
              <Inbox className="w-3.5 h-3.5" /> Rascunhos
              {rascunhos.length > 0 && (
                <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ml-0.5">
                  {rascunhos.length}
                </span>
              )}
            </button>

            <button
              onClick={() => abrirCadastroManual('cliente')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow transition-all active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" /> + Cadastro
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal conforme Aba Ativa */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-4 flex flex-col gap-5">
        {/* PAINEL DE LEMBRETES DA SEMANA (Na aba central "Início") */}
        {activeTab === 'inicio' && (lembretesEstoqueSemana.length > 0 || lembretesProspectsSemana.length > 0 || lembretesRespondidos.length > 0) && (
          <div className="bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <BellRing className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>Lembretes da Semana</span>
              </div>
              
              {/* Abas do painel: pendentes vs respondidos */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setAbaLembretes('pendentes')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    abaLembretes === 'pendentes'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pendentes ({lembretesEstoqueSemana.length + lembretesProspectsSemana.length})
                </button>
                <button
                  onClick={() => setAbaLembretes('respondidos')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    abaLembretes === 'respondidos'
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Respondidos ({lembretesRespondidos.length})
                </button>
              </div>
            </div>

            {abaLembretes === 'pendentes' ? (
              <div className="space-y-2">
                {lembretesEstoqueSemana.length === 0 && lembretesProspectsSemana.length === 0 && (
                  <div className="text-center py-4 text-slate-400 text-xs italic">
                    🎉 Nenhum lembrete pendente para esta semana!
                  </div>
                )}

                {lembretesEstoqueSemana.map((p) => {
                  const c = contatos.find((cnt) => cnt.nome === p.nome_cliente);
                  return (
                    <div
                      key={p.id}
                      className="bg-slate-950/80 border border-amber-800/60 rounded-xl p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-white">{p.nome_cliente}</span>
                            <span className="text-[9px] bg-red-950 text-red-300 px-1.5 py-0.5 rounded uppercase font-bold">
                              Estoque Fim
                            </span>
                          </div>
                          <span className="text-[11px] text-amber-300 block font-medium">
                            Previsão: {p.data_previsao_fim_estoque}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {p.produto} ({p.quantidade})
                          </span>
                        </div>

                        <button
                          onClick={() => excluirLembrete(p.id)}
                          className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                          title="Excluir lembrete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-900">
                        <button
                          onClick={() => setAdiarModal({ id: p.id || '', nome: p.nome_cliente })}
                          className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Adiar por alguns dias"
                        >
                          <Clock className="w-3 h-3 text-amber-400" /> Adiar
                        </button>

                        <button
                          onClick={() =>
                            abrirWhatsAppComMensagem(
                              p.nome_cliente,
                              c?.telefone,
                              'reordenar',
                              {
                                data_compra: p.data_compra,
                                produto: p.produto || 'Silagem',
                                quantidade: p.quantidade || '10t',
                              },
                              {
                                id: p.id || '',
                                tipo: 'estoque',
                                detalhe: `${p.produto || 'Silagem'} (${p.quantidade || '10t'})`,
                              }
                            )
                          }
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow transition-colors"
                        >
                          <img src="/whatsapp.png" alt="WhatsApp" className="w-4 h-4 object-contain shrink-0" /> Whats
                        </button>
                      </div>
                    </div>
                  );
                })}

                {lembretesProspectsSemana.map((c) => (
                  <div
                    key={c.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white">{c.nome}</span>
                          <span className="text-[9px] bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded uppercase font-bold">
                            Prospect
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block italic">
                          &quot;{c.observacao || 'Aguardando retorno sobre orçamento'}&quot;
                        </span>
                      </div>

                      <button
                        onClick={() => excluirLembrete(c.id)}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                        title="Excluir lembrete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-900">
                      <button
                        onClick={() => setAdiarModal({ id: c.id || '', nome: c.nome })}
                        className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Adiar por alguns dias"
                      >
                        <Clock className="w-3 h-3 text-amber-400" /> Adiar
                      </button>

                      <button
                        onClick={() =>
                          abrirWhatsAppComMensagem(
                            c.nome,
                            c.telefone,
                            'prospeccao',
                            undefined,
                            {
                              id: c.id || '',
                              tipo: 'prospect',
                              detalhe: c.observacao || 'Orçamento pendente',
                            }
                          )
                        }
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow transition-colors"
                      >
                        <img src="/whatsapp.png" alt="WhatsApp" className="w-4 h-4 object-contain shrink-0" /> Whats
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {lembretesRespondidos.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-xs italic">
                    Nenhum lembrete respondido nesta semana ainda.
                  </div>
                ) : (
                  lembretesRespondidos.map((resp) => (
                    <div
                      key={resp.id}
                      className="bg-slate-950/80 border border-emerald-800/40 rounded-xl p-3 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white">{resp.nome}</span>
                          <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded font-bold uppercase flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> Respondido
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Contatado em {resp.data_resposta}
                        </span>
                        {resp.detalhe && (
                          <span className="text-[10px] text-slate-500 italic block">{resp.detalhe}</span>
                        )}
                      </div>

                      <button
                        onClick={() => restaurarLembreteRespondido(resp.id)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors shrink-0"
                        title="Restaurar para pendentes"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400" /> Restaurar
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ABA INÍCIO: LEMBRETES, VOZ & CLIMA */}
        {activeTab === 'inicio' && (
          <div className="flex flex-col gap-4">
            {/* 🔴 BARRA DE GRAVAÇÃO COMPACTA (Texto à esquerda, Botão à direita) */}
            <div className="w-full bg-slate-900 border border-emerald-500/40 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-lg">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                      status === '🎙️ Ouvindo...'
                        ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse'
                        : status === 'Processando com IA...'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                        : status === '📝 Salvo em Rascunhos'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                        : status === '✅ Salvo com sucesso!'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Dite pedidos, clientes ou fretes • Salva off-line
                </span>
              </div>

              {/* Botão de Gravação à Direita */}
              <button
                onClick={isRecording ? stopRecordingAndProcess : startRecording}
                disabled={status === 'Processando com IA...'}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition-transform active:scale-95 border cursor-pointer shrink-0 select-none ${
                  isRecording
                    ? 'bg-gradient-to-r from-red-600 to-rose-700 border-red-400 text-white animate-pulse'
                    : 'bg-gradient-to-r from-emerald-600 to-green-600 border-emerald-400 text-white hover:brightness-110'
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-4 h-4 fill-white" />
                    <span>Parar</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Gravar Voz</span>
                  </>
                )}
              </button>
            </div>

            {/* 🔵 WIDGET DE CLIMA & TEMPO AGRÍCOLA */}
            <div className="w-full bg-gradient-to-br from-sky-950/70 via-slate-900 to-slate-950 border border-sky-500/30 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-sky-900/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="bg-sky-500/20 p-2 rounded-xl text-sky-400">
                    <Sun className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-sky-400" /> {clima.cidade}
                    </h3>
                    <span className="text-[10px] text-sky-300 font-medium">{clima.condicao} • Clima Agro</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-extrabold text-white leading-none block">{clima.temp}°C</span>
                  <span className="text-[9px] text-emerald-400 font-bold uppercase">
                    {clima.chuvaProb <= 20 ? '☀️ Bom p/ Silagem' : '🌧️ Possibilidade de Chuva'}
                  </span>
                </div>
              </div>

              {/* Métricas do Tempo */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-950/80 border border-slate-800 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                    <Droplets className="w-3 h-3 text-sky-400" /> Umidade
                  </span>
                  <span className="font-bold text-sky-200 block text-xs mt-0.5">{clima.umidade}%</span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                    <CloudRain className="w-3 h-3 text-blue-400" /> Prob. Chuva
                  </span>
                  <span className="font-bold text-blue-200 block text-xs mt-0.5">{clima.chuvaProb}%</span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                    <Wind className="w-3 h-3 text-slate-400" /> Vento
                  </span>
                  <span className="font-bold text-slate-200 block text-xs mt-0.5">{clima.vento}</span>
                </div>
              </div>

              {/* Previsão Próximos Dias */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                {clima.previsaoDias.map((d, idx) => (
                  <div key={idx} className="flex-1 bg-slate-950/50 border border-slate-800/80 p-1.5 rounded-xl text-center text-[10px]">
                    <span className="text-slate-400 font-semibold block">{d.dia}</span>
                    <span className="text-base my-0.5 block">{d.icone}</span>
                    <span className="font-bold text-slate-200">{d.tempMax}°C</span>
                  </div>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="w-full bg-slate-900 border border-amber-600/60 rounded-xl p-3 flex items-start gap-2 text-amber-200 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* BOX DE TRANSCRIÇÃO + BOTÃO "SALVAR EM RASCUNHOS" */}
            {transcript && (
              <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase text-slate-400 block">
                    Transcrição da Voz
                  </span>
                  <button
                    onClick={() => salvarRascunho(transcript)}
                    className="bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/60 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" /> Salvar Rascunho
                  </button>
                </div>

                <p className="text-xs text-slate-200 italic bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  &quot;{transcript}&quot;
                </p>
              </div>
            )}

            {/* FORMULÁRIO DE CONFIRMAÇÃO DE VOZ */}
            {formData && !isManualModalOpen && (
              <div className="w-full bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 shadow-xl space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Edit3 className="w-4 h-4" />
                    <span>Conferir Dados Extraídos</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">
                    IA Extracted
                  </span>
                </div>

                {avisoValidacaoCadastro && (
                  <div className="bg-red-950/90 border border-red-500 text-red-200 rounded-xl p-2.5 text-xs flex items-start gap-2 animate-pulse">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span className="font-semibold">{avisoValidacaoCadastro}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Tipo</label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => {
                        setErrosCadastro({});
                        setAvisoValidacaoCadastro(null);
                        setFormData({ ...formData, tipo: e.target.value as TipoEntidade });
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                    >
                      <option value="cliente">👤 Cliente</option>
                      <option value="terceiro">🚚 Terceiro / Transportador</option>
                      <option value="funcionario">👨‍🌾 Funcionário</option>
                      <option value="fornecedor">🏢 Fornecedor</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Classificação</label>
                    <select
                      value={formData.status_crm}
                      onChange={(e) => setFormData({ ...formData, status_crm: e.target.value as StatusCRM })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                    >
                      <option value="possibilidade">❓ Possibilidade</option>
                      <option value="cliente_ativo">✅ Ativo</option>
                      <option value="parceiro">⭐ Parceiro</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className={`text-[10px] font-semibold block mb-0.5 ${errosCadastro.nome ? 'text-red-400' : 'text-slate-300'}`}>
                      Nome / Fazenda / Motorista *
                    </label>
                    <input
                      ref={vozNomeRef}
                      type="text"
                      value={formData.nome}
                      onChange={(e) => {
                        limparErroCampoCadastro('nome');
                        setFormData({ ...formData, nome: e.target.value });
                      }}
                      placeholder="Ex: João Paulo ou Sebastião Fretes"
                      className={`w-full bg-slate-950 border rounded-lg p-2 text-slate-100 outline-none transition-all ${
                        errosCadastro.nome
                          ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                          : 'border-slate-700 focus:border-emerald-500'
                      }`}
                    />
                    {errosCadastro.nome && (
                      <span className="text-[10px] text-red-400 font-semibold block mt-0.5">
                        ⚠️ {errosCadastro.nome}
                      </span>
                    )}
                  </div>

                  {formData.tipo === 'cliente' && (
                    <>
                      <div className="col-span-2">
                        <label className={`text-[10px] font-semibold block mb-0.5 ${errosCadastro.endereco_fazenda ? 'text-red-400' : 'text-slate-300'}`}>
                          Endereço da Fazenda *
                        </label>
                        <input
                          ref={vozEnderecoRef}
                          type="text"
                          value={formData.endereco_fazenda}
                          onChange={(e) => {
                            limparErroCampoCadastro('endereco_fazenda');
                            setFormData({ ...formData, endereco_fazenda: e.target.value });
                          }}
                          placeholder="Ex: BR-101 Km 45, Linhares"
                          className={`w-full bg-slate-950 border rounded-lg p-2 text-slate-100 outline-none transition-all ${
                            errosCadastro.endereco_fazenda
                              ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                              : 'border-slate-700 focus:border-emerald-500'
                          }`}
                        />
                        {errosCadastro.endereco_fazenda && (
                          <span className="text-[10px] text-red-400 font-semibold block mt-0.5">
                            ⚠️ {errosCadastro.endereco_fazenda}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Nº de Animais</label>
                        <input
                          type="text"
                          value={formData.quantidade_animais}
                          onChange={(e) => setFormData({ ...formData, quantidade_animais: e.target.value })}
                          placeholder="Ex: 120 cabeças"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                        />
                      </div>
                    </>
                  )}

                  {formData.tipo === 'terceiro' && (
                    <>
                      <div>
                        <label className={`text-[10px] font-semibold block mb-0.5 ${errosCadastro.capacidade_carga_toneladas ? 'text-red-400' : 'text-slate-300'}`}>
                          Carga Máx. (Toneladas) *
                        </label>
                        <input
                          ref={vozCapacidadeRef}
                          type="number"
                          value={formData.capacidade_carga_toneladas}
                          onChange={(e) => {
                            limparErroCampoCadastro('capacidade_carga_toneladas');
                            setFormData({ ...formData, capacidade_carga_toneladas: e.target.value });
                          }}
                          placeholder="Ex: 14"
                          className={`w-full bg-slate-950 border rounded-lg p-2 text-slate-100 outline-none transition-all ${
                            errosCadastro.capacidade_carga_toneladas
                              ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                              : 'border-slate-700 focus:border-amber-500'
                          }`}
                        />
                        {errosCadastro.capacidade_carga_toneladas && (
                          <span className="text-[10px] text-red-400 font-semibold block mt-0.5">
                            ⚠️ {errosCadastro.capacidade_carga_toneladas}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className={`text-[10px] font-semibold block mb-0.5 ${errosCadastro.tipo_veiculo ? 'text-red-400' : 'text-slate-300'}`}>
                          Tipo do Caminhão *
                        </label>
                        <input
                          ref={vozVeiculoRef}
                          type="text"
                          value={formData.tipo_veiculo}
                          onChange={(e) => {
                            limparErroCampoCadastro('tipo_veiculo');
                            setFormData({ ...formData, tipo_veiculo: e.target.value });
                          }}
                          placeholder="Ex: Truck 3 Eixos"
                          className={`w-full bg-slate-950 border rounded-lg p-2 text-slate-100 outline-none transition-all ${
                            errosCadastro.tipo_veiculo
                              ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                              : 'border-slate-700 focus:border-amber-500'
                          }`}
                        />
                        {errosCadastro.tipo_veiculo && (
                          <span className="text-[10px] text-red-400 font-semibold block mt-0.5">
                            ⚠️ {errosCadastro.tipo_veiculo}
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  <div>
                    <label className={`text-[10px] font-semibold block mb-0.5 ${errosCadastro.telefone ? 'text-red-400' : 'text-slate-300'}`}>
                      Telefone / WhatsApp *
                    </label>
                    <input
                      ref={vozTelefoneRef}
                      type="text"
                      value={formData.telefone}
                      onChange={(e) => {
                        limparErroCampoCadastro('telefone');
                        setFormData({ ...formData, telefone: e.target.value });
                      }}
                      placeholder="Ex: 27999887766"
                      className={`w-full bg-slate-950 border rounded-lg p-2 text-slate-100 outline-none transition-all ${
                        errosCadastro.telefone
                          ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                          : 'border-slate-700 focus:border-emerald-500'
                      }`}
                    />
                    {errosCadastro.telefone && (
                      <span className="text-[10px] text-red-400 font-semibold block mt-0.5">
                        ⚠️ {errosCadastro.telefone}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Produto / Pedido</label>
                    <input
                      type="text"
                      value={formData.produto}
                      onChange={(e) => setFormData({ ...formData, produto: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      setErrosCadastro({});
                      setAvisoValidacaoCadastro(null);
                      setFormData(null);
                    }}
                    className="flex-1 bg-slate-800 text-slate-300 py-2 rounded-lg font-semibold text-xs"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={salvarCadastroConfirmado}
                    disabled={isSaving}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1"
                  >
                    <Check className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Salvar Cadastro'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA CADASTRO (CLIENTES, POSSIBILIDADES, TERCEIROS, FORNECEDORES E FUNCIONÁRIOS) */}
        {activeTab === 'cadastro' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 px-1">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" /> Cadastros & Contatos ({contatosFiltrados.length})
                </h2>
                <p className="text-[11px] text-slate-500">
                  Clientes, possibilidades, terceiros/freteiros, fornecedores e equipe
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => abrirCadastroManual('terceiro')}
                  className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                  title="Cadastrar novo caminhoneiro / terceiro"
                >
                  <Truck className="w-3.5 h-3.5 text-amber-400" /> + Freteiro
                </button>
                <button
                  onClick={() => abrirCadastroManual(filtroContato === 'terceiro' ? 'terceiro' : 'cliente')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Novo
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'cliente', label: '👥 Clientes' },
                { id: 'possibilidade', label: '❓ Possibilidades' },
                { id: 'terceiro', label: '🚚 Terceiros' },
                { id: 'fornecedor', label: '🏢 Fornecedores' },
                { id: 'funcionario', label: '👨‍🌾 Funcionários' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFiltroContato(item.id)}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium border transition-all ${
                    filtroContato === item.id
                      ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              {contatosFiltrados.map((contato) => {
                const cId = contato.id || '';
                const isExpanded = !!contatosExpandidos[cId];
                const temDetalhes = !!(
                  contato.endereco_fazenda ||
                  contato.quantidade_animais ||
                  contato.observacao ||
                  contato.capacidade_carga_toneladas ||
                  contato.tipo_veiculo
                );

                return (
                  <div
                    key={cId}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2 hover:border-slate-700 transition-all shadow-sm"
                  >
                    {/* PARTE SUPERIOR CABEÇALHO */}
                    <div
                      className="flex items-start justify-between gap-2 cursor-pointer select-none"
                      onClick={() => temDetalhes && toggleExpandContato(cId)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">{contato.nome}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              contato.tipo === 'terceiro'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : contato.status_crm === 'possibilidade'
                                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            }`}
                          >
                            {contato.tipo === 'terceiro' ? 'Terceiro / Freteiro' : contato.tipo}
                          </span>
                          {contato.tipo === 'terceiro' && (
                            <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-[10px] font-extrabold font-mono">
                              {contato.capacidade_carga_toneladas || 10} Ton
                            </span>
                          )}
                        </div>
                        {contato.tipo === 'terceiro' && contato.tipo_veiculo && (
                          <span className="text-xs text-slate-400 block mt-0.5">
                            {contato.tipo_veiculo}
                            {contato.cidade ? ` • ${contato.cidade}` : ''}
                          </span>
                        )}
                        {contato.telefone && (
                          <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                            <Phone className="w-3 h-3 text-slate-500" /> {contato.telefone}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => abrirEdicaoContato(contato)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Editar cadastro"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" /> Editar
                        </button>

                        <button
                          onClick={() => excluirContato(cId || contato.nome)}
                          className="bg-slate-800 hover:bg-red-950 text-red-400 border border-slate-700 hover:border-red-800 p-1.5 rounded-lg text-xs transition-colors"
                          title="Excluir cadastro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() =>
                            contato.tipo === 'terceiro'
                              ? abrirWhatsAppComMensagem(
                                  contato.nome,
                                  contato.telefone,
                                  'frete_terceiro',
                                  {
                                    produto: 'Silagem de Milho',
                                    quantidade: '10 toneladas',
                                    endereco_fazenda: 'Fazenda Bela Vista (Vila Velha)',
                                  }
                                )
                              : abrirWhatsAppComMensagem(
                                  contato.nome,
                                  contato.telefone,
                                  contato.status_crm === 'possibilidade' ? 'prospeccao' : 'geral'
                                )
                          }
                          className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <img src="/whatsapp.png" alt="WhatsApp" className="w-4 h-4 object-contain shrink-0" />{' '}
                          {contato.tipo === 'terceiro' ? 'Cotar Frete' : 'Whats'}
                        </button>

                        {temDetalhes && (
                          <button
                            onClick={() => toggleExpandContato(cId)}
                            className="p-1 text-slate-400 hover:text-white transition-colors ml-0.5"
                            title={isExpanded ? 'Ocultar detalhes' : 'Ver mais detalhes'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* DETALHES EXPANDIDOS (Aparece somente quando clicado) */}
                    {isExpanded && temDetalhes && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-2 animate-fadeIn">
                        {contato.tipo === 'cliente' && (
                          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2.5 rounded-xl text-slate-300 border border-slate-850">
                            {contato.endereco_fazenda && (
                              <div className="col-span-2 flex items-center gap-1.5 text-emerald-300 font-medium">
                                <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                                <span>{contato.endereco_fazenda}</span>
                              </div>
                            )}
                            {contato.quantidade_animais && (
                              <div className="flex items-center gap-1.5 text-slate-300">
                                <Home className="w-3.5 h-3.5 text-slate-400" />
                                <span>{contato.quantidade_animais}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {contato.tipo === 'terceiro' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] bg-amber-950/40 border border-amber-800/40 p-2.5 rounded-xl text-amber-200">
                              <span className="font-semibold flex items-center gap-1">
                                <Truck className="w-3.5 h-3.5 text-amber-400" /> {contato.tipo_veiculo || 'Caminhão de Carga'}
                              </span>
                              <span className="bg-amber-900/60 px-2 py-0.5 rounded font-mono font-bold text-amber-300">
                                Capacidade: {contato.capacidade_carga_toneladas || 10}t
                              </span>
                            </div>
                            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs flex items-center justify-between">
                              <span className="text-slate-400 text-[11px]">Simulação p/ 10t de silagem:</span>
                              <span className="font-bold text-emerald-400">
                                {(contato.capacidade_carga_toneladas || 10) >= 10
                                  ? '1 viagem (Capacidade suficiente)'
                                  : `${Math.ceil(10 / (contato.capacidade_carga_toneladas || 5))} viagens necessárias`}
                              </span>
                            </div>
                          </div>
                        )}

                        {contato.observacao && (
                          <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl italic border border-slate-850">
                            &quot;{contato.observacao}&quot;
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {contatosFiltrados.length === 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs italic">
                  Nenhum cadastro encontrado para este filtro. Clique em &quot;+ Novo&quot; para cadastrar.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA PEDIDOS DE VENDA */}
        {activeTab === 'pedidos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 px-1">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" /> Pedidos de Venda ({pedidos.length})
                </h2>
                <p className="text-[11px] text-slate-500">
                  Controle de pedidos, entregas e alocação de freteiros
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingPedidoId(null);
                  setErrosPedido({});
                  setAvisoValidacaoPedido(null);
                  setNovoPedidoForm({
                    clienteId: '',
                    terceiroId: '',
                    itens: [{ estoqueId: estoque[0]?.id || 'est-1', quantidade: '10' }],
                    dataCompra: hojeStr,
                    diasEstoqueFim: '30',
                    statusFinanceiro: 'pendente',
                    observacao: '',
                  });
                  setIsNovoPedidoModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Pedido
              </button>
            </div>

            <div className="space-y-3">
              {pedidos.map((pedido) => {
                const clienteObj = contatos.find((c) => c.nome === pedido.nome_cliente || c.id === pedido.contato_id);
                const qtdTon = pedido.quantidade_toneladas_num || 10;

                return (
                  <div key={pedido.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{pedido.nome_cliente}</span>
                        <button
                          onClick={() => abrirEdicaoPedido(pedido)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors"
                          title="Editar pedido"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => pedido.id && excluirPedido(pedido.id)}
                          className="p-1 rounded bg-slate-800 hover:bg-red-950 text-red-400 transition-colors"
                          title="Excluir pedido"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">Data: {pedido.data_compra}</span>
                    </div>

                    <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <div className="flex items-center justify-between text-xs text-slate-200">
                        <span className="font-semibold text-emerald-400">🌾 {pedido.produto}</span>
                        <span className="font-bold text-emerald-300 text-sm">
                          {pedido.valor_total ? `R$ ${pedido.valor_total.toFixed(2)}` : 'R$ -'}
                        </span>
                      </div>

                      {pedido.quantidade && (
                        <span className="text-[11px] text-slate-400 block">Qtd: {pedido.quantidade}</span>
                      )}
                    </div>

                    {clienteObj?.endereco_fazenda && (
                      <div className="text-[11px] text-emerald-300 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{clienteObj.endereco_fazenda}</span>
                      </div>
                    )}

                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
                      <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5" /> Terceiros Disponíveis p/ Carga de {qtdTon}t:
                      </span>

                      <div className="space-y-1.5">
                        {terceirosTransportadores.map((t) => {
                          const cap = t.capacidade_carga_toneladas || 10;
                          const viagens = cap >= qtdTon ? 1 : Math.ceil(qtdTon / cap);
                          const podeLevarDireto = cap >= qtdTon;

                          return (
                            <div
                              key={t.id}
                              className="flex items-center justify-between text-xs p-2 bg-slate-900 rounded-lg border border-slate-850"
                            >
                              <div>
                                <span className="font-bold text-white block">{t.nome}</span>
                                <span className="text-[10px] text-slate-400">
                                  {t.tipo_veiculo} ({cap}t) •{' '}
                                  <strong className={podeLevarDireto ? 'text-emerald-400' : 'text-amber-400'}>
                                    {podeLevarDireto ? '1 viagem' : `${viagens} viagens`}
                                  </strong>
                                </span>
                              </div>

                              <button
                                onClick={() =>
                                  abrirWhatsAppComMensagem(
                                    t.nome,
                                    t.telefone,
                                    'frete_terceiro',
                                    {
                                      produto: pedido.produto || 'Silagem',
                                      quantidade: pedido.quantidade || '10t',
                                      endereco_fazenda: clienteObj?.endereco_fazenda || pedido.nome_cliente,
                                    }
                                  )
                                }
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1"
                              >
                                <img src="/whatsapp.png" alt="WhatsApp" className="w-3.5 h-3.5 object-contain shrink-0" /> Chamar
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ABA ESTOQUE */}
        {activeTab === 'estoque' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 px-1">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-sky-400" /> Controle de Estoque ({estoque.length})
                </h2>
                <p className="text-[11px] text-slate-500">
                  Saldo de silagem disponível, preços e alertas de reposição
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingEstoqueId(null);
                  setErrosEstoque({});
                  setAvisoValidacaoEstoque(null);
                  setNovoItemEstoqueForm({
                    nome: '',
                    quantidade: '',
                    unidade: 'toneladas',
                    preco: '',
                    alerta: '10',
                    observacao: '',
                  });
                  setIsNovoItemEstoqueModalOpen(true);
                }}
                className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Entrada Estoque
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900 border border-sky-500/30 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total de Produtos</span>
                  <span className="text-base font-extrabold text-sky-400">{estoque.length} itens</span>
                </div>
                <div className="bg-slate-900 border border-emerald-500/30 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Valor Total Estoque</span>
                  <span className="text-base font-extrabold text-emerald-400">
                    R$ {estoque.reduce((acc, i) => acc + (i.quantidade_disponivel * i.preco_unitario), 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {estoque.map((item) => {
                  const isBaixo = item.quantidade_disponivel <= item.alerta_minimo;
                  const isEsgotado = item.quantidade_disponivel <= 0;

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-md hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white block">{item.nome}</span>
                            <button
                              onClick={() => abrirEdicaoEstoque(item)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors"
                              title="Editar produto do estoque"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => excluirItemEstoque(item.id)}
                              className="p-1 rounded bg-slate-800 hover:bg-red-950 text-red-400 transition-colors"
                              title="Excluir produto do estoque"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-xs text-slate-400 font-mono">
                            Preço Unitário: R$ {item.preco_unitario.toFixed(2)} / {item.unidade_medida}
                          </span>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                            isEsgotado
                              ? 'bg-red-950 text-red-400 border-red-800'
                              : isBaixo
                              ? 'bg-amber-950 text-amber-400 border-amber-800 animate-pulse'
                              : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          }`}
                        >
                          {isEsgotado ? '❌ Esgotado' : isBaixo ? '⚠️ Estoque Baixo' : '✅ Disponível'}
                        </span>
                      </div>

                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Quantidade Atual:</span>
                        <span className="font-extrabold text-white text-sm font-mono">
                          {item.quantidade_disponivel} {item.unidade_medida}
                        </span>
                      </div>

                      {item.observacao && (
                        <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2 rounded-lg">
                          &quot;{item.observacao}&quot;
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ABA 5: FINANCEIRO */}
        {activeTab === 'financeiro' && (
          <div className="space-y-4">
            {/* Alternador de Visões: Período, Por Cliente, Lançamentos */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setSubAbaFinanceiro('periodo')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all text-center ${
                  subAbaFinanceiro === 'periodo'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📅 Por Período
              </button>
              <button
                onClick={() => setSubAbaFinanceiro('clientes')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all text-center ${
                  subAbaFinanceiro === 'clientes'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                👥 Por Cliente
              </button>
              <button
                onClick={() => setSubAbaFinanceiro('lancamentos')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all text-center ${
                  subAbaFinanceiro === 'lancamentos'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📜 Lançamentos
              </button>
            </div>

            {/* VISÃO 1: POR PERÍODO */}
            {subAbaFinanceiro === 'periodo' && (
              <div className="space-y-3.5">
                {/* Filtro por Tempo */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                  {[
                    { id: 'mes_atual', label: '📅 Este Mês' },
                    { id: '30dias', label: '🕒 Últimos 30 Dias' },
                    { id: 'ano_atual', label: '📊 Este Ano' },
                    { id: 'todos', label: '🌐 Todos os Períodos' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setFiltroPeriodoFinanceiro(item.id as any)}
                      className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium border transition-all ${
                        filtroPeriodoFinanceiro === item.id
                          ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                          : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Métricas do Período */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900 border border-emerald-500/40 p-3.5 rounded-2xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Faturamento Total
                    </span>
                    <span className="text-base font-extrabold text-emerald-400">
                      R$ {totalVendasPeriodo.toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-slate-900 border border-sky-500/40 p-3.5 rounded-2xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-sky-400" /> Volume Vendido
                    </span>
                    <span className="text-base font-extrabold text-sky-400">
                      {totalToneladasPeriodo.toFixed(1)} toneladas
                    </span>
                  </div>

                  <div className="bg-slate-900 border border-purple-500/40 p-3.5 rounded-2xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5 text-purple-400" /> Total Pedidos
                    </span>
                    <span className="text-base font-extrabold text-purple-400">
                      {pedidosVendaPeriodo.length} vendas
                    </span>
                  </div>

                  <div className="bg-slate-900 border border-amber-500/40 p-3.5 rounded-2xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Ticket Médio
                    </span>
                    <span className="text-base font-extrabold text-amber-400">
                      R$ {ticketMedioPeriodo.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Vendas do Período Listagem */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                    Vendas no Período ({pedidosVendaPeriodo.length})
                  </h3>
                  {pedidosVendaPeriodo.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs italic bg-slate-900/40 rounded-xl border border-slate-850">
                      Nenhuma venda registrada para este período.
                    </div>
                  ) : (
                    pedidosVendaPeriodo.map((p) => (
                      <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs shadow-sm">
                        <div>
                          <span className="font-bold text-white block">{p.nome_cliente}</span>
                          <span className="text-[11px] text-slate-400">
                            {p.produto} ({p.quantidade || `${p.quantidade_toneladas_num || 1}t`}) • {p.data_compra}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-emerald-400 block">
                            R$ {p.valor_total ? p.valor_total.toFixed(2) : '0.00'}
                          </span>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                            p.status_financeiro === 'pago'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}>
                            {p.status_financeiro === 'pago' ? 'PAGO' : 'PENDENTE'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* VISÃO 2: POR CLIENTE */}
            {subAbaFinanceiro === 'clientes' && (
              <div className="space-y-3">
                <div className="bg-slate-900 border border-sky-500/30 p-3.5 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Clientes Compradores</span>
                    <span className="text-base font-extrabold text-sky-400">{vendasAgrupadasPorCliente.length} clientes</span>
                  </div>
                  <span className="text-xs text-slate-400 italic">Ordenado por Maior Faturamento</span>
                </div>

                <div className="space-y-2.5">
                  {vendasAgrupadasPorCliente.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs italic bg-slate-900/40 rounded-xl border border-slate-850">
                      Nenhum faturamento por cliente registrado.
                    </div>
                  ) : (
                    vendasAgrupadasPorCliente.map((item, index) => {
                      const pctRepresentacao = totalVendas > 0 ? (item.totalComprado / totalVendas) * 100 : 0;

                      return (
                        <div key={index} className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center font-mono border border-slate-700">
                                #{index + 1}
                              </span>
                              <span className="font-bold text-sm text-white">{item.nomeCliente}</span>
                            </div>
                            <span className="font-extrabold text-emerald-400 text-sm font-mono">
                              R$ {item.totalComprado.toFixed(2)}
                            </span>
                          </div>

                          {/* Barra de Progresso da Porcentagem de Vendas */}
                          <div className="space-y-1">
                            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-850">
                              <div
                                className="bg-gradient-to-r from-emerald-500 to-green-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(5, pctRepresentacao))}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>{pctRepresentacao.toFixed(1)}% das vendas totais</span>
                              <span>{item.totalQtdTon.toFixed(1)} toneladas</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-850">
                            <span>🛒 {item.qtdPedidos} {item.qtdPedidos === 1 ? 'pedido' : 'pedidos'} efetuados</span>
                            <span className="text-slate-500 font-mono">Última: {item.ultimoPedidoData || 'Recente'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* VISÃO 3: LANÇAMENTOS GERAIS */}
            {subAbaFinanceiro === 'lancamentos' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 border border-emerald-500/30 p-3.5 rounded-2xl space-y-1">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">Total Vendas</span>
                    <span className="text-lg font-extrabold text-emerald-400">
                      R$ {totalVendas.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-1">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">Compras / Fornecedor</span>
                    <span className="text-lg font-extrabold text-slate-200">
                      R$ {totalCompras.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                    Lançamentos Financeiros ({pedidos.length})
                  </h2>
                  {pedidos.map((p) => (
                    <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs shadow-sm">
                      <div>
                        <span className="font-bold text-white block">{p.nome_cliente}</span>
                        <span className="text-[11px] text-slate-400">
                          {p.produto} • R$ {p.valor_total ? p.valor_total.toFixed(2) : '0.00'}
                        </span>
                      </div>

                      <button
                        onClick={() => p.id && alternarStatusFinanceiro(p.id)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer active:scale-95 ${
                          p.status_financeiro === 'pago'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800 hover:bg-emerald-900'
                            : 'bg-amber-950 text-amber-400 border-amber-800 hover:bg-amber-900'
                        }`}
                        title="Clique para alternar o status do pagamento"
                      >
                        {p.status_financeiro === 'pago' ? '✅ PAGO' : '⏳ PENDENTE'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL DE RASCUNHOS DE VOZ OFF-LINE */}
      {isRascunhosModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Inbox className="w-5 h-5 text-amber-400" />
                <span>Rascunhos de Voz ({rascunhos.length})</span>
              </div>
              <button onClick={() => setIsRascunhosModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {rascunhos.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                Nenhum rascunho de voz salvo no momento.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {rascunhos.map((r) => (
                  <div
                    key={r.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-mono text-amber-400">Gravado às {r.created_at}</span>
                      <button
                        onClick={() => excluirRascunho(r.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Excluir rascunho"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-200 italic leading-relaxed bg-slate-900 p-2 rounded-lg">
                      &quot;{r.texto}&quot;
                    </p>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => processAudioText(r.texto)}
                        className="flex-1 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Processar com IA
                      </button>
                      <button
                        onClick={() => cadastrarAPartirDoRascunho(r)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        <FileEdit className="w-3.5 h-3.5 text-emerald-400" /> Cadastrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setIsRascunhosModalOpen(false)}
              className="w-full bg-slate-800 text-slate-300 py-2 rounded-xl font-semibold text-xs"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO MANUAL DE REGISTROS */}
      {isManualModalOpen && formData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                {editingId ? <Edit3 className="w-5 h-5 text-amber-400" /> : <UserPlus className="w-5 h-5" />}
                <span>
                  {editingId ? 'Editar Cadastro Existente' : formData.tipo === 'terceiro' ? 'Novo Terceiro / Freteiro' : 'Novo Cadastro Manual'}
                </span>
              </div>
              <button
                onClick={() => {
                  setErrosCadastro({});
                  setAvisoValidacaoCadastro(null);
                  setIsManualModalOpen(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {avisoValidacaoCadastro && (
              <div className="bg-red-950/90 border border-red-500 text-red-200 rounded-xl p-2.5 text-xs flex items-start gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="font-semibold">{avisoValidacaoCadastro}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">Tipo de Registro</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => {
                    setErrosCadastro({});
                    setAvisoValidacaoCadastro(null);
                    setFormData({ ...formData, tipo: e.target.value as TipoEntidade });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                >
                  <option value="cliente">👤 Cliente</option>
                  <option value="terceiro">🚚 Terceiro / Freteiro</option>
                  <option value="funcionario">👨‍🌾 Funcionário</option>
                  <option value="fornecedor">🏢 Fornecedor</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">Classificação CRM</label>
                <select
                  value={formData.status_crm}
                  onChange={(e) => setFormData({ ...formData, status_crm: e.target.value as StatusCRM })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                >
                  <option value="possibilidade">❓ Possibilidade (Prospect)</option>
                  <option value="cliente_ativo">✅ Ativo / Disponível</option>
                  <option value="parceiro">⭐ Parceiro</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className={`text-[11px] font-semibold block mb-1 ${errosCadastro.nome ? 'text-red-400' : 'text-slate-300'}`}>
                  Nome / Fazenda / Motorista *
                </label>
                <input
                  ref={manualNomeRef}
                  type="text"
                  value={formData.nome}
                  onChange={(e) => {
                    limparErroCampoCadastro('nome');
                    setFormData({ ...formData, nome: e.target.value });
                  }}
                  placeholder="Ex: João Paulo ou Sebastião Fretes"
                  className={`w-full bg-slate-950 border rounded-lg p-2 text-slate-100 outline-none transition-all ${
                    errosCadastro.nome
                      ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                      : 'border-slate-700 focus:border-emerald-500'
                  }`}
                />
                {errosCadastro.nome && (
                  <span className="text-[10px] text-red-400 font-semibold block mt-1">
                    ⚠️ {errosCadastro.nome}
                  </span>
                )}
              </div>

              {formData.tipo === 'cliente' && (
                <>
                  <div className="col-span-2">
                    <label className={`text-[11px] font-semibold block mb-1 ${errosCadastro.endereco_fazenda ? 'text-red-400' : 'text-slate-300'}`}>
                      Endereço da Fazenda *
                    </label>
                    <input
                      ref={manualEnderecoRef}
                      type="text"
                      value={formData.endereco_fazenda}
                      onChange={(e) => {
                        limparErroCampoCadastro('endereco_fazenda');
                        setFormData({ ...formData, endereco_fazenda: e.target.value });
                      }}
                      placeholder="Ex: BR-101 Km 45, Linhares - ES"
                      className={`w-full bg-slate-950 border rounded-lg p-2 text-slate-100 outline-none transition-all ${
                        errosCadastro.endereco_fazenda
                          ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                          : 'border-slate-700 focus:border-emerald-500'
                      }`}
                    />
                    {errosCadastro.endereco_fazenda && (
                      <span className="text-[10px] text-red-400 font-semibold block mt-1">
                        ⚠️ {errosCadastro.endereco_fazenda}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">Qtd. de Animais</label>
                    <input
                      type="text"
                      value={formData.quantidade_animais}
                      onChange={(e) => setFormData({ ...formData, quantidade_animais: e.target.value })}
                      placeholder="Ex: 120 cabeças de gado"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                    />
                  </div>
                </>
              )}

              {formData.tipo === 'terceiro' && (
                <>
                  <div>
                    <label className={`text-[11px] font-semibold block mb-1 ${errosCadastro.capacidade_carga_toneladas ? 'text-red-400' : 'text-slate-300'}`}>
                      Capacidade (Toneladas) *
                    </label>
                    <input
                      ref={manualCapacidadeRef}
                      type="number"
                      value={formData.capacidade_carga_toneladas}
                      onChange={(e) => {
                        limparErroCampoCadastro('capacidade_carga_toneladas');
                        setFormData({ ...formData, capacidade_carga_toneladas: e.target.value });
                      }}
                      placeholder="Ex: 14"
                      className={`w-full bg-slate-950 border rounded-lg p-2 text-slate-100 outline-none transition-all ${
                        errosCadastro.capacidade_carga_toneladas
                          ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                          : 'border-slate-700 focus:border-amber-500'
                      }`}
                    />
                    {errosCadastro.capacidade_carga_toneladas && (
                      <span className="text-[10px] text-red-400 font-semibold block mt-1">
                        ⚠️ {errosCadastro.capacidade_carga_toneladas}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className={`text-[11px] font-semibold block mb-1 ${errosCadastro.tipo_veiculo ? 'text-red-400' : 'text-slate-300'}`}>
                      Tipo de Veículo / Caminhão *
                    </label>
                    <input
                      ref={manualVeiculoRef}
                      type="text"
                      value={formData.tipo_veiculo}
                      onChange={(e) => {
                        limparErroCampoCadastro('tipo_veiculo');
                        setFormData({ ...formData, tipo_veiculo: e.target.value });
                      }}
                      placeholder="Ex: Truck 3 Eixos, Carreta"
                      className={`w-full bg-slate-950 border rounded-lg p-2 text-slate-100 outline-none transition-all ${
                        errosCadastro.tipo_veiculo
                          ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                          : 'border-slate-700 focus:border-amber-500'
                      }`}
                    />
                    {errosCadastro.tipo_veiculo && (
                      <span className="text-[10px] text-red-400 font-semibold block mt-1">
                        ⚠️ {errosCadastro.tipo_veiculo}
                      </span>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className={`text-[11px] font-semibold block mb-1 ${errosCadastro.telefone ? 'text-red-400' : 'text-slate-300'}`}>
                  Telefone / WhatsApp *
                </label>
                <input
                  ref={manualTelefoneRef}
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => {
                    limparErroCampoCadastro('telefone');
                    setFormData({ ...formData, telefone: e.target.value });
                  }}
                  placeholder="Ex: 27999887766"
                  className={`w-full bg-slate-950 border rounded-lg p-2 text-slate-100 outline-none transition-all ${
                    errosCadastro.telefone
                      ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                      : 'border-slate-700 focus:border-emerald-500'
                  }`}
                />
                {errosCadastro.telefone && (
                  <span className="text-[10px] text-red-400 font-semibold block mt-1">
                    ⚠️ {errosCadastro.telefone}
                  </span>
                )}
              </div>

              {formData.tipo !== 'terceiro' && (
                <>
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">Valor Total (R$)</label>
                    <input
                      type="number"
                      value={formData.valor_total}
                      onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                      placeholder="Ex: 4500.00"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">Produto</label>
                    <input
                      type="text"
                      value={formData.produto}
                      onChange={(e) => setFormData({ ...formData, produto: e.target.value })}
                      placeholder="Ex: Silagem de Milho"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">Quantidade</label>
                    <input
                      type="text"
                      value={formData.quantidade}
                      onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                      placeholder="Ex: 10 toneladas"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                    />
                  </div>
                </>
              )}

              <div className="col-span-2">
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  placeholder="Notas adicionais..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {editingId && (
                <button
                  onClick={() => excluirContato(editingId)}
                  className="bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 p-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1"
                  title="Excluir este registro"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => {
                  setErrosCadastro({});
                  setAvisoValidacaoCadastro(null);
                  setIsManualModalOpen(false);
                }}
                className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={salvarCadastroConfirmado}
                disabled={isSaving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg"
              >
                <Check className="w-4 h-4" /> {isSaving ? 'Salvando...' : editingId ? 'Salvar Edição' : 'Salvar Cadastro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL WHATSAPP COM MENSAGEM PRÉ-PREENCHIDA */}
      {whatsappModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <img src="/whatsapp.png" alt="WhatsApp" className="w-5 h-5 object-contain shrink-0" />
                <span>Disparar WhatsApp</span>
              </div>
              <button onClick={() => setWhatsappModal((prev) => ({ ...prev, isOpen: false }))} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Telefone</label>
                <input
                  type="text"
                  value={whatsappModal.telefone}
                  onChange={(e) => setWhatsappModal({ ...whatsappModal, telefone: e.target.value })}
                  placeholder="Ex: 27999887766"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Mensagem Formatada</label>
                <textarea
                  rows={4}
                  value={whatsappModal.mensagem}
                  onChange={(e) => setWhatsappModal({ ...whatsappModal, mensagem: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setWhatsappModal((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={enviarWhatsApp}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg"
              >
                <img src="/whatsapp.png" alt="WhatsApp" className="w-4 h-4 object-contain shrink-0" /> Abrir WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADIAR LEMBRETE */}
      {adiarModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-xs w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Adiar Lembrete</span>
              </div>
              <button onClick={() => setAdiarModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Escolha por quanto tempo deseja adiar o lembrete de <strong className="text-white">{adiarModal.nome}</strong>:
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => adiarLembrete(adiarModal.id, 3)}
                className="bg-slate-800 hover:bg-amber-950 hover:border-amber-500/40 border border-slate-700 text-slate-200 p-2.5 rounded-xl font-bold transition-all text-center"
              >
                + 3 Dias
              </button>
              <button
                onClick={() => adiarLembrete(adiarModal.id, 7)}
                className="bg-slate-800 hover:bg-amber-950 hover:border-amber-500/40 border border-slate-700 text-slate-200 p-2.5 rounded-xl font-bold transition-all text-center"
              >
                + 7 Dias
              </button>
              <button
                onClick={() => adiarLembrete(adiarModal.id, 15)}
                className="bg-slate-800 hover:bg-amber-950 hover:border-amber-500/40 border border-slate-700 text-slate-200 p-2.5 rounded-xl font-bold transition-all text-center"
              >
                + 15 Dias
              </button>
              <button
                onClick={() => adiarLembrete(adiarModal.id, 30)}
                className="bg-slate-800 hover:bg-amber-950 hover:border-amber-500/40 border border-slate-700 text-slate-200 p-2.5 rounded-xl font-bold transition-all text-center"
              >
                + 30 Dias
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => setAdiarModal(null)}
                className="w-full bg-slate-800 text-slate-300 py-2 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO PEDIDO COM SELEÇÃO DE CLIENTE E ITENS DA VENDA */}
      {isNovoPedidoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <span>{editingPedidoId ? 'Editar Pedido de Venda' : 'Criar Novo Pedido de Venda'}</span>
              </div>
              <button
                onClick={() => {
                  setErrosPedido({});
                  setAvisoValidacaoPedido(null);
                  setIsNovoPedidoModalOpen(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {avisoValidacaoPedido && (
              <div className="bg-red-950/90 border border-red-500 text-red-200 rounded-xl p-2.5 text-xs flex items-start gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="font-semibold">{avisoValidacaoPedido}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* Seleção do Cliente */}
              <div>
                <label className={`text-[11px] font-semibold block mb-1 ${errosPedido.clienteId ? 'text-red-400' : 'text-slate-300'}`}>
                  1. Selecionar Cliente *
                </label>
                <select
                  ref={pedidoClienteRef}
                  value={novoPedidoForm.clienteId}
                  onChange={(e) => {
                    setErrosPedido((prev) => {
                      const c = { ...prev };
                      delete c.clienteId;
                      if (Object.keys(c).length === 0) setAvisoValidacaoPedido(null);
                      return c;
                    });
                    setNovoPedidoForm({ ...novoPedidoForm, clienteId: e.target.value });
                  }}
                  className={`w-full bg-slate-950 border rounded-xl p-2.5 text-slate-100 outline-none transition-all ${
                    errosPedido.clienteId
                      ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                      : 'border-slate-700 focus:border-emerald-500'
                  }`}
                >
                  <option value="">-- Selecione o Cliente Cadastrado --</option>
                  {contatos
                    .filter((c) => c.tipo === 'cliente' || c.status_crm === 'possibilidade')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        👤 {c.nome} {c.telefone ? `(${c.telefone})` : ''}
                      </option>
                    ))}
                </select>
                {errosPedido.clienteId && (
                  <span className="text-[10px] text-red-400 font-semibold block mt-1">
                    ⚠️ {errosPedido.clienteId}
                  </span>
                )}
              </div>

              {/* Itens do Pedido (Produtos do Estoque) */}
              <div className="space-y-2 border-t border-slate-800 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-slate-300 font-semibold block">2. Itens da Venda (Estoque) *</label>
                  <button
                    onClick={adicionarLinhaItemPedido}
                    className="text-emerald-400 hover:text-emerald-300 text-[10px] font-bold flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Adicionar Outro Item
                  </button>
                </div>

                {novoPedidoForm.itens.map((itemForm, idx) => {
                  const prodSel = estoque.find((e) => e.id === itemForm.estoqueId);
                  const subTotalLinha = (parseFloat(itemForm.quantidade) || 0) * (prodSel?.preco_unitario || 0);
                  const temErroItem = !!errosPedido[`item_${idx}`];

                  return (
                    <div
                      key={idx}
                      className={`bg-slate-950 p-2.5 rounded-xl border space-y-2 transition-all ${
                        temErroItem ? 'border-red-500 ring-2 ring-red-500/30' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <select
                          value={itemForm.estoqueId}
                          onChange={(e) => {
                            const nov = [...novoPedidoForm.itens];
                            nov[idx].estoqueId = e.target.value;
                            setNovoPedidoForm({ ...novoPedidoForm, itens: nov });
                          }}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs outline-none"
                        >
                          {estoque.map((est) => (
                            <option key={est.id} value={est.id}>
                              {est.nome} (R$ {est.preco_unitario.toFixed(2)}/{est.unidade_medida})
                            </option>
                          ))}
                        </select>

                        {novoPedidoForm.itens.length > 1 && (
                          <button
                            onClick={() => removerLinhaItemPedido(idx)}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="Remover item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <label className={`text-[10px] font-semibold ${temErroItem ? 'text-red-400' : 'text-slate-400'}`}>
                            Qtd *:
                          </label>
                          <input
                            ref={(el) => {
                              pedidoQtdRefs.current[idx] = el;
                            }}
                            type="number"
                            value={itemForm.quantidade}
                            onChange={(e) => {
                              setErrosPedido((prev) => {
                                const c = { ...prev };
                                delete c[`item_${idx}`];
                                if (Object.keys(c).length === 0) setAvisoValidacaoPedido(null);
                                return c;
                              });
                              const nov = [...novoPedidoForm.itens];
                              nov[idx].quantidade = e.target.value;
                              setNovoPedidoForm({ ...novoPedidoForm, itens: nov });
                            }}
                            className={`w-20 bg-slate-900 border rounded-lg p-1.5 text-center text-white outline-none font-bold ${
                              temErroItem ? 'border-red-500 bg-red-950/30' : 'border-slate-700'
                            }`}
                          />
                          <span className="text-[10px] text-slate-400">{prodSel?.unidade_medida}</span>
                        </div>

                        <span className="text-emerald-400 font-bold font-mono text-xs">
                          R$ {subTotalLinha.toFixed(2)}
                        </span>
                      </div>
                      {temErroItem && (
                        <span className="text-[10px] text-red-400 font-semibold block">
                          ⚠️ {errosPedido[`item_${idx}`]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Terceiro / Transportador */}
              <div className="border-t border-slate-800 pt-2">
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">3. Freteiro / Transportador (Opcional)</label>
                <select
                  value={novoPedidoForm.terceiroId}
                  onChange={(e) => setNovoPedidoForm({ ...novoPedidoForm, terceiroId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-100 outline-none"
                >
                  <option value="">-- Sem Freteiro / Retirada no Local --</option>
                  {terceirosTransportadores.map((t) => (
                    <option key={t.id} value={t.id}>
                      🚚 {t.nome} ({t.capacidade_carga_toneladas || 10}t - {t.tipo_veiculo})
                    </option>
                  ))}
                </select>
              </div>

              {/* Previsão Fim Estoque Cliente */}
              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">4. Previsão de Duração na Fazenda</label>
                <select
                  value={novoPedidoForm.diasEstoqueFim}
                  onChange={(e) => setNovoPedidoForm({ ...novoPedidoForm, diasEstoqueFim: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-100 outline-none"
                >
                  <option value="15">Estoque dura 15 dias</option>
                  <option value="30">Estoque dura 30 dias (1 mês)</option>
                  <option value="45">Estoque dura 45 dias</option>
                  <option value="60">Estoque dura 60 dias (2 meses)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setErrosPedido({});
                  setAvisoValidacaoPedido(null);
                  setIsNovoPedidoModalOpen(false);
                }}
                className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={salvarNovoPedido}
                disabled={isSaving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg"
              >
                <Check className="w-4 h-4" /> {isSaving ? 'Salvando...' : editingPedidoId ? 'Salvar Edição' : 'Concluir Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO ITEM NO ESTOQUE */}
      {isNovoItemEstoqueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-sky-500/40 rounded-2xl max-w-xs w-full p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <Package className="w-5 h-5 text-sky-400" />
                <span>{editingEstoqueId ? 'Editar Produto do Estoque' : 'Cadastrar Produto no Estoque'}</span>
              </div>
              <button
                onClick={() => {
                  setErrosEstoque({});
                  setAvisoValidacaoEstoque(null);
                  setIsNovoItemEstoqueModalOpen(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {avisoValidacaoEstoque && (
              <div className="bg-red-950/90 border border-red-500 text-red-200 rounded-xl p-2.5 text-xs flex items-start gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="font-semibold">{avisoValidacaoEstoque}</span>
              </div>
            )}

            <div className="space-y-2.5 text-xs">
              <div>
                <label className={`text-[11px] font-semibold block mb-1 ${errosEstoque.nome ? 'text-red-400' : 'text-slate-300'}`}>
                  Nome do Produto *
                </label>
                <input
                  ref={estoqueNomeRef}
                  type="text"
                  value={novoItemEstoqueForm.nome}
                  onChange={(e) => {
                    setErrosEstoque((prev) => {
                      const c = { ...prev };
                      delete c.nome;
                      if (Object.keys(c).length === 0) setAvisoValidacaoEstoque(null);
                      return c;
                    });
                    setNovoItemEstoqueForm({ ...novoItemEstoqueForm, nome: e.target.value });
                  }}
                  placeholder="Ex: Silagem de Milho"
                  className={`w-full bg-slate-950 border rounded-lg p-2 text-white outline-none transition-all ${
                    errosEstoque.nome
                      ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                      : 'border-slate-700 focus:border-sky-500'
                  }`}
                />
                {errosEstoque.nome && (
                  <span className="text-[10px] text-red-400 font-semibold block mt-1">
                    ⚠️ {errosEstoque.nome}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-[11px] font-semibold block mb-1 ${errosEstoque.quantidade ? 'text-red-400' : 'text-slate-300'}`}>
                    Qtd. Inicial *
                  </label>
                  <input
                    ref={estoqueQtdRef}
                    type="number"
                    value={novoItemEstoqueForm.quantidade}
                    onChange={(e) => {
                      setErrosEstoque((prev) => {
                        const c = { ...prev };
                        delete c.quantidade;
                        if (Object.keys(c).length === 0) setAvisoValidacaoEstoque(null);
                        return c;
                      });
                      setNovoItemEstoqueForm({ ...novoItemEstoqueForm, quantidade: e.target.value });
                    }}
                    placeholder="Ex: 100"
                    className={`w-full bg-slate-950 border rounded-lg p-2 text-white outline-none transition-all ${
                      errosEstoque.quantidade
                        ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                        : 'border-slate-700 focus:border-sky-500'
                    }`}
                  />
                  {errosEstoque.quantidade && (
                    <span className="text-[10px] text-red-400 font-semibold block mt-1">
                      ⚠️ {errosEstoque.quantidade}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">Unidade</label>
                  <select
                    value={novoItemEstoqueForm.unidade}
                    onChange={(e) => setNovoItemEstoqueForm({ ...novoItemEstoqueForm, unidade: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                  >
                    <option value="toneladas">Toneladas (t)</option>
                    <option value="sacos">Sacos</option>
                    <option value="kg">Quilos (kg)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-[11px] font-semibold block mb-1 ${errosEstoque.preco ? 'text-red-400' : 'text-slate-300'}`}>
                    Preço Unitário (R$) *
                  </label>
                  <input
                    ref={estoquePrecoRef}
                    type="number"
                    value={novoItemEstoqueForm.preco}
                    onChange={(e) => {
                      setErrosEstoque((prev) => {
                        const c = { ...prev };
                        delete c.preco;
                        if (Object.keys(c).length === 0) setAvisoValidacaoEstoque(null);
                        return c;
                      });
                      setNovoItemEstoqueForm({ ...novoItemEstoqueForm, preco: e.target.value });
                    }}
                    placeholder="Ex: 450.00"
                    className={`w-full bg-slate-950 border rounded-lg p-2 text-white outline-none transition-all ${
                      errosEstoque.preco
                        ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                        : 'border-slate-700 focus:border-sky-500'
                    }`}
                  />
                  {errosEstoque.preco && (
                    <span className="text-[10px] text-red-400 font-semibold block mt-1">
                      ⚠️ {errosEstoque.preco}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">Alerta Mínimo</label>
                  <input
                    type="number"
                    value={novoItemEstoqueForm.alerta}
                    onChange={(e) => setNovoItemEstoqueForm({ ...novoItemEstoqueForm, alerta: e.target.value })}
                    placeholder="Ex: 20"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setErrosEstoque({});
                  setAvisoValidacaoEstoque(null);
                  setIsNovoItemEstoqueModalOpen(false);
                }}
                className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={salvarNovoItemEstoque}
                disabled={isSaving}
                className="flex-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg"
              >
                <Check className="w-4 h-4" /> {isSaving ? 'Salvando...' : editingEstoqueId ? 'Salvar Edição' : 'Salvar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAVBAR MOBILE FOOTER */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 py-2 px-4 z-40 shadow-2xl">
        <div className="max-w-md mx-auto grid grid-cols-5 items-center">
          <button
            onClick={() => {
              setActiveTab('pedidos');
              if (isOnline) carregarTodosDados(true);
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'pedidos' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Pedidos</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('estoque');
              if (isOnline) carregarTodosDados(true);
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-semibold transition-colors relative cursor-pointer ${
              activeTab === 'estoque' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Estoque</span>
            {estoque.some((i) => i.quantidade_disponivel <= i.alerta_minimo) && (
              <span className="absolute top-0.5 right-4 w-2 h-2 rounded-full bg-amber-400" title="Alerta de estoque baixo" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('inicio');
              if (isOnline) carregarTodosDados(true);
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-bold transition-all relative cursor-pointer ${
              activeTab === 'inicio' ? 'text-emerald-400 scale-105' : 'text-slate-300 hover:text-white'
            }`}
          >
            <div
              className={`p-2 rounded-2xl border transition-all ${
                activeTab === 'inicio'
                  ? 'bg-emerald-600/25 border-emerald-500/60 text-emerald-400 shadow-md shadow-emerald-950/60'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300'
              }`}
            >
              <Home className="w-5 h-5" />
            </div>
            <span>Início</span>
            {(lembretesEstoqueSemana.length > 0 || lembretesProspectsSemana.length > 0) && (
              <span className="absolute top-0 right-4 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('cadastro');
              if (isOnline) carregarTodosDados(true);
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'cadastro' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Cadastro</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('financeiro');
              if (isOnline) carregarTodosDados(true);
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'financeiro' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span>Financeiro</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
