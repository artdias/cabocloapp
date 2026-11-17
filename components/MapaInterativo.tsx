'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Contato } from '@/lib/supabase';
import {
  MapPin,
  Navigation,
  Search,
  ExternalLink,
  Compass,
  Layers,
  Crosshair,
  Edit3,
} from 'lucide-react';

// Coordenadas padrão: Montanha - ES (Base Agro Caboclo)
export const BASE_CABOCLO_COORDS = {
  lat: -18.1265,
  lng: -40.3633,
  nome: 'Base Agro Caboclo (Montanha - ES)',
};

// Fórmula de Haversine para calcular distância em KM entre dois pontos
export function calcularDistanciaKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Extrai coordenadas caso o usuário cole um link do Google Maps ou "-18.123, -40.361"
export function extrairCoordenadasDeTexto(texto: string): { lat: number; lng: number } | null {
  if (!texto) return null;
  // Padrão @-18.1234,-40.1234 ou q=-18.1234,-40.1234 ou par direto de decimais
  const match = texto.match(/(-?\d{1,2}\.\d{3,})\s*[,;\s]\s*(-?\d{1,3}\.\d{3,})/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
}

// Geocodificação gratuita via Nominatim (OpenStreetMap)
export async function buscarCoordenadasPorEndereco(
  endereco: string
): Promise<{ lat: number; lng: number; displayName?: string } | null> {
  const limpo = endereco.trim();
  if (!limpo) return null;

  const extraido = extrairCoordenadasDeTexto(limpo);
  if (extraido) return extraido;

  const tentativas = [
    limpo,
    limpo.toLowerCase().includes('es') || limpo.toLowerCase().includes('brasil')
      ? limpo
      : `${limpo}, Espírito Santo, Brasil`,
  ];

  for (const q of tentativas) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=1&q=${encodeURIComponent(
        q
      )}`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'pt-BR' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: data[0].display_name,
          };
        }
      }
    } catch {}
  }

  // Fallback para municípios conhecidos do ES/BA/MG se o endereço rural tiver Km/Córrego que o geocoder não achou de primeira
  const textoMin = limpo.toLowerCase();
  const cidadesConhecidas: Record<string, { lat: number; lng: number }> = {
    montanha: { lat: -18.1265, lng: -40.3633 },
    linhares: { lat: -19.3911, lng: -40.0722 },
    'vila velha': { lat: -20.4285, lng: -40.328 },
    viana: { lat: -20.3883, lng: -40.4945 },
    cachoeiro: { lat: -20.8489, lng: -41.1128 },
    colatina: { lat: -19.5394, lng: -40.6306 },
    'são mateus': { lat: -18.7161, lng: -39.8589 },
    'sao mateus': { lat: -18.7161, lng: -39.8589 },
    pinheiros: { lat: -18.4119, lng: -40.2172 },
    'nova venécia': { lat: -18.7106, lng: -40.4006 },
    'nova venecia': { lat: -18.7106, lng: -40.4006 },
    mucurici: { lat: -18.0933, lng: -40.5158 },
    nanuque: { lat: -17.8389, lng: -40.3539 },
    'pedro canário': { lat: -18.2975, lng: -39.9569 },
    'pedro canario': { lat: -18.2975, lng: -39.9569 },
  };

  for (const [cidade, coords] of Object.entries(cidadesConhecidas)) {
    if (textoMin.includes(cidade)) {
      return coords;
    }
  }

  return null;
}

// Carregador singleton do Leaflet via CDN no navegador
let leafletPromise: Promise<any> | null = null;

function carregarLeaflet(): Promise<any> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if ((window as any).L) return Promise.resolve((window as any).L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.getElementById('leaflet-css-cdn')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById('leaflet-js-cdn') as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve((window as any).L));
      return;
    }

    const script = document.createElement('script');
    script.id = 'leaflet-js-cdn';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve((window as any).L);
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });

  return leafletPromise;
}

function criarIconePin(L: any, corHex: string, emoji: string = '📍') {
  return L.divIcon({
    className: 'custom-caboclo-pin',
    html: `<div style="
      display:flex;
      align-items:center;
      justify-content:center;
      width:34px;
      height:34px;
      background:${corHex};
      border:2.5px solid #ffffff;
      border-radius:9999px 9999px 9999px 4px;
      transform:rotate(-45deg);
      box-shadow:0 4px 10px rgba(0,0,0,0.45);
    ">
      <span style="transform:rotate(45deg);font-size:15px;line-height:1;">${emoji}</span>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  });
}

// ============================================================================
// 1. COMPONENTE SELETOR DE ALFINETE NO CADASTRO / EDIÇÃO DO CLIENTE
// ============================================================================
interface SeletorAlfineteMapaProps {
  endereco: string;
  latitude: number | null;
  longitude: number | null;
  onChangeCoords: (lat: number, lng: number) => void;
}

export function SeletorAlfineteMapa({
  endereco,
  latitude,
  longitude,
  onChangeCoords,
}: SeletorAlfineteMapaProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const labelsLayerRef = useRef<any>(null);

  const [modoSatelite, setModoSatelite] = useState<boolean>(true);
  const [buscandoEndereco, setBuscandoEndereco] = useState<boolean>(false);
  const [statusBusca, setStatusBusca] = useState<string | null>(null);
  const [inputCoordenadaDireta, setInputCoordenadaDireta] = useState<string>('');

  const latAtual = latitude ?? BASE_CABOCLO_COORDS.lat;
  const lngAtual = longitude ?? BASE_CABOCLO_COORDS.lng;
  const temPinDefinido = latitude != null && longitude != null;

  useEffect(() => {
    let ativo = true;

    carregarLeaflet().then((L) => {
      if (!ativo || !L || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [latAtual, lngAtual],
          zoom: temPinDefinido ? 15 : 11,
          zoomControl: true,
        });

        mapInstanceRef.current = map;

        const iconeCliente = criarIconePin(L, '#059669', '📍');
        const marker = L.marker([latAtual, lngAtual], {
          draggable: true,
          icon: iconeCliente,
        }).addTo(map);

        markerRef.current = marker;

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onChangeCoords(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
          setStatusBusca('📍 Alfinete ajustado manualmente na localização exata!');
        });

        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          onChangeCoords(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
          setStatusBusca('📍 Alfinete fixado no ponto clicado!');
        });

        setTimeout(() => {
          map.invalidateSize();
        }, 200);
      }
    });

    return () => {
      ativo = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Alternar camada Satélite vs Mapa de Estradas
  useEffect(() => {
    carregarLeaflet().then((L) => {
      const map = mapInstanceRef.current;
      if (!L || !map) return;

      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }
      if (labelsLayerRef.current) {
        map.removeLayer(labelsLayerRef.current);
        labelsLayerRef.current = null;
      }

      if (modoSatelite) {
        tileLayerRef.current = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
            attribution: 'Esri Satellite',
          }
        ).addTo(map);

        labelsLayerRef.current = L.tileLayer(
          'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
          }
        ).addTo(map);
      } else {
        tileLayerRef.current = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            maxZoom: 19,
            attribution: '© OpenStreetMap',
          }
        ).addTo(map);
      }
    });
  }, [modoSatelite]);

  // Atualizar posição do marcador quando latitude/longitude mudam externamente
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && latitude != null && longitude != null) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.setView([latitude, longitude], Math.max(mapInstanceRef.current.getZoom(), 14));
    }
  }, [latitude, longitude]);

  const localizarPeloEnderecoDigitado = async () => {
    if (!endereco || !endereco.trim()) {
      setStatusBusca('⚠️ Digite primeiro o endereço ou cidade da fazenda acima.');
      return;
    }

    setBuscandoEndereco(true);
    setStatusBusca('🔍 Buscando localização pelo endereço...');
    try {
      const resultado = await buscarCoordenadasPorEndereco(endereco);
      if (resultado) {
        const lat = Number(resultado.lat.toFixed(6));
        const lng = Number(resultado.lng.toFixed(6));
        onChangeCoords(lat, lng);
        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          mapInstanceRef.current.setView([lat, lng], 15);
        }
        setStatusBusca('✅ Região localizada! Arraste ou toque no mapa para cravar a porteira exata.');
      } else {
        setStatusBusca('⚠️ Endereço rural aproximado não encontrado. Toque direto no mapa para marcar o alfinete!');
      }
    } finally {
      setBuscandoEndereco(false);
    }
  };

  const usarMeuGpsAtual = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatusBusca('⚠️ GPS não suportado neste navegador.');
      return;
    }

    setBuscandoEndereco(true);
    setStatusBusca('📡 Obtendo sua posição GPS atual...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        onChangeCoords(lat, lng);
        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          mapInstanceRef.current.setView([lat, lng], 16);
        }
        setBuscandoEndereco(false);
        setStatusBusca('✅ Alfinete posicionado na sua localização GPS atual!');
      },
      () => {
        setBuscandoEndereco(false);
        setStatusBusca('⚠️ Permissão de GPS negada ou sem sinal. Marque tocando no mapa.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const aplicarLinkOuCoordenadaColada = (valor: string) => {
    setInputCoordenadaDireta(valor);
    const coords = extrairCoordenadasDeTexto(valor);
    if (coords) {
      const lat = Number(coords.lat.toFixed(6));
      const lng = Number(coords.lng.toFixed(6));
      onChangeCoords(lat, lng);
      if (mapInstanceRef.current && markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        mapInstanceRef.current.setView([lat, lng], 16);
      }
      setStatusBusca('✅ Coordenadas extraídas e alfinete posicionado no mapa!');
    }
  };

  const googleMapsUrl = `https://www.google.com/maps?q=${latAtual},${lngAtual}`;

  return (
    <div className="col-span-2 bg-slate-950 border border-emerald-500/30 rounded-xl p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>Mapa Rural — Marcar Alfinete Exato</span>
        </div>

        <button
          type="button"
          onClick={() => setModoSatelite((prev) => !prev)}
          className="bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
        >
          <Layers className="w-3 h-3 text-sky-400" />
          {modoSatelite ? '🗺️ Ver Mapa Ruas' : '🛰️ Ver Satélite Rural'}
        </button>
      </div>

      {/* Botões de Busca pelo Endereço Digitado ou GPS */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={localizarPeloEnderecoDigitado}
          disabled={buscandoEndereco}
          className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{buscandoEndereco ? 'Buscando...' : 'Buscar pelo Endereço'}</span>
        </button>

        <button
          type="button"
          onClick={usarMeuGpsAtual}
          disabled={buscandoEndereco}
          className="bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
        >
          <Crosshair className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>Usar Meu GPS</span>
        </button>
      </div>

      {/* Campo opcional para colar link do Google Maps ou coordenadas */}
      <div>
        <input
          type="text"
          value={inputCoordenadaDireta}
          onChange={(e) => aplicarLinkOuCoordenadaColada(e.target.value)}
          placeholder="Opcional: Cole link do Google Maps ou coordenadas (ex: -18.126, -40.363)"
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 outline-none focus:border-emerald-500"
        />
      </div>

      {statusBusca && (
        <p className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-800/40 rounded-lg px-2 py-1">
          {statusBusca}
        </p>
      )}

      {/* Container do Mapa Interativo */}
      <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
        <div ref={mapContainerRef} className="w-full h-full z-10" />
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 pt-0.5">
        <span className="font-mono">
          {temPinDefinido ? (
            <strong className="text-emerald-400">
              📍 Pin: {latAtual.toFixed(5)}, {lngAtual.toFixed(5)}
            </strong>
          ) : (
            'Toque no mapa ou arraste o alfinete para cravar o local'
          )}
        </span>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 shrink-0 underline"
        >
          <ExternalLink className="w-3 h-3" /> Google Maps
        </a>
      </div>
    </div>
  );
}

// ============================================================================
// 2. COMPONENTE MAPA GERAL DE CLIENTES NA TELA DE INÍCIO (POR PROXIMIDADE)
// ============================================================================
interface MapaGeralClientesProps {
  contatos: Contato[];
  onEditarCliente: (contato: Contato) => void;
  onAbrirWhatsApp: (contato: Contato) => void;
}

export function MapaGeralClientes({
  contatos,
  onEditarCliente,
  onAbrirWhatsApp,
}: MapaGeralClientesProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const labelsLayerRef = useRef<any>(null);
  const markersByIdRef = useRef<Record<string, any>>({});

  const [modoSatelite, setModoSatelite] = useState<boolean>(true);
  const [pontoReferencia, setPontoReferencia] = useState<{
    tipo: 'base' | 'gps' | string;
    lat: number;
    lng: number;
    nome: string;
  }>({
    tipo: 'base',
    lat: BASE_CABOCLO_COORDS.lat,
    lng: BASE_CABOCLO_COORDS.lng,
    nome: BASE_CABOCLO_COORDS.nome,
  });
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string | null>(null);

  const clientes = useMemo(
    () => contatos.filter((c) => c.tipo === 'cliente'),
    [contatos]
  );

  const clientesComPin = useMemo(
    () =>
      clientes
        .filter((c) => c.latitude != null && c.longitude != null)
        .map((c) => {
          const distKm = calcularDistanciaKm(
            pontoReferencia.lat,
            pontoReferencia.lng,
            Number(c.latitude),
            Number(c.longitude)
          );
          return { ...c, distanciaKm: distKm };
        })
        .sort((a, b) => a.distanciaKm - b.distanciaKm),
    [clientes, pontoReferencia]
  );

  const clientesSemPin = useMemo(
    () => clientes.filter((c) => c.latitude == null || c.longitude == null),
    [clientes]
  );

  // Inicializar Mapa Geral
  useEffect(() => {
    let ativo = true;

    carregarLeaflet().then((L) => {
      if (!ativo || !L || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [BASE_CABOCLO_COORDS.lat, BASE_CABOCLO_COORDS.lng],
          zoom: 7,
          zoomControl: true,
        });

        mapInstanceRef.current = map;
        markersLayerRef.current = L.layerGroup().addTo(map);

        setTimeout(() => {
          map.invalidateSize();
        }, 250);
      }
    });

    return () => {
      ativo = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // Alternar camada Satélite vs Mapa de Estradas
  useEffect(() => {
    carregarLeaflet().then((L) => {
      const map = mapInstanceRef.current;
      if (!L || !map) return;

      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }
      if (labelsLayerRef.current) {
        map.removeLayer(labelsLayerRef.current);
        labelsLayerRef.current = null;
      }

      if (modoSatelite) {
        tileLayerRef.current = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19 }
        ).addTo(map);

        labelsLayerRef.current = L.tileLayer(
          'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19 }
        ).addTo(map);
      } else {
        tileLayerRef.current = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          { maxZoom: 19 }
        ).addTo(map);
      }
    });
  }, [modoSatelite]);

  // Renderizar Alfinetes de Todos os Clientes e da Base
  useEffect(() => {
    carregarLeaflet().then((L) => {
      const map = mapInstanceRef.current;
      const layerGroup = markersLayerRef.current;
      if (!L || !map || !layerGroup) return;

      layerGroup.clearLayers();
      markersByIdRef.current = {};

      const boundsPoints: [number, number][] = [];

      // Marcador da Base / Referência
      const iconeBase = criarIconePin(L, '#f59e0b', '🏠');
      const baseMarker = L.marker([pontoReferencia.lat, pontoReferencia.lng], {
        icon: iconeBase,
      }).addTo(layerGroup);
      baseMarker.bindPopup(
        `<div style="font-family:sans-serif;font-size:12px;color:#0f172a;">
          <strong>🏠 ${pontoReferencia.nome}</strong><br/>
          <span style="color:#475569;font-size:11px;">Ponto de Referência p/ Proximidade</span>
        </div>`
      );
      boundsPoints.push([pontoReferencia.lat, pontoReferencia.lng]);

      // Marcadores dos Clientes
      clientesComPin.forEach((cli) => {
        const lat = Number(cli.latitude);
        const lng = Number(cli.longitude);
        const isProspect = cli.status_crm === 'possibilidade';
        const icone = criarIconePin(L, isProspect ? '#3b82f6' : '#10b981', '📍');

        const marker = L.marker([lat, lng], { icon: icone }).addTo(layerGroup);
        const rotaUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        const pinUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        marker.bindPopup(
          `<div style="font-family:sans-serif;font-size:12px;color:#0f172a;min-width:180px;">
            <div style="font-weight:800;font-size:13px;margin-bottom:2px;">${cli.nome}</div>
            <div style="font-size:11px;color:#047857;font-weight:700;margin-bottom:4px;">
              📍 A ${cli.distanciaKm.toFixed(1)} km de distância
            </div>
            ${
              cli.endereco_fazenda
                ? `<div style="font-size:11px;color:#334155;margin-bottom:4px;">${cli.endereco_fazenda}</div>`
                : ''
            }
            ${
              cli.quantidade_animais
                ? `<div style="font-size:11px;color:#475569;margin-bottom:6px;">🐄 ${cli.quantidade_animais}</div>`
                : ''
            }
            <div style="display:flex;gap:6px;margin-top:6px;">
              <a href="${rotaUrl}" target="_blank" rel="noopener noreferrer" style="background:#059669;color:#fff;text-decoration:none;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;">
                🧭 Traçar Rota
              </a>
              <a href="${pinUrl}" target="_blank" rel="noopener noreferrer" style="background:#0284c7;color:#fff;text-decoration:none;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;">
                🗺️ Google Maps
              </a>
            </div>
          </div>`
        );

        marker.on('click', () => {
          setClienteSelecionadoId(cli.id || null);
        });

        if (cli.id) {
          markersByIdRef.current[cli.id] = marker;
        }
        boundsPoints.push([lat, lng]);
      });

      if (boundsPoints.length > 1 && !clienteSelecionadoId) {
        try {
          map.fitBounds(boundsPoints, { padding: [30, 30], maxZoom: 13 });
        } catch {}
      }
    });
  }, [clientesComPin, pontoReferencia]);

  const focarClienteNoMapa = (cli: Contato) => {
    if (cli.latitude == null || cli.longitude == null) return;
    setClienteSelecionadoId(cli.id || null);
    const map = mapInstanceRef.current;
    if (map) {
      map.setView([Number(cli.latitude), Number(cli.longitude)], 15, { animate: true });
      const m = cli.id ? markersByIdRef.current[cli.id] : null;
      if (m) {
        m.openPopup();
      }
    }
  };

  const usarGpsParaProximidade = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPontoReferencia({
          tipo: 'gps',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          nome: 'Minha Posição GPS Atual',
        });
      },
      () => {
        alert('Não foi possível acessar o GPS do aparelho. Verifique a permissão de localização.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="w-full bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-xl space-y-3">
      {/* Cabeçalho do Mapa Geral */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Mapa Geral de Clientes & Proximidade</span>
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded text-[10px] font-mono">
                {clientesComPin.length} no mapa
              </span>
            </h3>
            <span className="text-[10px] text-slate-400 block">
              Alfinetes rurais exatos e cálculo de distância p/ rotas de entrega
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModoSatelite((prev) => !prev)}
          className="bg-slate-950 hover:bg-slate-800 text-sky-300 border border-slate-700 px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 shrink-0 transition-colors"
        >
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          {modoSatelite ? '🗺️ Ruas' : '🛰️ Satélite'}
        </button>
      </div>

      {/* Seletor de Ponto de Referência para Ordenação por Proximidade */}
      <div className="flex items-center justify-between gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800 text-[11px]">
        <span className="text-slate-400 font-semibold shrink-0">Medir distância a partir de:</span>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() =>
              setPontoReferencia({
                tipo: 'base',
                lat: BASE_CABOCLO_COORDS.lat,
                lng: BASE_CABOCLO_COORDS.lng,
                nome: BASE_CABOCLO_COORDS.nome,
              })
            }
            className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
              pontoReferencia.tipo === 'base'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 border border-slate-800'
            }`}
          >
            🏠 Base Caboclo
          </button>

          <button
            type="button"
            onClick={usarGpsParaProximidade}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
              pontoReferencia.tipo === 'gps'
                ? 'bg-sky-500 text-slate-950'
                : 'bg-slate-900 text-sky-300 border border-sky-800/60'
            }`}
          >
            <Crosshair className="w-3 h-3" /> Meu GPS
          </button>
        </div>
      </div>

      {/* Mapa com Todos os Alfinetes */}
      <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full z-10" />
      </div>

      {/* Lista de Clientes Ordenados por Proximidade */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
          <span className="font-bold uppercase tracking-wider text-slate-300">
            📍 Clientes por Proximidade ({clientesComPin.length})
          </span>
          <span className="text-[10px] text-emerald-400">Mais próximos primeiro</span>
        </div>

        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
          {clientesComPin.map((cli, idx) => {
            const lat = Number(cli.latitude);
            const lng = Number(cli.longitude);
            const googleMapsRota = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
            const isSelected = clienteSelecionadoId === cli.id;

            return (
              <div
                key={cli.id || idx}
                onClick={() => focarClienteNoMapa(cli)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs ${
                  isSelected
                    ? 'bg-emerald-950/50 border-emerald-500/60'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded text-[10px] font-extrabold font-mono shrink-0">
                      {cli.distanciaKm.toFixed(1)} km
                    </span>
                    <span className="font-bold text-white truncate">{cli.nome}</span>
                  </div>
                  {cli.endereco_fazenda && (
                    <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                      {cli.endereco_fazenda}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => focarClienteNoMapa(cli)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded-lg text-[10px] font-semibold"
                    title="Focar alfinete no mapa"
                  >
                    🎯 Ver
                  </button>

                  <a
                    href={googleMapsRota}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-0.5"
                    title="Abrir rota no Google Maps"
                  >
                    <Navigation className="w-3 h-3" /> Maps
                  </a>

                  <button
                    type="button"
                    onClick={() => onAbrirWhatsApp(cli)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded-lg"
                    title="Chamar no WhatsApp"
                  >
                    <img src="/whatsapp.png" alt="Whats" className="w-3.5 h-3.5 object-contain" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Clientes que ainda não têm alfinete marcado */}
          {clientesSemPin.map((cli) => (
            <div
              key={cli.id || cli.nome}
              className="p-2.5 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 flex items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-slate-300 block truncate">{cli.nome}</span>
                <span className="text-[10px] text-amber-400 block">
                  ⚠️ Sem alfinete no mapa — {cli.endereco_fazenda || 'Sem endereço'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onEditarCliente(cli)}
                className="bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0"
              >
                <Edit3 className="w-3 h-3" /> Marcar Pin
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
