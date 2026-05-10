import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Grid, DollarSign, ArrowUpRight, TrendingUp, TrendingDown, ChevronDown, Clock, CalendarX, CheckCircle, Shield, UserPlus, MapPin, MoreVertical, ChevronRight } from 'lucide-react';

import { Link } from 'react-router-dom';
import ManausMap from '../components/ManausMap';
import { useChurch } from '../context/ChurchContext';
import Chart from 'react-apexcharts';


const Dashboard = () => {
  const { volunteers, departments, tithes, members, visitors, leaders } = useApp();
  const { activeChurch } = useChurch();

  // Zonas permitidas no mapa — Ponta Negra só exibe Oeste e Centro-Oeste
  const isPontaNegra = activeChurch?.name?.toLowerCase().includes('ponta negra');
  const mapAllowedZones = isPontaNegra
    ? ['Zona Oeste', 'Zona Centro-Oeste']
    : null; // null = todas as zonas

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState((now.getMonth() + 1).toString());
  const [filterYear, setFilterYear] = useState(now.getFullYear().toString());
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const months = [
    { value: 'all', label: 'Todos os Meses' },
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  const years = [2026, 2027, 2028, 2029, 2030, 2031, 2032]
    .map(y => ({ value: y.toString(), label: y.toString() }));

  /* ── Auto-Cycling List Component ──────────────────────── */
  const CyclingList = ({ items, renderItem, interval = 4000 }) => {
    const [index, setIndex] = useState(0);
    const [fade, setFade] = useState(true);

    useEffect(() => {
      if (items.length <= 5) return;
      const timer = setInterval(() => {
        setFade(false);
        setTimeout(() => {
          setIndex(prev => (prev + 5 >= items.length ? 0 : prev + 5));
          setFade(true);
        }, 500);
      }, interval);
      return () => clearInterval(timer);
    }, [items, interval]);

    const visibleItems = items.slice(index, index + 5);

    return (
      <div style={{
        opacity: fade ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        paddingRight: '2px',
      }} className="scrollbar-thin">
        {visibleItems.map((item, i) => renderItem(item, i))}
        {items.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Nenhum registro.
          </div>
        )}
      </div>
    );
  };

  const filteredTithes = tithes.filter(t => {
    const d = new Date(t.date + 'T12:00:00');
    if (filterYear !== 'all' && d.getFullYear().toString() !== filterYear) return false;
    if (filterMonth !== 'all' && (d.getMonth() + 1).toString() !== filterMonth) return false;
    return true;
  });

  const totalTithes = filteredTithes.reduce((acc, curr) => acc + curr.amount, 0);

  // --- Tendência ---
  const getTendency = () => {
    if (filterMonth === 'all' || filterYear === 'all') return null;

    let prevMonth = parseInt(filterMonth) - 1;
    let prevYear = parseInt(filterYear);
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }

    const prevTithes = tithes.filter(t => {
      const d = new Date(t.date + 'T12:00:00');
      return d.getFullYear() === prevYear && (d.getMonth() + 1) === prevMonth;
    });

    const prevTotal = prevTithes.reduce((acc, curr) => acc + curr.amount, 0);
    const prevMonthLabel = months.find(m => m.value === prevMonth.toString())?.label || 'mês anterior';

    if (prevTotal === 0 && totalTithes === 0) return null;
    if (prevTotal === 0 && totalTithes > 0) return { percent: 100, isPositive: true, text: `Novo registro! (vs ${prevMonthLabel})` };

    const diff = totalTithes - prevTotal;
    const percent = Math.abs((diff / prevTotal) * 100).toFixed(1);

    return {
      percent: percent.replace('.0', ''),
      isPositive: diff >= 0,
      text: `vs ${prevMonthLabel}`
    };
  };
  const tendency = getTendency();

  // Pendentes: voluntários que NÃO diezmaram no mês/ano de referência
  const pendingRefMonth = filterMonth === 'all' ? (now.getMonth() + 1).toString() : filterMonth;
  const pendingRefYear = filterYear === 'all' ? now.getFullYear().toString() : filterYear;

  // Meses futuros não têm pendentes (ainda não chegaram)
  const refDate = new Date(parseInt(pendingRefYear), parseInt(pendingRefMonth) - 1, 1);
  const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const isFuture = refDate > nowMonth;

  const pendingVolunteers = isFuture ? [] : volunteers.filter(v => {
    return !tithes.some(t => {
      const d = new Date(t.date + 'T12:00:00');
      return (
        t.volunteerId === v.id &&
        d.getFullYear().toString() === pendingRefYear &&
        (d.getMonth() + 1).toString() === pendingRefMonth
      );
    });
  });
  const pendingCount = pendingVolunteers.length;

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const recentTithes = [...filteredTithes]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
    .map(t => {
      const v = volunteers.find(vol => vol.id === t.volunteerId);
      return { ...t, volunteerName: v?.name || 'Desconhecido', volunteerContact: v?.contact };
    });

  // --- Desempenho de Coordenadores ---
  const leadersPerformance = leaders.map(l => {
    const activeVisitors = visitors.filter(v => v.assigned_leader_id === l.id);
    return {
      ...l,
      visitorsCount: activeVisitors.length,
      // Lista de visitantes com seus bairros reais (para o mapa filtrar por zona corretamente)
      visitorsDetail: activeVisitors.map(v => ({
        id: v.id,
        name: v.name,
        neighborhood: v.neighborhood || null
      }))
    };
  }).sort((a, b) => b.visitorsCount - a.visitorsCount);

  // --- Taxa de Resposta ---
  const totalVisitors = visitors.length;
  const confirmedVisitors = visitors.filter(v => v.followup_status === 'confirmed').length;
  const responseRate = totalVisitors > 0 ? ((confirmedVisitors / totalVisitors) * 100).toFixed(1) : 0;


  /* ── dropdown button style helper ─────────────────────── */
  const dropBtn = (key) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
    padding: '0.45rem 0.9rem',
    background: dropdownOpen === key ? 'var(--primary-light)' : 'var(--surface)',
    border: `1.5px solid ${dropdownOpen === key ? 'var(--primary)' : 'var(--border-color)'}`,
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: dropdownOpen === key ? 'var(--primary-dark)' : 'var(--text-dark)',
    boxShadow: dropdownOpen === key ? '0 0 0 3px var(--primary-light)' : '0 1px 2px rgba(0,0,0,0.05)',
    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
    whiteSpace: 'nowrap',
  });

  const dropPanel = {
    position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: '100%', zIndex: 1000,
    background: 'var(--surface)',
    border: '1.5px solid var(--primary)',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(59,130,246,0.15)',
    padding: '0.35rem',
    maxHeight: '220px', overflowY: 'auto',
    animation: 'fadeIn 0.15s ease-out',
  };

  const dropItem = (active) => ({
    padding: '0.5rem 0.75rem', cursor: 'pointer', borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: active ? 600 : 400,
    background: active ? 'var(--primary-light)' : 'transparent',
    color: active ? 'var(--primary-dark)' : 'var(--text-dark)',
    transition: 'background 0.15s',
  });

  return (
    <div className="animate-fade-in dashboard-main-wrapper" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* ── Header ── */}
      <div className="dashboard-header" style={{ flexShrink: 0, marginBottom: '0.5rem' }}>
        <div style={{ minWidth: 0 }}>
          <h2 className="text-xl" style={{ margin: 0 }}>Dashboard</h2>
          <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>Visão geral da Chama Church</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} ref={dropdownRef}>

            {/* Month */}
            <div style={{ position: 'relative' }}>
              <button style={{ ...dropBtn('month'), minWidth: '140px' }}
                onClick={() => setDropdownOpen(dropdownOpen === 'month' ? null : 'month')}>
                <span>{months.find(m => m.value === filterMonth)?.label}</span>
                <ChevronDown size={16} style={{
                  color: dropdownOpen === 'month' ? 'var(--primary)' : 'var(--text-muted)',
                  transition: 'transform 0.25s ease',
                  transform: dropdownOpen === 'month' ? 'rotate(180deg)' : 'rotate(0deg)',
                  flexShrink: 0,
                }} />
              </button>
              {dropdownOpen === 'month' && (
                <div style={dropPanel}>
                  {months.map(m => (
                    <div key={m.value}
                      style={dropItem(filterMonth === m.value)}
                      onClick={() => { setFilterMonth(m.value); setDropdownOpen(null); }}
                      onMouseOver={e => { if (filterMonth !== m.value) e.currentTarget.style.background = 'rgba(59,130,246,0.06)'; }}
                      onMouseOut={e => { if (filterMonth !== m.value) e.currentTarget.style.background = 'transparent'; }}
                    >{m.label}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Year */}
            <div style={{ position: 'relative' }}>
              <button style={{ ...dropBtn('year'), minWidth: '90px' }}
                onClick={() => setDropdownOpen(dropdownOpen === 'year' ? null : 'year')}>
                <span>{years.find(y => y.value === filterYear)?.label}</span>
                <ChevronDown size={16} style={{
                  color: dropdownOpen === 'year' ? 'var(--primary)' : 'var(--text-muted)',
                  transition: 'transform 0.25s ease',
                  transform: dropdownOpen === 'year' ? 'rotate(180deg)' : 'rotate(0deg)',
                  flexShrink: 0,
                }} />
              </button>
              {dropdownOpen === 'year' && (
                <div style={dropPanel}>
                  {years.map(y => (
                    <div key={y.value}
                      style={dropItem(filterYear === y.value)}
                      onClick={() => { setFilterYear(y.value); setDropdownOpen(null); }}
                      onMouseOver={e => { if (filterYear !== y.value) e.currentTarget.style.background = 'rgba(59,130,246,0.06)'; }}
                      onMouseOut={e => { if (filterYear !== y.value) e.currentTarget.style.background = 'transparent'; }}
                    >{y.label}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Link to="/tithes" className="btn btn-primary hide-mobile" style={{ flexShrink: 0 }}>
            Registrar Contribuição
          </Link>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="dashboard-grid" style={{ flexShrink: 0, marginBottom: '1rem' }}>

        {/* Membros Ativos */}
        <div className="card stat-card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-muted mb-1 text-sm">Membros Ativos</p>
              <h3 className="text-2xl">{members.length + volunteers.length}</h3>
            </div>
            <div style={{ background: '#dfe8ff', width: '48px', height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: 'var(--secondary)' }}>
              <Users size={24} />
            </div>
          </div>
          <div className="text-sm text-muted flex items-center gap-1">
            <span>Membros e Voluntários consolidados</span>
          </div>
        </div>

        {/* Visitantes */}
        <div className="card stat-card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-muted mb-1 text-sm">Visitantes</p>
              <h3 className="text-2xl">{visitors.length}</h3>
            </div>
            <div style={{ background: 'var(--primary-light)', width: '48px', height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: 'var(--primary)' }}>
              <UserPlus size={24} />
            </div>
          </div>
          <div className="text-sm text-muted flex items-center gap-1">
            <span>Sendo acompanhados</span>
          </div>
        </div>

        {/* Fila de Espera */}
        <div className="card stat-card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-muted mb-1 text-sm">Fila de Espera</p>
              <h3 className="text-2xl">{visitors.filter(v => !v.assigned_leader_id).length}</h3>
            </div>
            <div style={{ background: '#fef3c7', width: '48px', height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#d97706' }}>
              <Clock size={24} />
            </div>
          </div>
          <div className="text-sm text-muted flex items-center gap-1">
            <span>Aguardando coordenador</span>
          </div>
        </div>

        {/* Coordenadores */}
        <div className="card stat-card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-muted mb-1 text-sm">Coordenadores</p>
              <h3 className="text-2xl">{leaders.length}</h3>
            </div>
            <div style={{ background: '#e0e7ff', width: '48px', height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#4f46e5' }}>
              <Shield size={24} />
            </div>
          </div>
          <div className="text-sm text-muted flex items-center gap-1">
            <span>Coordenando áreas</span>
          </div>
        </div>

        {/* Total Arrecadado */}
        <div className="card stat-card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-muted mb-1 text-sm">Arrecadação</p>
              <h3 className="text-2xl" style={{ color: 'var(--primary-dark)' }}>{formatCurrency(totalTithes)}</h3>
            </div>
            <div style={{ background: 'var(--primary-light)', width: '48px', height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: 'var(--primary-dark)' }}>
              <DollarSign size={24} />
            </div>
          </div>
          {tendency ? (
            <div className="text-sm flex items-center gap-1">
              {tendency.isPositive ? (
                <TrendingUp size={16} color="#16a34a" />
              ) : (
                <TrendingDown size={16} color="#dc2626" />
              )}
              <span style={{ color: tendency.isPositive ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                {tendency.isPositive ? '+' : '-'}{tendency.percent}%
              </span>
              <span className="text-muted ml-1" style={{ fontSize: '0.75rem' }}>{tendency.text}</span>
            </div>
          ) : (
            <div className="text-sm text-muted flex items-center gap-1">
              <DollarSign size={16} color="var(--primary)" />
              <span style={{ color: 'var(--primary)' }}>Arrecadação total</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Section: Map and Animated Banners ── */}
      <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 320px', gap: '0.75rem', flex: 1, minHeight: '380px', marginBottom: '0.5rem' }} className="map-and-banners-grid">
        {/* Mapa de Consolidação */}
        <div style={{ minWidth: 0, height: '100%', overflow: 'hidden', borderRadius: '16px' }}>
          <ManausMap leadersPerformance={leadersPerformance} allowedZones={mapAllowedZones} />
        </div>

        {/* Banners Laterais */}
        <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '1.25rem', height: '100%' }}>

          {/* Banner 1: Taxa de Resposta (Donut Chart) */}
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', background: '#fff', border: '1px solid var(--border-color)', overflow: 'hidden', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', margin: 0 }}>Visitantes</h3>
              <div style={{ color: '#94a3b8', cursor: 'pointer' }}>
                <Users size={18} />
              </div>
            </div>

            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Chart
                type="donut"
                width="220"
                series={[confirmedVisitors, totalVisitors - confirmedVisitors - (visitors.filter(v => v.followup_status === 'denied').length), visitors.filter(v => v.followup_status === 'denied').length]}
                options={{
                  labels: ['Confirmados', 'Pendentes', 'Recusados'],
                  colors: ['#10b981', '#3b82f6', '#ef4444'],
                  chart: {
                    animations: { enabled: true, easing: 'easeinout', speed: 800 },
                    sparkline: { enabled: false }
                  },
                  stroke: { show: false },
                  dataLabels: { enabled: false },
                  legend: { show: false },
                  plotOptions: {
                    pie: {
                      donut: {
                        size: '75%',
                        labels: {
                          show: true,
                          name: {
                            show: true,
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#64748b',
                            offsetY: -10,
                            formatter: () => 'Taxa'
                          },
                          value: {
                            show: true,
                            fontSize: '22px',
                            fontWeight: 700,
                            color: '#1e293b',
                            offsetY: 10,
                            formatter: () => `${responseRate}%`
                          },
                          total: {
                            show: true,
                            label: 'Taxa',
                            formatter: () => `${responseRate}%`
                          }
                        }
                      }
                    }
                  },
                  tooltip: { enabled: true, y: { formatter: (val) => `${val} visitantes` } }
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid #f1f5f9', marginTop: '1rem', paddingTop: '1rem' }}>
              <div style={{ textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Confir.</span>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{confirmedVisitors}</div>
              </div>
              <div style={{ textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }} />
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Pend.</span>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{totalVisitors - confirmedVisitors - (visitors.filter(v => v.followup_status === 'denied').length)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Recus.</span>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{visitors.filter(v => v.followup_status === 'denied').length}</div>
              </div>
            </div>
          </div>



          {/* Banner 2: Visitantes Ativos (Transactions Style) */}
          <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', background: '#fff', border: '1px solid var(--border-color)', overflow: 'hidden', height: '100%' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexShrink: 0 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', margin: 0 }}>Visitantes Ativos</h3>
              <Link to="/visitors" style={{ fontSize: '0.85rem', color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                Ver Tudo <ChevronRight size={14} />
              </Link>
            </div>


            <CyclingList
              items={visitors.filter(v => v.followup_status === 'confirmed').sort((a, b) => new Date(b.created_at) - new Date(a.created_at))}
              renderItem={(v) => {
                const leader = leaders.find(l => l.id === v.assigned_leader_id);
                const nameParts = v.name.trim().split(' ');
                const initials = (nameParts[0]?.[0] || '') + (nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : '');
                
                return (
                  <div key={v.id} style={{
                    padding: '0.75rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    flexShrink: 0,
                    borderBottom: '1px solid #f8fafc'
                  }}>
                    {/* Avatar Circular Menor para ganhar espaço */}
                    <div style={{ 
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '50%', 

                      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: '#166534',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      flexShrink: 0,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>

                      {initials.toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b', lineHeight: '1.2' }}>
                        {v.name}
                      </div>

                      <div style={{ display: 'flex', marginTop: '2px' }}>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: '#94a3b8', 
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          <Shield size={10} flexShrink={0} />
                          {leader ? leader.name : 'SEM COORD'}
                        </div>



                      </div>


                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                        {v.neighborhood ? (v.neighborhood.length > 10 ? v.neighborhood.substring(0, 10) + '...' : v.neighborhood) : 'S/B'}
                      </div>
                    </div>

                  </div>
                );
              }}
            />
          </div>



        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        @media (max-width: 1200px) {
          .map-and-banners-grid {
            grid-template-columns: 1fr !important;
            height: auto !important;
            min-height: auto !important;
          }
          .map-and-banners-grid > div:first-child {
            height: 400px !important;
          }
          .map-and-banners-grid > div:last-child {
            height: auto !important;
          }
        }
      `}</style>

    </div>
  );
};

export default Dashboard;
