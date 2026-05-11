import React, { useMemo, useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap, Circle, GeoJSON } from 'react-leaflet';
import { MANAUS_NEIGHBORHOODS_TO_ZONES } from '../utils/manausMapping';
import { Shield, UserPlus, MapPin, Search, ChevronDown } from 'lucide-react';

import neighborhoodCoordsData from '../utils/neighborhoodCoords.json';
import zonesData from '../utils/zones.json';

const ZONES_COORDS = {
  "Zona Norte": [-3.0288, -59.9936],
  "Zona Sul": [-3.1281, -59.9837],
  "Zona Leste": [-3.0603, -59.8871],
  "Zona Oeste": [-3.0484, -60.0736],
  "Zona Centro-Sul": [-3.0756, -59.9977],
  "Zona Centro-Oeste": [-3.0788, -60.0506]
};

const ZONE_COLORS = {
  "Zona Norte": "#eab308",       // Yellow
  "Zona Sul": "#ef4444",         // Red
  "Zona Leste": "#1e40af",       // Dark Blue (Blue-800)
  "Zona Oeste": "#0ea5e9",       // Light Blue
  "Zona Centro-Sul": "#f97316",  // Orange
  "Zona Centro-Oeste": "#22c55e" // Green
};

const formatZoneName = (raw) => {
  if (!raw) return null;
  const map = {
    'ZONA NORTE': 'Zona Norte',
    'ZONA SUL': 'Zona Sul',
    'ZONA LESTE': 'Zona Leste',
    'ZONA OESTE': 'Zona Oeste',
    'ZONA CENTRO-SUL': 'Zona Centro-Sul',
    'ZONA CENTRO-OESTE': 'Zona Centro-Oeste'
  };
  return map[raw.toUpperCase()] || raw;
};

// Componente auxiliar para animar/mover o mapa
const MapController = ({ center, zoom, bounds }) => {
  const map = useMap();
  React.useEffect(() => {
    if (bounds && bounds.length > 0) {
      // Usamos maxZoom 12 para garantir que nunca fique "perto demais" da rua
      map.fitBounds(bounds, { padding: [100, 100], duration: 1.5, maxZoom: 12 });
    } else if (center && zoom) {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, zoom, bounds, map]);
  return null;
};

const GOOGLE_MAPS_API_KEY = 'AIzaSyAuIuAjS-p0SoRcKvVQm50TKEnJ6-QmoY8';

/* ── Componente de Marcador Dinâmico (Busca na API se não tiver no JSON) ── */
const DynamicNeighborhoodMarker = ({ neighborhood, visitorsCount, leaderName }) => {
  const [coords, setCoords] = useState(neighborhoodCoordsData[neighborhood] || null);

  useEffect(() => {
    // Se já temos as coordenadas (do JSON ou busca anterior), não faz nada
    if (coords) return;

    const fetchCoords = async () => {
      try {
        const query = encodeURIComponent(`${neighborhood}, Manaus, Amazonas`);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${GOOGLE_MAPS_API_KEY}`;
        
        const response = await fetch(url);
        const json = await response.json();
        
        if (json.status === 'OK' && json.results.length > 0) {
          const { lat, lng } = json.results[0].geometry.location;
          setCoords([lat, lng]);
          console.log(`API Google: Coordenadas obtidas para ${neighborhood}`);
        } else {
          console.warn(`Nao foi possivel geolocalizar o bairro: ${neighborhood}`);
        }
      } catch (error) {
        console.error(`Erro ao buscar API do Google para ${neighborhood}:`, error);
      }
    };

    fetchCoords();
  }, [neighborhood, coords]);

  if (!coords) return null;

  return (
    <CircleMarker
      center={coords}
      radius={8}
      pathOptions={{
        color: '#fff',
        fillColor: 'var(--primary)',
        fillOpacity: 1,
        weight: 3
      }}
    >
      <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary-dark)', textAlign: 'center' }}>
          {neighborhood}
          <div style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)' }}>
            {visitorsCount} {visitorsCount === 1 ? 'visitante' : 'visitantes'}
          </div>
        </div>
      </Tooltip>
      <Popup>
        <div style={{ padding: '0.25rem' }}>
          <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{neighborhood}</strong>
          <div style={{ fontSize: '0.8rem' }}>
            Coordenador: <strong>{leaderName}</strong>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
            {visitorsCount} visitantes nesta área
          </div>
        </div>
      </Popup>
    </CircleMarker>
  );
};

const ManausMap = ({ leadersPerformance = [], allowedZones = null }) => {
  const [selectedZone, setSelectedZone] = useState('Todas');
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [selectedLeaderId, setSelectedLeaderId] = useState(null);

  // Determina quais líderes aparecem no mapa (baseado em pesquisa ou seleção)
  const mapLeaders = useMemo(() => {
    let list = leadersPerformance;
    if (search.trim()) {
      list = list.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (selectedLeaderId) {
      list = list.filter(l => l.id === selectedLeaderId);
    }
    return list;
  }, [leadersPerformance, search, selectedLeaderId]);

  const zoneData = useMemo(() => {
    const data = {};

    mapLeaders.forEach(leader => {
      // 1. Pegar zonas dos bairros oficiais do líder
      const leaderNbs = leader.neighborhoods ? leader.neighborhoods.split(', ') : [];
      const officialZones = leaderNbs.map(nb => MANAUS_NEIGHBORHOODS_TO_ZONES[nb]).filter(Boolean);

      // 2. Pegar zonas onde o líder REALMENTE tem visitantes
      const visitorZones = (leader.visitorsDetail || [])
        .map(v => MANAUS_NEIGHBORHOODS_TO_ZONES[v.neighborhood])
        .filter(Boolean);

      // União de todas as zonas relevantes para este líder
      const allLeaderZones = [...new Set([...officialZones, ...visitorZones])];

      allLeaderZones.forEach(zone => {
        if (!data[zone]) {
          data[zone] = {
            name: zone,
            coords: ZONES_COORDS[zone] || ZONES_COORDS["Zona Centro-Sul"],
            visitors: 0,
            leaders: []
          };
        }

        // Adiciona o líder à zona com estatísticas específicas daquela zona
        if (!data[zone].leaders.find(l => l.id === leader.id)) {
          const zoneVisitorsCount = (leader.visitorsDetail || [])
            .filter(v => MANAUS_NEIGHBORHOODS_TO_ZONES[v.neighborhood] === zone)
            .length;

          data[zone].leaders.push({
            ...leader,
            zoneVisitors: zoneVisitorsCount
          });
        }
      });

      // 3. Contabilizar visitantes globais da zona (para o total da bolha)
      if (leader.visitorsDetail && leader.visitorsDetail.length > 0) {
        leader.visitorsDetail.forEach(visitor => {
          if (!visitor.neighborhood) return;
          const visitorZone = MANAUS_NEIGHBORHOODS_TO_ZONES[visitor.neighborhood] || null;
          if (visitorZone && data[visitorZone]) {
            data[visitorZone].visitors += 1;
          }
        });
      }
    });

    return data;
  }, [mapLeaders]);

  const filteredLeaders = useMemo(() => {
    let list = leadersPerformance;
    if (selectedZone !== 'Todas') {
      list = list.filter(leader => {
        const nbs = leader.neighborhoods ? leader.neighborhoods.split(', ') : [];
        return nbs.some(nb => MANAUS_NEIGHBORHOODS_TO_ZONES[nb] === selectedZone);
      });
    }
    if (search.trim()) {
      list = list.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
    }
    return list;
  }, [selectedZone, search, leadersPerformance]);

  const activeBounds = useMemo(() => {
    if (!selectedLeaderId) return null;
    const leader = leadersPerformance.find(l => l.id === selectedLeaderId);
    if (!leader) return null;

    const coords = [];
    
    // 1. Tenta pegar as coordenadas dos visitantes
    if (leader.visitorsDetail) {
      leader.visitorsDetail.forEach(v => {
        const c = neighborhoodCoordsData[v.neighborhood];
        if (c) coords.push(c);
      });
    }

    // 2. Fallback: Se não achar coordenadas de visitantes, usa as coordenadas das zonas onde ele atua
    if (coords.length === 0 && leader.neighborhoods) {
      const zones = new Set();
      leader.neighborhoods.split(', ').forEach(nb => {
        const zone = MANAUS_NEIGHBORHOODS_TO_ZONES[nb.trim()];
        if (zone) zones.add(zone);
      });
      
      zones.forEach(zone => {
        const c = ZONES_COORDS[zone];
        if (c) coords.push(c);
      });
    }

    if (coords.length === 0) return null;
    return coords;
  }, [selectedLeaderId, leadersPerformance]);

  const activeCenter = useMemo(() => {
    if (selectedLeaderId && !activeBounds) {
      const leader = leadersPerformance.find(l => l.id === selectedLeaderId);
      if (leader && leader.neighborhoods) {
        const nbs = leader.neighborhoods.split(', ');
        if (nbs.length > 0) {
          const firstNb = nbs[0].trim();
          const coords = neighborhoodCoordsData[firstNb];
          if (coords) return coords;
        }
      }
    }
    
    if (selectedZone !== 'Todas' && ZONES_COORDS[selectedZone]) {
      return ZONES_COORDS[selectedZone];
    }
    return [-3.050, -59.980];
  }, [selectedZone, selectedLeaderId, leadersPerformance, activeBounds]);

  const activeZoom = useMemo(() => {
    if (selectedLeaderId) return 12; 
    if (selectedZone !== 'Todas') return 12.5;
    return 11;
  }, [selectedZone, selectedLeaderId]);

  return (
    <div className="card flex-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'row', height: '100%', borderRadius: '24px' }}>
      {/* Sidebar do Mapa */}
      <div style={{ width: '300px', minWidth: '260px', background: 'var(--surface)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>Zonas & Coordenadores</h3>
          
          <div style={{ position: 'relative', marginBottom: '0.5rem' }} ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.5rem 0.75rem', background: dropdownOpen ? 'var(--primary-light)' : 'var(--surface)',
                border: `1.5px solid ${dropdownOpen ? 'var(--primary)' : 'var(--border-color)'}`,
                borderRadius: '12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                color: dropdownOpen ? 'var(--primary-dark)' : 'var(--text-dark)',
                boxShadow: dropdownOpen ? '0 0 0 3px rgba(59,130,246,0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s', outline: 'none'
              }}
            >
              <span>{selectedZone === 'Todas' ? 'Todas as Zonas' : selectedZone}</span>
              <ChevronDown size={18} style={{
                color: dropdownOpen ? 'var(--primary)' : 'var(--text-muted)',
                transition: 'transform 0.2s',
                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
              }} />
            </button>

            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: '100%', zIndex: 1000,
                background: 'var(--surface)', border: '1.5px solid var(--primary)', borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(59,130,246,0.15)', padding: '0.25rem',
                maxHeight: '220px', overflowY: 'auto', animation: 'fadeIn 0.15s ease-out'
              }}>
                {['Todas', ...(allowedZones ?? Object.keys(ZONES_COORDS))].map(z => (
                  <div key={z}
                    onClick={() => { setSelectedZone(z); setDropdownOpen(false); }}
                    onMouseOver={e => { if (selectedZone !== z) e.currentTarget.style.background = 'rgba(59,130,246,0.06)'; }}
                    onMouseOut={e => { if (selectedZone !== z) e.currentTarget.style.background = 'transparent'; }}
                    style={{
                      padding: '0.6rem 0.8rem', cursor: 'pointer', borderRadius: '8px', fontSize: '0.875rem',
                      fontWeight: selectedZone === z ? 600 : 500,
                      background: selectedZone === z ? 'var(--primary-light)' : 'transparent',
                      color: selectedZone === z ? 'var(--primary-dark)' : 'var(--text-dark)',
                      transition: 'background 0.15s'
                    }}
                  >
                    {z === 'Todas' ? 'Todas as Zonas' : z}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Buscar coordenador..." 
              style={{ 
                width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem', borderRadius: '12px', 
                border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.8rem', 
                color: '#0f172a', transition: 'all 0.2s', outline: 'none'
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="map-sidebar-scroll" style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '0.4rem', 
          backgroundColor: '#f8fafc',
          minHeight: 0
        }}>
          {filteredLeaders.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {filteredLeaders.map(l => (
                <div 
                  key={l.id} 
                  onClick={() => setSelectedLeaderId(selectedLeaderId === l.id ? null : l.id)}
                  style={{ 
                    background: selectedLeaderId === l.id ? 'var(--primary-light)' : '#fff', 
                    padding: '0.35rem 0.6rem', 
                    borderRadius: '10px', 
                    border: `1.5px solid ${selectedLeaderId === l.id ? 'var(--primary)' : 'var(--border-color)'}`, 
                    boxShadow: 'var(--shadow-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600, color: 'var(--text-dark)', minWidth: 0 }}>
                      <Shield size={12} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.8rem' }}>{l.name}</span>
                    </div>
                    <span style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '0.1rem 0.4rem', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0, marginLeft: '0.5rem' }}>
                      {l.visitorsCount} vis.
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <MapPin size={10} style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {l.neighborhoods || 'Geral'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2rem' }}>
              Nenhum coordenador encontrado nesta zona.
            </div>
          )}
        </div>
      </div>

      {/* Container do Mapa */}
      <div style={{ flex: 1, position: 'relative', minHeight: '100%' }}>
        <MapContainer 
          center={[-3.070, -59.980]} 
          zoom={11} 
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <MapController center={activeCenter} zoom={activeZoom} bounds={activeBounds} />
          
          {/* Base do Mapa - Google Maps (Roadmap Limpo) */}
          <TileLayer
            attribution="&copy; Google Maps"
            url={`https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=AIzaSyAuIuAjS-p0SoRcKvVQm50TKEnJ6-QmoY8&apistyle=s.t%3A2%7Cp.v%3Aoff`}
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          />

          {/* 1. VISÃO POR ZONAS (Polígonos do GeoJSON) */}
          <GeoJSON 
            key={`geojson-${selectedZone}-${selectedLeaderId}`}
            data={zonesData} 
            style={(feature) => {
              const zoneName = formatZoneName(feature.properties?.ZONAS);
              
              // Filtro por Zona no dropdown
              const matchesZone = selectedZone === 'Todas' || selectedZone === zoneName;
              
              // Checa se o líder selecionado atua nesta zona
              let leaderInZone = false;
              if (selectedLeaderId && zoneData[zoneName]) {
                leaderInZone = !!zoneData[zoneName].leaders.find(l => l.id === selectedLeaderId);
              }

              if (!matchesZone || (selectedLeaderId && !leaderInZone)) {
                return { opacity: 0, fillOpacity: 0, weight: 0 };
              }

              const color = ZONE_COLORS[zoneName] || '#64748b';
              return {
                fillColor: color,
                weight: 2,
                opacity: 0.8,
                color: '#ffffff',
                dashArray: '3',
                fillOpacity: 0.25
              };
            }}
          />

          {/* Marcadores de Contagem Geral das Zonas */}
          {Object.entries(zoneData).map(([zoneName, data]) => {
            const matchesZone = selectedZone === 'Todas' || selectedZone === zoneName;
            if (!matchesZone || data.leaders.length === 0) return null;

            if (selectedLeaderId) {
              const leaderInZone = data.leaders.find(l => l.id === selectedLeaderId);
              if (!leaderInZone) return null;
            }

            const color = ZONE_COLORS[zoneName] || '#64748b';

            return (
              <React.Fragment key={`marker-${zoneName}`}>
                
                {/* Só mostra a bolha de contagem geral se não tiver líder selecionado */}
                {!selectedLeaderId && (
                  <CircleMarker
                    center={data.coords}
                    radius={12}
                    pathOptions={{ 
                      color: '#fff', 
                      fillColor: color, 
                      fillOpacity: 0.9, 
                      weight: 2 
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={search.trim() !== ''}>
                      <div style={{ textAlign: 'center', fontWeight: 600 }}>
                        <div style={{ color: color, fontSize: '0.85rem', marginBottom: '2px' }}>{zoneName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {data.visitors} visitantes
                        </div>
                      </div>
                    </Tooltip>
                    <Popup>
                      <div style={{ padding: '0.25rem', minWidth: '180px' }}>
                        <h4 style={{ fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.5rem', color: color }}>
                          {zoneName}
                        </h4>
                        <p style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                          <strong>Coordenadores:</strong> {data.leaders.length}
                        </p>
                        <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                          <strong>Total de Visitantes:</strong> {data.visitors}
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                )}
              </React.Fragment>
            );
          })}

          {/* 2. VISÃO CONSOLIDADA POR ZONA (Pino único por zona para o Coordenador) */}
          {selectedLeaderId && (() => {
            const leader = leadersPerformance.find(l => l.id === selectedLeaderId);
            if (!leader || !leader.visitorsDetail) return null;
            
            // Agrupar TUDO por ZONA
            const dataByZone = {};
            
            leader.visitorsDetail.forEach(vis => {
              const nb = vis.neighborhood?.trim();
              if (!nb) return;
              
              const zone = MANAUS_NEIGHBORHOODS_TO_ZONES[nb] || "Zona Centro-Sul";
              
              // RESPEITA O FILTRO DE ZONA DO DROPDOWN
              if (selectedZone !== 'Todas' && zone !== selectedZone) return;

              if (!dataByZone[zone]) {
                dataByZone[zone] = {
                  neighborhoods: new Set(),
                  visitors: [],
                  coords: ZONES_COORDS[zone] || [-3.100, -60.000]
                };
              }
              
              dataByZone[zone].neighborhoods.add(nb);
              dataByZone[zone].visitors.push(vis);
            });

            return Object.entries(dataByZone).map(([zoneName, zoneData]) => {
              const color = ZONE_COLORS[zoneName] || 'var(--primary)';

              return (
                <CircleMarker
                  key={`${leader.id}-${zoneName}`}
                  center={zoneData.coords}
                  radius={12}
                  pathOptions={{
                    color: '#fff',
                    fillColor: color,
                    fillOpacity: 1,
                    weight: 3
                  }}
                >
                  <Tooltip direction="top" offset={[0, -12]} opacity={1} permanent>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: color, textAlign: 'center', textTransform: 'uppercase', textShadow: '0 0 3px #fff' }}>
                      {zoneName}
                    </div>
                  </Tooltip>
                  <Popup>
                    <div style={{ padding: '0.25rem', minWidth: '200px' }}>
                      <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: color, marginBottom: '0.6rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.4rem' }}>
                        {zoneName}
                      </h4>
                      
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                          Bairros Atendidos
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {[...zoneData.neighborhoods].map(nb => (
                            <span key={nb} style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {nb}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Visitantes ({leader.name})</span>
                          <span style={{ color: color }}>{zoneData.visitors.length} total</span>
                        </div>
                        <ul style={{ margin: 0, padding: '0 0 0 1.2rem', fontSize: '0.8rem', color: '#334155', fontWeight: 500 }}>
                          {zoneData.visitors.map(v => (
                            <li key={v.id} style={{ marginBottom: '2px' }}>
                              {v.name} <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>— {v.neighborhood}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            });
          })()}
        </MapContainer>
      </div>
      
      {/* Mobile Override CSS to handle flex-direction correctly on small screens */}
      <style>{`
        .map-sidebar-scroll {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .map-sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .map-sidebar-scroll::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 4px;
        }
        @media (max-width: 900px) {
          .card.flex-card {
            flex-direction: column !important;
            height: auto !important;
          }
          .card.flex-card > div:first-child {
            width: 100% !important;
            min-width: unset !important;
            border-right: none !important;
            border-bottom: 1px solid var(--border-color);
            max-height: 280px;
          }
          .leaflet-container {
            min-height: 380px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ManausMap;
