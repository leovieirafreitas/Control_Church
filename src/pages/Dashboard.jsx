import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Grid, DollarSign, ArrowUpRight, TrendingUp, TrendingDown, ChevronDown, Clock, CalendarX, CheckCircle, Shield, UserPlus, MapPin, MoreVertical, ChevronRight, LayoutDashboard, Plus } from 'lucide-react';
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
        gap: '0.6rem',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        paddingRight: '2px',
      }} className="scrollbar-thin">
        {visibleItems.map((item, i) => renderItem(item, i))}
        {items.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Nenhum registro ativo no momento.
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

  const getTendency = () => {
    if (filterMonth === 'all' || filterYear === 'all') return null;
    let prevMonth = parseInt(filterMonth) - 1;
    let prevYear = parseInt(filterYear);
    if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }
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
    return { percent: percent.replace('.0', ''), isPositive: diff >= 0, text: `vs ${prevMonthLabel}` };
  };
  const tendency = getTendency();

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const leadersPerformance = leaders.map(l => {
    const activeVisitors = visitors.filter(v => v.assigned_leader_id === l.id);
    return {
      ...l,
      visitorsCount: activeVisitors.length,
      visitorsDetail: activeVisitors.map(v => ({ id: v.id, name: v.name, neighborhood: v.neighborhood || null }))
    };
  }).sort((a, b) => b.visitorsCount - a.visitorsCount);

  const totalVisitors = visitors.length;
  const confirmedVisitors = visitors.filter(v => v.followup_status === 'confirmed').length;
  const responseRate = totalVisitors > 0 ? ((confirmedVisitors / totalVisitors) * 100).toFixed(1) : 0;

  const dropBtn = (key) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem',
    padding: '0.4rem 0.8rem',
    background: dropdownOpen === key ? 'var(--primary-light)' : '#f8fafc',
    border: `1.5px solid ${dropdownOpen === key ? 'var(--primary)' : 'var(--border-color)'}`,
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 700,
    color: dropdownOpen === key ? 'var(--primary-dark)' : 'var(--text-dark)',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  });

  const dropPanel = {
    position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: '100%', zIndex: 1000,
    background: 'white', border: '1px solid var(--border-color)', borderRadius: '14px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '0.4rem',
    maxHeight: '220px', overflowY: 'auto', animation: 'fadeIn 0.2s ease-out',
  };

  return (
    <div className="animate-fade-in" style={{ 
      display: 'flex', flexDirection: 'column', 
      height: 'calc(100vh - 95px)', 
      overflow: 'hidden', padding: '0.5rem 0.75rem', boxSizing: 'border-box',
      gap: '0.5rem'
    }}>
      
      {/* HEADER PREMIUM DASHBOARD - SUPER COMPACT */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        background: 'white', padding: '0.4rem 1rem', borderRadius: '16px', 
        boxShadow: '0 4px 15px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)', 
        flexShrink: 0 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '32px', height: '32px', borderRadius: '8px', 
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
          }}>
            <LayoutDashboard size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Dashboard</h2>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.4rem', borderRadius: '16px', gap: '0.5rem' }} ref={dropdownRef}>
            {/* Filter Month */}
            <div style={{ position: 'relative' }}>
              <button style={dropBtn('month')} onClick={() => setDropdownOpen(dropdownOpen === 'month' ? null : 'month')}>
                <span>{months.find(m => m.value === filterMonth)?.label}</span>
                <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: dropdownOpen === 'month' ? 'rotate(180deg)' : '0' }} />
              </button>
              {dropdownOpen === 'month' && (
                <div style={dropPanel}>
                  {months.map(m => (
                    <div key={m.value} className="dropdown-item" 
                      style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', background: filterMonth === m.value ? 'var(--primary-light)' : 'transparent', color: filterMonth === m.value ? 'var(--primary-dark)' : 'var(--text-dark)', fontWeight: filterMonth === m.value ? 700 : 500 }}
                      onClick={() => { setFilterMonth(m.value); setDropdownOpen(null); }}>{m.label}</div>
                  ))}
                </div>
              )}
            </div>
            {/* Filter Year */}
            <div style={{ position: 'relative' }}>
              <button style={dropBtn('year')} onClick={() => setDropdownOpen(dropdownOpen === 'year' ? null : 'year')}>
                <span>{filterYear}</span>
                <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: dropdownOpen === 'year' ? 'rotate(180deg)' : '0' }} />
              </button>
              {dropdownOpen === 'year' && (
                <div style={dropPanel}>
                  {years.map(y => (
                    <div key={y.value} className="dropdown-item"
                      style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', background: filterYear === y.value ? 'var(--primary-light)' : 'transparent', color: filterYear === y.value ? 'var(--primary-dark)' : 'var(--text-dark)', fontWeight: filterYear === y.value ? 700 : 500 }}
                      onClick={() => { setFilterYear(y.value); setDropdownOpen(null); }}>{y.label}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ height: '32px', width: '1.5px', background: 'var(--border-color)', margin: '0 0.5rem' }}></div>

          <Link to="/tithes" style={{ 
            padding: '0.5rem 1rem', borderRadius: '10px', background: 'var(--primary)', 
            color: 'white', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 10px rgba(59,130,246,0.2)',
            transition: 'all 0.2s'
          }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <Plus size={16} />
            Contribuição
          </Link>
        </div>
      </div>

      {/* STAT CARDS SECTION */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.25rem', flexShrink: 0, marginBottom: '0.75rem'
      }}>
        {[
          { label: 'Membros Ativos', val: members.length + volunteers.length, sub: 'Membros', icon: <Users size={18} />, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Visitantes', val: visitors.length, sub: 'Visitantes', icon: <UserPlus size={18} />, color: '#8b5cf6', bg: '#f5f3ff' },
          { label: 'Fila de Espera', val: visitors.filter(v => !v.assigned_leader_id).length, sub: 'Fila', icon: <Clock size={18} />, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Coordenadores', val: leaders.length, sub: 'Líderes', icon: <Shield size={18} />, color: '#10b981', bg: '#ecfdf5' },
          { label: 'Arrecadação', val: formatCurrency(totalTithes), sub: tendency ? `${tendency.percent}%` : 'Mês', icon: <DollarSign size={18} />, color: '#0ea5e9', bg: '#f0f9ff', isCurrency: true }
        ].map((card, idx) => (
          <div key={idx} className="card" style={{ 
            padding: '0.75rem 1rem', borderRadius: '16px', background: 'white', border: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            cursor: 'default', height: '100%'
          }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.05)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.15rem', minWidth: 0 }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {React.cloneElement(card.icon, { size: 14 })}
              </div>
              <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.label}</p>
              {card.isCurrency && tendency && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: tendency.isPositive ? '#059669' : '#dc2626', fontSize: '0.6rem', fontWeight: 700 }}>
                  {tendency.isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {tendency.percent}%
                </div>
              )}
            </div>

            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '-0.02em', flexShrink: 0 }}>{card.val}</h3>
          </div>
        ))}
      </div>

      {/* MAP AND ANALYTICS SECTION - ULTRA COMPACT */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: '1fr 300px', gap: '0.75rem', flex: 1, minHeight: 0
      }}>
        {/* MAP CARD */}
        <div style={{ minWidth: 0, minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <ManausMap leadersPerformance={leadersPerformance} allowedZones={mapAllowedZones} />
        </div>

        {/* SIDEBAR ANALYTICS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 0 }}>
          
          {/* TAXA DE RESPOSTA CHART */}
          <div className="card" style={{ padding: '0.5rem 0.75rem', borderRadius: '24px', background: 'white', border: '1px solid var(--border-color)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
            <h3 style={{ margin: '0 0 0.15rem 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>Taxa de Resposta</h3>
            <div style={{ display: 'flex', justifyContent: 'center', flex: 1, alignItems: 'center' }}>
              <Chart
                type="donut"
                width="140"
                series={[confirmedVisitors, totalVisitors - confirmedVisitors - (visitors.filter(v => v.followup_status === 'denied').length), visitors.filter(v => v.followup_status === 'denied').length]}
                options={{
                  labels: ['Confirmados', 'Pendentes', 'Recusados'],
                  colors: ['#10b981', '#3b82f6', '#ef4444'],
                  chart: { animations: { enabled: true, speed: 800 } },
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
                            fontSize: '24px',
                            fontWeight: 900,
                            color: '#1e293b',
                            offsetY: 8,
                            formatter: () => `${responseRate}%`
                          },
                          value: { show: false },
                          total: {
                            show: true,
                            showAlways: true,
                            label: `${responseRate}%`,
                            formatter: () => ''
                          }
                        }
                      }
                    }
                  },
                  tooltip: { enabled: true, y: { formatter: (val) => `${val} visitantes` } }
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
              {[
                { label: 'Conf.', val: confirmedVisitors, color: '#10b981' },
                { label: 'Pend.', val: totalVisitors - confirmedVisitors - (visitors.filter(v => v.followup_status === 'denied').length), color: '#3b82f6' },
                { label: 'Recu.', val: visitors.filter(v => v.followup_status === 'denied').length, color: '#ef4444' }
              ].map((s, idx) => (
                <div key={idx} style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '2px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color }} />
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* VISITANTES ATIVOS LIST */}
          <div className="card" style={{ padding: '0.75rem 1rem', borderRadius: '24px', background: 'white', border: '1px solid var(--border-color)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>Visitantes Ativos</h3>
              <Link to="/visitors" style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                Ver todos <ChevronRight size={12} />
              </Link>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <CyclingList
                items={visitors.filter(v => v.followup_status === 'confirmed').sort((a, b) => new Date(b.created_at) - new Date(a.created_at))}
                renderItem={(v) => {
                  const leader = leaders.find(l => l.id === v.assigned_leader_id);
                  const initials = v.name.trim().split(' ').map(n => n[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase();
                  return (
                    <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Shield size={10} /> {leader?.name || 'Sem líder'}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', background: '#f8fafc', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                        {v.neighborhood ? (v.neighborhood.length > 8 ? v.neighborhood.substring(0, 8) + '...' : v.neighborhood) : '—'}
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .dropdown-item:hover { background: #f1f5f9 !important; }
        .dashboard-main-wrapper { scrollbar-width: none; -ms-overflow-style: none; }
        .dashboard-main-wrapper::-webkit-scrollbar { display: none; }
        @media (max-width: 1200px) {
          .map-and-analytics-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
