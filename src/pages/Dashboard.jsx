import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Grid, DollarSign, ArrowUpRight, ChevronDown, Clock, CalendarX, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { volunteers, departments, tithes } = useApp();

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState((now.getMonth() + 1).toString());
  const [filterYear,  setFilterYear]  = useState(now.getFullYear().toString());
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
    { value: '1',  label: 'Janeiro'   },
    { value: '2',  label: 'Fevereiro' },
    { value: '3',  label: 'Março'     },
    { value: '4',  label: 'Abril'     },
    { value: '5',  label: 'Maio'      },
    { value: '6',  label: 'Junho'     },
    { value: '7',  label: 'Julho'     },
    { value: '8',  label: 'Agosto'    },
    { value: '9',  label: 'Setembro'  },
    { value: '10', label: 'Outubro'   },
    { value: '11', label: 'Novembro'  },
    { value: '12', label: 'Dezembro'  },
  ];

  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030]
    .map(y => ({ value: y.toString(), label: y.toString() }));

  const filteredTithes = tithes.filter(t => {
    const d = new Date(t.date + 'T12:00:00');
    if (filterYear  !== 'all' && d.getFullYear().toString()     !== filterYear)  return false;
    if (filterMonth !== 'all' && (d.getMonth() + 1).toString() !== filterMonth) return false;
    return true;
  });

  const totalTithes = filteredTithes.reduce((acc, curr) => acc + curr.amount, 0);

  // Pendentes: voluntários que NÃO diezmaram no mês/ano de referência
  const pendingRefMonth = filterMonth === 'all' ? (now.getMonth() + 1).toString() : filterMonth;
  const pendingRefYear  = filterYear  === 'all' ? now.getFullYear().toString()    : filterYear;

  // Meses futuros não têm pendentes (ainda não chegaram)
  const refDate    = new Date(parseInt(pendingRefYear), parseInt(pendingRefMonth) - 1, 1);
  const nowMonth   = new Date(now.getFullYear(), now.getMonth(), 1);
  const isFuture   = refDate > nowMonth;

  const pendingVolunteers = isFuture ? [] : volunteers.filter(v => {
    return !tithes.some(t => {
      const d = new Date(t.date + 'T12:00:00');
      return (
        t.volunteerId === v.id &&
        d.getFullYear().toString()     === pendingRefYear &&
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

  /* ── dropdown button style helper ─────────────────────── */
  const dropBtn = (key) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
    padding: '0.45rem 0.9rem',
    background: dropdownOpen === key ? 'var(--primary-light)' : 'var(--surface)',
    border: `1.5px solid ${dropdownOpen === key ? 'var(--primary)' : 'var(--border-color)'}`,
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: dropdownOpen === key ? 'var(--primary-dark)' : 'var(--text-dark)',
    boxShadow: dropdownOpen === key ? '0 0 0 3px var(--primary-light)' : '0 1px 2px rgba(0,0,0,0.05)',
    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
  });

  const dropPanel = {
    position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: '100%', zIndex: 200,
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
    color:      active ? 'var(--primary-dark)'   : 'var(--text-dark)',
    transition: 'background 0.15s',
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl">Dashboard</h2>
          <p className="text-muted">Visão geral da ChamaChurch</p>
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
                      onMouseOut={e  => { if (filterMonth !== m.value) e.currentTarget.style.background = 'transparent'; }}
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
                      onMouseOut={e  => { if (filterYear !== y.value) e.currentTarget.style.background = 'transparent'; }}
                    >{y.label}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Link to="/tithes" className="btn btn-primary" style={{ flexShrink: 0 }}>
            Registrar Dízimo
          </Link>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-4 mb-8">

        {/* Total Arrecadado */}
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-muted mb-1 text-sm">Total Arrecadado</p>
              <h3 className="text-2xl" style={{ color: 'var(--primary-dark)' }}>{formatCurrency(totalTithes)}</h3>
            </div>
            <div style={{ background: 'var(--primary-light)', width: '48px', height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: 'var(--primary-dark)' }}>
              <DollarSign size={24} />
            </div>
          </div>
          <div className="text-sm text-muted flex items-center gap-1">
            <ArrowUpRight size={16} color="var(--primary)" />
            <span style={{ color: 'var(--primary)' }}>Sempre pontuais</span>
          </div>
        </div>

        {/* Total Voluntários */}
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-muted mb-1 text-sm">Total de Voluntários</p>
              <h3 className="text-2xl">{volunteers.length}</h3>
            </div>
            <div style={{ background: '#dfe8ff', width: '48px', height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: 'var(--secondary)' }}>
              <Users size={24} />
            </div>
          </div>
          <Link to="/volunteers" className="text-sm" style={{ color: 'var(--secondary)', textDecoration: 'none' }}>Ver todos →</Link>
        </div>

        {/* Departamentos */}
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-muted mb-1 text-sm">Departamentos</p>
              <h3 className="text-2xl">{departments.length}</h3>
            </div>
            <div style={{ background: '#fef3c7', width: '48px', height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: 'var(--accent)' }}>
              <Grid size={24} />
            </div>
          </div>
          <Link to="/departments" className="text-sm" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Gerenciar →</Link>
        </div>

        {/* Pendentes no Mês */}
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-muted mb-1 text-sm">
                Pendentes — {months.find(m => m.value === pendingRefMonth)?.label}
              </p>
              <h3 className="text-2xl" style={{ color: pendingCount > 0 ? '#dc2626' : '#16a34a' }}>
                {pendingCount}
              </h3>
            </div>
            <div style={{ background: pendingCount > 0 ? '#fee2e2' : '#dcfce7', width: '48px', height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: pendingCount > 0 ? '#dc2626' : '#16a34a' }}>
              <Clock size={24} />
            </div>
          </div>
          <Link to="/tithes" className="text-sm" style={{ color: isFuture ? 'var(--text-muted)' : (pendingCount > 0 ? '#dc2626' : '#16a34a'), textDecoration: 'none' }}>
            {isFuture ? 'Mês futuro — sem pendentes' : (pendingCount > 0 ? `${pendingCount} sem dizimar →` : 'Todos contribuíram')}
          </Link>
        </div>

      </div>

      {/* ── Bottom Panels: 2 colunas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', flex: 1, minHeight: 0, alignItems: 'stretch' }}>

        {/* Dízimos Recentes */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <h3 className="text-xl mb-4">Dízimos Recentes</h3>
          {recentTithes.length > 0 ? (
            <div className="table-container" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Voluntário</th>
                    <th>Contato</th>
                    <th>Data</th>
                    <th>Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTithes.map((tithe) => (
                    <tr key={tithe.id}>
                      <td className="font-bold">{tithe.volunteerName}</td>
                      <td>{tithe.volunteerContact || '-'}</td>
                      <td>{new Date(tithe.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="font-bold" style={{ color: 'var(--primary-dark)' }}>{formatCurrency(tithe.amount)}</td>
                      <td><span className="badge badge-green">Recebido</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Nenhum dízimo registrado ainda.
            </div>
          )}
        </div>

        {/* Dizimistas Pendentes */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 className="text-xl">Dizimistas Pendentes</h3>
            <span style={{
              background: pendingCount > 0 ? '#fee2e2' : '#dcfce7',
              color: pendingCount > 0 ? '#dc2626' : '#16a34a',
              borderRadius: '999px', padding: '0.2rem 0.75rem',
              fontSize: '0.82rem', fontWeight: 700,
            }}>
              {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
            </span>
          </div>

          {pendingVolunteers.length > 0 ? (
            <div className="table-container" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Voluntário</th>
                    <th>Contato</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingVolunteers.map(v => (
                    <tr key={v.id}>
                      <td className="font-bold">{v.name}</td>
                      <td>{v.contact || '-'}</td>
                      <td><span className="badge badge-red">Pendente</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: isFuture ? 'var(--text-muted)' : '#16a34a' }}>
              {isFuture
                ? <CalendarX size={36} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                : <CheckCircle size={36} style={{ color: '#16a34a' }} />}
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                {isFuture
                  ? 'Este mês ainda não chegou'
                  : `Todos contribuíram em ${months.find(m => m.value === pendingRefMonth)?.label}`}
              </span>
              {isFuture && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Não é possível ter pendentes em meses futuros.
                </span>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
