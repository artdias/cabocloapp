'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  supabase,
  Contato,
  Pedido,
  ItemEstoque,
  CustoExtraPedido,
  isSupabaseConfigured,
  gerarUuid,
  parseContatosDoBanco,
  parsePedidosDoBanco,
  salvarPedidoNoBanco,
  carregarEstoqueDoBanco,
  salvarEstoqueNoBanco,
  comprimirFotoCaminhao,
} from '@/lib/supabase';
import {
  Truck,
  Package,
  User,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Scale,
  MapPin,
  RefreshCw,
  Check,
  X,
  ClipboardCheck,
  AlertTriangle,
  Plus,
  Trash2,
  Eye,
  Wifi,
  WifiOff,
  Phone,
} from 'lucide-react';

export default function TelaExclusivaPatioFuncionarios() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const [filtroStatus, setFiltroStatus] = useState<'pendentes' | 'hoje' | 'carregados' | 'todos'>('pendentes');
  const [filtroFuncionario, setFiltroFuncionario] = useState<string>('todos');

  // Modal de confirmação de carga com foto do caminhão + nome do funcionário e observação
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [nomeFuncionarioCarga, setNomeFuncionarioCarga] = useState<string>('');
  const [toneladasReal, setToneladasReal] = useState<string>('');
  const [sacosReal, setSacosReal] = useState<string>('');
  const [fotoCaminhao, setFotoCaminhao] = useState<string | null>(null);
  const [custosExtras, setCustosExtras] = useState<CustoExtraPedido[]>([]);
  const [observacaoCarga, setObservacaoCarga] = useState<string>('');
  const [processandoFoto, setProcessandoFoto] = useState<boolean>(false);
  const [salvandoConfirmacao, setSalvandoConfirmacao] = useState<boolean>(false);
  const [avisoModal, setAvisoModal] = useState<string | null>(null);

  // Modal para ampliar foto do caminhão carregado
  const [fotoAmpliada, setFotoAmpliada] = useState<{ url: string; cliente: string; data?: string | null } | null>(null);

  const inputCameraRef = useRef<HTMLInputElement>(null);
  const hojeStr = new Date().toISOString().split('T')[0];

  const carregarDadosPatio = async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      // 1. Carrega cache local primeiro para resposta instantânea
      if (typeof window !== 'undefined') {
        const localPed = localStorage.getItem('caboclo_pedidos');
        if (localPed) {
          try {
            setPedidos(JSON.parse(localPed));
          } catch {}
        }
        const localCont = localStorage.getItem('caboclo_contatos');
        if (localCont) {
          try {
            setContatos(JSON.parse(localCont));
          } catch {}
        }
        const localEst = localStorage.getItem('caboclo_estoque');
        if (localEst) {
          try {
            setEstoque(JSON.parse(localEst));
          } catch {}
        }
      }

      // 2. Sincroniza do Supabase
      if (isSupabaseConfigured && navigator.onLine) {
        const [resContatos, resPedidos, estRemoto] = await Promise.all([
          supabase.from('contatos').select('*').order('created_at', { ascending: true }),
          supabase.from('pedidos').select('*').order('created_at', { ascending: true }),
          carregarEstoqueDoBanco(),
        ]);

        if (!resContatos.error && resContatos.data) {
          const listaCont = parseContatosDoBanco(resContatos.data);
          setContatos(listaCont);
          if (typeof window !== 'undefined') {
            localStorage.setItem('caboclo_contatos', JSON.stringify(listaCont));
          }
        }

        if (!resPedidos.error && resPedidos.data) {
          const listaPed = parsePedidosDoBanco(resPedidos.data);
          setPedidos(listaPed);
          if (typeof window !== 'undefined') {
            localStorage.setItem('caboclo_pedidos', JSON.stringify(listaPed));
          }
        }

        if (estRemoto !== null) {
          setEstoque(estRemoto);
          if (typeof window !== 'undefined') {
            localStorage.setItem('caboclo_estoque', JSON.stringify(estRemoto));
          }
        }
      }
    } catch (err) {
      console.warn('Erro ao sincronizar painel do pátio:', err);
    } finally {
      if (!silencioso) setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const params = new URLSearchParams(window.location.search);
      const funcParam = params.get('func');
      if (funcParam) {
        setFiltroFuncionario(funcParam);
      }

      const onOnline = () => {
        setIsOnline(true);
        carregarDadosPatio(true);
      };
      const onOffline = () => setIsOnline(false);

      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);

      carregarDadosPatio();
      const timer = setInterval(() => {
        if (navigator.onLine) carregarDadosPatio(true);
      }, 15000);

      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
        clearInterval(timer);
      };
    }
  }, []);

  const funcionarios = contatos.filter((c) => c.tipo === 'funcionario');
  const terceiros = contatos.filter((c) => c.tipo === 'terceiro');

  // Lista de pedidos de venda relevantes para o pátio
  const pedidosVenda = pedidos.filter((p) => p.tipo_operacao === 'venda');

  const pendentesCount = pedidosVenda.filter(
    (p) => p.etapa_pedido !== 'carregado'
  ).length;
  const hojeCount = pedidosVenda.filter(
    (p) => p.etapa_pedido !== 'carregado' && p.data_carregamento === hojeStr
  ).length;
  const carregadosCount = pedidosVenda.filter(
    (p) => p.etapa_pedido === 'carregado'
  ).length;

  const pedidosFiltrados = pedidosVenda
    .filter((p) => {
      if (filtroFuncionario !== 'todos' && p.funcionario_id !== filtroFuncionario) {
        return false;
      }
      if (filtroStatus === 'pendentes') {
        return p.etapa_pedido !== 'carregado';
      }
      if (filtroStatus === 'hoje') {
        return p.etapa_pedido !== 'carregado' && p.data_carregamento === hojeStr;
      }
      if (filtroStatus === 'carregados') {
        return p.etapa_pedido === 'carregado';
      }
      return true;
    })
    .sort((a, b) => {
      const dA = a.data_carregamento || a.data_compra || '9999-99-99';
      const dB = b.data_carregamento || b.data_compra || '9999-99-99';
      return dA.localeCompare(dB);
    });

  const abrirModalConfirmarCarga = (pedido: Pedido) => {
    const qtdEstimada = pedido.toneladas_real ?? pedido.quantidade_toneladas_num ?? 10;
    const ultimoNomeSalvo =
      typeof window !== 'undefined'
        ? localStorage.getItem('caboclo_nome_funcionario_patio') || ''
        : '';
    setPedidoSelecionado(pedido);
    setNomeFuncionarioCarga(pedido.nome_funcionario || ultimoNomeSalvo);
    setToneladasReal(String(qtdEstimada));
    setSacosReal(pedido.sacos_real != null ? String(pedido.sacos_real) : '');
    setFotoCaminhao(pedido.foto_caminhao_carregado || null);
    setCustosExtras(pedido.custos_extras ? [...pedido.custos_extras] : []);
    setObservacaoCarga(pedido.observacao || '');
    setAvisoModal(null);
  };

  const handleSelecionarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessandoFoto(true);
    setAvisoModal(null);
    try {
      const compressedDataUrl = await comprimirFotoCaminhao(file, 800, 0.65);
      setFotoCaminhao(compressedDataUrl);
    } catch {
      setAvisoModal('Não foi possível processar a foto. Tente outra imagem.');
    } finally {
      setProcessandoFoto(false);
    }
  };

  const adicionarChapaExtra = () => {
    setCustosExtras((prev) => [
      ...prev,
      {
        id: gerarUuid(),
        descricao: 'Chapa (Carregamento)',
        valor: 0,
        tipo: 'repassar_cliente',
      },
    ]);
  };

  const salvarConfirmacaoCargaComFoto = async () => {
    if (!pedidoSelecionado) return;
    if (!nomeFuncionarioCarga.trim()) {
      setAvisoModal('Por favor, informe o seu nome (Funcionário responsável pela carga).');
      return;
    }
    if (!fotoCaminhao) {
      setAvisoModal('Por favor, tire ou anexe uma foto do caminhão carregado para confirmar a carga!');
      return;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('caboclo_nome_funcionario_patio', nomeFuncionarioCarga.trim());
    }

    setSalvandoConfirmacao(true);
    try {
      const tonNum =
        pedidoSelecionado.toneladas_real ??
        pedidoSelecionado.quantidade_toneladas_num ??
        10;
      const sacosNum = pedidoSelecionado.sacos_real ?? null;

      const dataHoraConfirmacao =
        new Date().toLocaleDateString('pt-BR') +
        ' às ' +
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const funcCadastrado = funcionarios.find(
        (f) => f.nome.trim().toLowerCase() === nomeFuncionarioCarga.trim().toLowerCase()
      );

      const pedidoAtualizado: Pedido = {
        ...pedidoSelecionado,
        etapa_pedido: 'carregado',
        nome_funcionario: nomeFuncionarioCarga.trim(),
        funcionario_id: funcCadastrado?.id || pedidoSelecionado.funcionario_id || null,
        foto_caminhao_carregado: fotoCaminhao,
        data_confirmacao_carga: dataHoraConfirmacao,
        observacao: observacaoCarga.trim() || null,
        estoque_baixado: true,
      };

      // Atualiza estoque se ainda não tinha baixado
      if (!pedidoSelecionado.estoque_baixado && estoque.length > 0) {
        const novoEstoque = estoque.map((item) => {
          const fazParte =
            pedidoSelecionado.itens_venda?.some((iv) => iv.estoque_id === item.id) ||
            (pedidoSelecionado.produto &&
              pedidoSelecionado.produto.toLowerCase().includes(item.nome.toLowerCase()));
          if (!fazParte) return item;
          const qtdDescontar =
            item.unidade_medida === 'sacos' && sacosNum ? sacosNum : tonNum;
          return {
            ...item,
            quantidade_disponivel: Math.max(0, item.quantidade_disponivel - qtdDescontar),
          };
        });
        setEstoque(novoEstoque);
        if (typeof window !== 'undefined') {
          localStorage.setItem('caboclo_estoque', JSON.stringify(novoEstoque));
        }
        await salvarEstoqueNoBanco(novoEstoque);
      }

      const novaListaPedidos = pedidos.map((p) =>
        p.id === pedidoAtualizado.id ? pedidoAtualizado : p
      );
      setPedidos(novaListaPedidos);
      if (typeof window !== 'undefined') {
        localStorage.setItem('caboclo_pedidos', JSON.stringify(novaListaPedidos));
      }

      await salvarPedidoNoBanco(pedidoAtualizado);
      setPedidoSelecionado(null);
    } finally {
      setSalvandoConfirmacao(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      {/* Cabeçalho Exclusivo do Pátio / Funcionários */}
      <header className="w-full bg-slate-900 border-b border-amber-500/30 px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-white p-1 rounded-xl shadow shrink-0 w-9 h-9 flex items-center justify-center border border-slate-700">
              <img src="/logo.png" alt="Logo Caboclo" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold text-amber-300 truncate flex items-center gap-1.5">
                <span>👨‍🌾 Pátio & Carregamentos</span>
                {isOnline ? (
                  <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded font-normal">
                    <Wifi className="w-2.5 h-2.5" /> On
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[9px] bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.2 rounded font-normal">
                    <WifiOff className="w-2.5 h-2.5" /> Off
                  </span>
                )}
              </h1>
              <span className="text-[10px] text-slate-400 block truncate">
                Caboclo Silagem • Conferência de Carga e Foto do Caminhão
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => carregarDadosPatio()}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Filtros de Status (Pendentes em Destaque) */}
        <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setFiltroStatus('pendentes')}
            className={`py-2 px-1 rounded-xl text-center transition-all ${
              filtroStatus === 'pendentes'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⏳ Pendentes ({pendentesCount})
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus('hoje')}
            className={`py-2 px-1 rounded-xl text-center transition-all ${
              filtroStatus === 'hoje'
                ? 'bg-sky-600 text-white font-extrabold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔥 Hoje ({hojeCount})
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus('carregados')}
            className={`py-2 px-1 rounded-xl text-center transition-all ${
              filtroStatus === 'carregados'
                ? 'bg-emerald-600 text-white font-extrabold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ✅ Carregados ({carregadosCount})
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus('todos')}
            className={`py-2 px-1 rounded-xl text-center transition-all ${
              filtroStatus === 'todos'
                ? 'bg-slate-700 text-white font-extrabold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos ({pedidosVenda.length})
          </button>
        </div>

        {/* Filtro por Funcionário Responsável (se houver funcionários cadastrados) */}
        {funcionarios.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
            <span className="text-[11px] text-slate-400 font-semibold shrink-0">
              👨‍🌾 Filtrar Funcionário:
            </span>
            <select
              value={filtroFuncionario}
              onChange={(e) => setFiltroFuncionario(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white text-xs outline-none"
            >
              <option value="todos">Todos os Funcionários / Equipe Pátio</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>
                  👨‍🌾 {f.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Lista de Carregamentos */}
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
            Carregando carregamentos do pátio...
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
            <ClipboardCheck className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-xs font-bold text-white">
              Nenhum carregamento encontrado neste filtro!
            </p>
            <p className="text-[11px] text-slate-400">
              Use as abas acima para alternar entre Carregamentos Pendentes e Já Carregados.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {pedidosFiltrados.map((p) => {
              const isCarregado = p.etapa_pedido === 'carregado';
              const isHoje = p.data_carregamento === hojeStr;
              const motoristaObj = terceiros.find((t) => t.id === p.terceiro_id);
              const clienteObj = contatos.find(
                (c) => c.nome === p.nome_cliente || c.id === p.contato_id
              );

              return (
                <div
                  key={p.id}
                  className={`bg-slate-900 border rounded-2xl p-4 space-y-3 shadow-lg ${
                    isCarregado
                      ? 'border-emerald-600/50'
                      : isHoje
                      ? 'border-amber-500 ring-1 ring-amber-500/30'
                      : 'border-sky-500/40'
                  }`}
                >
                  {/* Topo: Status + Datas */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${
                          isCarregado
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : isHoje
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-sky-950 text-sky-300 border border-sky-700'
                        }`}
                      >
                        {isCarregado
                          ? '✅ CARGA CONFIRMADA'
                          : isHoje
                          ? '🔥 CARREGAR HOJE'
                          : '⏳ CARREGAMENTO PENDENTE'}
                      </span>

                      {p.nome_funcionario && (
                        <span className="text-[10px] bg-slate-800 text-amber-300 border border-slate-700 px-2 py-0.5 rounded-lg font-bold">
                          👨‍🌾 {p.nome_funcionario}
                        </span>
                      )}
                    </div>

                    <div className="text-right text-[10px] font-mono text-slate-300">
                      <span className="block text-amber-300 font-bold">
                        📅 Carregar: {p.data_carregamento || p.data_compra}
                      </span>
                      {p.data_entrega && (
                        <span className="block text-sky-300">
                          📍 Entrega: {p.data_entrega}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 1. PARA QUAL CLIENTE É */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                      <User className="w-3 h-3 text-emerald-400" /> 1. Para qual Cliente é:
                    </span>
                    <span className="text-sm font-extrabold text-white block">
                      {p.nome_cliente}
                    </span>
                    {clienteObj?.endereco_fazenda && (
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="text-[11px] text-slate-300 flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{clienteObj.endereco_fazenda}</span>
                        </span>
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
                  </div>

                  {/* 2. O QUE EMBALAR E CARREGAR (PRODUTO E QUANTIDADE EM DESTAQUE) */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/40 space-y-1.5">
                    <span className="text-[10px] text-emerald-300 uppercase font-extrabold flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-emerald-400" /> 2. O que Embalar e Carregar:
                    </span>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-white block">
                        🌾 {p.produto || 'Silagem'}
                      </span>
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 px-2.5 py-1 rounded-lg text-xs font-extrabold">
                        📦 Preparar: {p.quantidade || `${p.quantidade_toneladas_num || 10} toneladas`}
                      </span>
                    </div>
                    {p.itens_venda && p.itens_venda.length > 1 && (
                      <div className="pt-1 border-t border-slate-800/80 space-y-0.5 text-[11px] text-slate-300">
                        {p.itens_venda.map((iv, i) => (
                          <div key={i} className="flex justify-between">
                            <span>• {iv.nome_produto}</span>
                            <strong className="text-emerald-300">
                              {iv.quantidade} {iv.unidade_medida}
                            </strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3. QUEM VAI VIR BUSCAR PARA FAZER O FRETE + NÚMERO DO MOTORISTA */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/40 flex items-center justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] text-amber-300 uppercase font-extrabold flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-amber-400" /> 3. Quem vem buscar (Motorista / Frete):
                      </span>
                      {motoristaObj ? (
                        <>
                          <span className="text-sm font-extrabold text-white block truncate">
                            🚚 {motoristaObj.nome}
                          </span>
                          <span className="text-[11px] text-slate-300 block">
                            Veículo: <strong>{motoristaObj.tipo_veiculo || 'Caminhão'}</strong> (Capacidade:{' '}
                            {motoristaObj.capacidade_carga_toneladas || 10}t)
                          </span>
                          <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1 pt-0.5 font-mono">
                            <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>
                              Nº Motorista: {motoristaObj.telefone || 'Não informado'}
                            </span>
                          </span>
                        </>
                      ) : p.tem_frete === false ? (
                        <span className="text-xs font-bold text-slate-300 block">
                          🚜 Cliente retira com caminhão próprio na fazenda
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-400/90 block">
                          🚚 Motorista em definição / Consultar escritório
                        </span>
                      )}
                    </div>

                    {motoristaObj?.telefone && (
                      <a
                        href={`https://wa.me/55${motoristaObj.telefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1 shrink-0 shadow"
                      >
                        <Phone className="w-3.5 h-3.5" /> Whats
                      </a>
                    )}
                  </div>

                  {p.observacao && (
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 italic">
                      📝 Obs: &quot;{p.observacao}&quot;
                    </div>
                  )}

                  {/* FOTO DO CAMINHÃO CARREGADO (SE JÁ TIVER SIDO ENVIADA) */}
                  {p.foto_caminhao_carregado && (
                    <div className="bg-emerald-950/30 border border-emerald-700/50 rounded-xl p-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={p.foto_caminhao_carregado}
                          alt={`Caminhão carregado - ${p.nome_cliente}`}
                          onClick={() =>
                            setFotoAmpliada({
                              url: p.foto_caminhao_carregado!,
                              cliente: p.nome_cliente,
                              data: p.data_confirmacao_carga,
                            })
                          }
                          className="w-14 h-14 object-cover rounded-lg border border-emerald-500/60 cursor-pointer shrink-0 hover:opacity-90"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-emerald-300 block">
                            📸 Foto do Caminhão Registrada
                          </span>
                          {p.data_confirmacao_carga && (
                            <span className="text-[10px] text-slate-400 block">
                              Confirmado em {p.data_confirmacao_carga}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setFotoAmpliada({
                                url: p.foto_caminhao_carregado!,
                                cliente: p.nome_cliente,
                                data: p.data_confirmacao_carga,
                              })
                            }
                            className="text-[10px] text-sky-300 underline font-semibold mt-0.5 flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Ver foto ampliada
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BOTÃO PRINCIPAL: CONFIRMAR CARGA / ENTREGA COM FOTO DO CAMINHÃO */}
                  <button
                    type="button"
                    onClick={() => abrirModalConfirmarCarga(p)}
                    className={`w-full py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                      isCarregado
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        : 'bg-gradient-to-r from-amber-500 to-emerald-500 hover:brightness-110 text-slate-950'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    <span>
                      {isCarregado
                        ? '📸 Atualizar Foto do Caminhão / Peso da Carga'
                        : '📸 Confirmar Carga c/ Foto do Caminhão Carregado'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ===================================================================== */}
      {/* MODAL RESPONSIVO PARA CONFIRMAR CARGA E ANEXAR FOTO DO CAMINHÃO        */}
      {/* ===================================================================== */}
      {pedidoSelecionado && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden">
            {/* Cabeçalho fixo */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 shrink-0 bg-slate-900">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm min-w-0">
                <Camera className="w-5 h-5 shrink-0" />
                <span className="truncate">Confirmar Carga & Foto do Caminhão</span>
              </div>
              <button
                type="button"
                onClick={() => setPedidoSelecionado(null)}
                className="text-slate-400 hover:text-white p-1 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo rolável */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3.5 text-xs">
              {avisoModal && (
                <div className="bg-red-950/90 border border-red-500 text-red-200 rounded-xl p-2.5 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="font-semibold">{avisoModal}</span>
                </div>
              )}

              {/* Resumo do Pedido */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="font-extrabold text-white text-sm block">
                  Cliente: {pedidoSelecionado.nome_cliente}
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold block">
                  Carga solicitada: {pedidoSelecionado.produto} ({pedidoSelecionado.quantidade})
                </span>
              </div>

              {/* 1. FOTO DO CAMINHÃO CARREGADO (OBRIGATÓRIA PARA CONFIRMAÇÃO NO PÁTIO) */}
              <div className="space-y-2">
                <label className="text-[11px] text-amber-300 font-extrabold uppercase block">
                  1. Foto do Caminhão Carregado *
                </label>

                <input
                  ref={inputCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleSelecionarFoto}
                  className="hidden"
                />

                {fotoCaminhao ? (
                  <div className="bg-slate-950 border border-emerald-500/50 rounded-xl p-2.5 space-y-2 text-center">
                    <img
                      src={fotoCaminhao}
                      alt="Prévia do caminhão carregado"
                      className="w-full max-h-52 object-cover rounded-lg border border-slate-800 mx-auto"
                    />
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => inputCameraRef.current?.click()}
                        className="bg-slate-800 hover:bg-slate-700 text-amber-300 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1"
                      >
                        <Camera className="w-3.5 h-3.5" /> Trocar Foto
                      </button>
                      <button
                        type="button"
                        onClick={() => setFotoCaminhao(null)}
                        className="bg-red-950/60 hover:bg-red-900 text-red-300 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => inputCameraRef.current?.click()}
                    disabled={processandoFoto}
                    className="w-full bg-slate-950 hover:bg-slate-900 border-2 border-dashed border-amber-500/60 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-amber-300 transition-all cursor-pointer"
                  >
                    <Camera className="w-8 h-8 text-amber-400" />
                    <span className="font-extrabold text-xs">
                      {processandoFoto
                        ? 'Processando foto...'
                        : '📸 Tirar Foto do Caminhão Carregado (ou Escolher da Galeria)'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Toque aqui para abrir a câmera do celular
                    </span>
                  </button>
                )}
              </div>

              {/* 2. NOME DO FUNCIONÁRIO E OBSERVAÇÃO DA CARGA */}
              <div className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-3 space-y-3">
                <div>
                  <label className="text-[11px] text-amber-300 font-extrabold uppercase flex items-center gap-1 mb-1">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>2. Seu Nome (Funcionário que Concluiu a Carga) *</span>
                  </label>
                  <input
                    type="text"
                    value={nomeFuncionarioCarga}
                    onChange={(e) => setNomeFuncionarioCarga(e.target.value)}
                    placeholder="Digite seu nome (Ex: Carlos, João...)"
                    className="w-full bg-slate-900 border border-amber-500/50 rounded-xl p-2.5 text-white font-bold text-xs outline-none focus:border-amber-400"
                  />
                  {funcionarios.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {funcionarios.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setNomeFuncionarioCarga(f.nome)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                            nomeFuncionarioCarga === f.nome
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          👨‍🌾 {f.nome}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] text-slate-200 font-bold block mb-1">
                    📝 3. Alguma Observação da Carga / Caminhão (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={observacaoCarga}
                    onChange={(e) => setObservacaoCarga(e.target.value)}
                    placeholder="Digite aqui qualquer observação sobre o carregamento, lona, horário, sacaria..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white text-xs outline-none resize-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Rodapé fixo */}
            <div className="flex gap-2 px-4 py-3 border-t border-slate-800 bg-slate-900 shrink-0">
              <button
                type="button"
                onClick={() => setPedidoSelecionado(null)}
                className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarConfirmacaoCargaComFoto}
                disabled={salvandoConfirmacao || processandoFoto}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg"
              >
                <Check className="w-4 h-4" />
                <span>{salvandoConfirmacao ? 'Salvando...' : 'Confirmar Carga c/ Foto'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA VER FOTO DO CAMINHÃO EM TELA CHEIA */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-3 space-y-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-white block">
                  📸 Caminhão Carregado — {fotoAmpliada.cliente}
                </span>
                {fotoAmpliada.data && (
                  <span className="text-[10px] text-emerald-400 block">
                    Confirmado em {fotoAmpliada.data}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFotoAmpliada(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={fotoAmpliada.url}
              alt="Caminhão carregado ampliado"
              className="w-full max-h-[75dvh] object-contain rounded-xl bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
}
