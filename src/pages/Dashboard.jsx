import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Grid, DollarSign, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { volunteers, departments, tithes } = useApp();

  const [filterMonth, setFilterMonth] = useState((new Date().getMonth() + 1).toString());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    { value: '12', label: 'Dezembro' }
  ];

  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => ({ value: y.toString(), label: y.toString() }));

  const filteredTithes = tithes.filter(t => {
    const d = new Date(t.date + 'T12:00:00');
    if (filterYear !== 'all' && d.getFullYear().toString() !== filterYear) return false;
    if (filterMonth !== 'all' && (d.getMonth() + 1).toString() !== filterMonth) return false;
    return true;
  });

  const totalTithes = filteredTithes.reduce((acc, curr) => acc + curr.amount, 0);
  
  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Get recent tithes mapped with volunteer info (based on the filtered tithes)
  const recentTithes = [...filteredTithes]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
    .map(t => {
      const v = volunteers.find(vol => vol.id === t.volunteerId);
      return { ...t, volunteerName: v?.name || 'Desconhecido', volunteerContact: v?.contact };
    });

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl">Dashboard</h2>
          <p className="text-muted">Visão geral da ChamaChurch</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} ref={dropdownRef}>

            <div style={{ position: 'relative' }}>
              <button 
                className="form-input flex items-center justify-between gap-2" 
                style={{ padding: '0.35rem 0.75rem', height: 'auto', fontSize: '0.875rem', minWidth: '130px', cursor: 'pointer', background: 'var(--bg-color)', color: 'var(--text-dark)' }}
                onClick={() => setDropdownOpen(dropdownOpen === 'month' ? null : 'month')}
              >
                <span style={{ fontWeight: 500 }}>{months.find(m => m.value === filterMonth)?.label}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>▼</span>
              </button>
              {dropdownOpen === 'month' && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: '0.25rem', padding: '0.25rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                  {months.map(m => (
                    <div 
                      key={m.value} 
                      onClick={() => { setFilterMonth(m.value); setDropdownOpen(null); }}
                      style={{ padding: '0.5rem', cursor: 'pointer', borderRadius: '4px', fontSize: '0.875rem', background: filterMonth === m.value ? 'var(--primary-light)' : 'transparent', color: filterMonth === m.value ? 'var(--primary-dark)' : 'var(--text-dark)', fontWeight: filterMonth === m.value ? 600 : 400 }}
                      onMouseOver={e => { if(filterMonth !== m.value) e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)' }}
                      onMouseOut={e => { if(filterMonth !== m.value) e.currentTarget.style.background = 'transparent' }}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button 
                className="form-input flex items-center justify-between gap-2" 
                style={{ padding: '0.35rem 0.75rem', height: 'auto', fontSize: '0.875rem', minWidth: '90px', cursor: 'pointer', background: 'var(--bg-color)', color: 'var(--text-dark)' }}
                onClick={() => setDropdownOpen(dropdownOpen === 'year' ? null : 'year')}
              >
                <span style={{ fontWeight: 500 }}>{years.find(y => y.value === filterYear)?.label}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>▼</span>
              </button>
              {dropdownOpen === 'year' && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: '0.25rem', padding: '0.25rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                  {years.map(y => (
                    <div 
                      key={y.value} 
                      onClick={() => { setFilterYear(y.value); setDropdownOpen(null); }}
                      style={{ padding: '0.5rem', cursor: 'pointer', borderRadius: '4px', fontSize: '0.875rem', background: filterYear === y.value ? 'var(--primary-light)' : 'transparent', color: filterYear === y.value ? 'var(--primary-dark)' : 'var(--text-dark)', fontWeight: filterYear === y.value ? 600 : 400 }}
                      onMouseOver={e => { if(filterYear !== y.value) e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)' }}
                      onMouseOut={e => { if(filterYear !== y.value) e.currentTarget.style.background = 'transparent' }}
                    >
                      {y.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Link to="/tithes" className="btn btn-primary" style={{ shrink: 0 }}>
            Registrar Dízimo
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 mb-8">
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
      </div>

      <div className="grid grid-cols-1" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <div className="card">
          <h3 className="text-xl mb-4">Dízimos Recentes</h3>
          {recentTithes.length > 0 ? (
            <div className="table-container">
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
                      <td>{new Date(tithe.date).toLocaleDateString('pt-BR')}</td>
                      <td className="font-bold" style={{ color: 'var(--primary-dark)' }}>{formatCurrency(tithe.amount)}</td>
                      <td><span className="badge badge-green">Recebido</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Nenhum dízimo registrado ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
