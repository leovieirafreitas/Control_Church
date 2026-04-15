import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { DollarSign, Download, Trash2, X, ChevronDown, CalendarX, CheckCircle, ScanLine } from 'lucide-react';
import VolunteerSearch from '../components/VolunteerSearch';
import DatePicker from '../components/DatePicker';
import PdfScanner from '../components/PdfScanner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '../assets/logo.png';

const Tithes = () => {
  const { volunteers, tithes, churchSettings, departments, registerTithe, deleteTithe } = useApp();
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    volunteerId: '',
    amount: '',
    date: getLocalDateString()
  });

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState((now.getMonth() + 1).toString());
  const [filterYear, setFilterYear] = useState(now.getFullYear().toString());
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [activeTab, setActiveTab] = useState('history');
  const [showScanner, setShowScanner] = useState(false);
  const dropdownRef = useRef(null);
  const amountRef = useRef(null);

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

  const [searchVolunteer, setSearchVolunteer] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [titheToDelete, setTitheToDelete] = useState(null);

  const handleDeleteClick = (tithe) => {
    setTitheToDelete(tithe);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (titheToDelete) {
      await deleteTithe(titheToDelete.id);
      setShowDeleteModal(false);
      setTitheToDelete(null);
    }
  };

  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => ({ value: y.toString(), label: y.toString() }));

  const filteredTithes = tithes.filter(t => {
    const d = new Date(t.date + 'T12:00:00');
    if (filterYear !== 'all' && d.getFullYear().toString() !== filterYear) return false;
    if (filterMonth !== 'all' && (d.getMonth() + 1).toString() !== filterMonth) return false;

    const volunteer = volunteers.find(v => v.id === t.volunteerId);

    if (filterDepartment !== 'all') {
      if (!volunteer || !volunteer.departmentIds?.includes(filterDepartment)) return false;
    }

    if (searchVolunteer.trim() !== '') {
      if (!volunteer || !volunteer.name.toLowerCase().includes(searchVolunteer.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  // Para pendentes: sempre filtra por mês específico.
  // Se o usuário escolheu 'Todos os Meses', usa o mês/ano real atual como referência.
  const pendingRefMonth = filterMonth === 'all' ? (now.getMonth() + 1).toString() : filterMonth;
  const pendingRefYear = filterYear === 'all' ? now.getFullYear().toString() : filterYear;

  // Meses futuros não têm pendentes (ainda não chegaram)
  const refDate = new Date(parseInt(pendingRefYear), parseInt(pendingRefMonth) - 1, 1);
  const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const isFuture = refDate > nowMonth;

  const pendingVolunteers = isFuture ? [] : volunteers.filter(v => {
    if (filterDepartment !== 'all' && !v.departmentIds?.includes(filterDepartment)) return false;
    
    if (searchVolunteer.trim() !== '' && !v.name.toLowerCase().includes(searchVolunteer.toLowerCase())) {
      return false;
    }
    const hasTithed = tithes.some(t => {
      const d = new Date(t.date + 'T12:00:00');
      return (
        t.volunteerId === v.id &&
        d.getFullYear().toString() === pendingRefYear &&
        (d.getMonth() + 1).toString() === pendingRefMonth
      );
    });
    return !hasTithed;
  });

  const totalAmount = filteredTithes.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Add Logo
    // params: image, type, x, y, width, height (fixed aspect ratio)
    doc.addImage(logoUrl, 'PNG', 14, 10, 56, 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    // Shifted text lower since logo is at top
    doc.text('Relatório de Contribuições (Dízimos)', 14, 38);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${months.find(m => m.value === filterMonth)?.label} de ${filterYear === 'all' ? 'Todos os Anos' : filterYear}`, 14, 46);
    
    let currentY = 52;
    if (filterDepartment !== 'all') {
      const deptName = departments?.find(d => d.id === filterDepartment)?.name || 'Desconhecido';
      doc.text(`Departamento: ${deptName}`, 14, currentY);
      currentY += 6;
    }

    if (searchVolunteer.trim() !== '') {
      doc.text(`Filtro de Membro: ${searchVolunteer}`, 14, currentY);
      currentY += 6;
    }

    const tableColumn = ["Data", "Voluntário", "Valor", "Status"];
    const tableRows = [];

    [...filteredTithes].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(tithe => {
      const volunteer = volunteers.find(v => v.id === tithe.volunteerId);
      const titheData = [
        new Date(tithe.date + 'T12:00:00').toLocaleDateString('pt-BR'),
        volunteer?.name || 'Desconhecido',
        formatCurrency(tithe.amount),
        'Recebido'
      ];
      tableRows.push(titheData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: currentY,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }
    });

    const finalY = doc.lastAutoTable?.finalY || currentY;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Contribuído: ${formatCurrency(totalAmount)}`, 14, finalY + 10);

    doc.save('relatorio_dizimos.pdf');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.volunteerId && formData.amount && formData.date) {
      await registerTithe(formData.volunteerId, formData.amount, formData.date);
      setFormData({ ...formData, amount: '', volunteerId: '' });
    }
  };


  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', flexShrink: 0 }}>
        <div>
          <h2 className="text-2xl" style={{ marginBottom: '0.1rem' }}>Dízimos</h2>
          <p className="text-muted" style={{ fontSize: '0.82rem' }}>Registro e controle de dizimistas</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Pesquisar dizimista..."
            value={searchVolunteer}
            onChange={e => setSearchVolunteer(e.target.value)}
            style={{ width: '280px', margin: 0, padding: '0.4rem 0.75rem', fontSize: '0.855rem' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Filtrado</span>
            <span style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '1.05rem' }}>{formatCurrency(totalAmount)}</span>
          </div>

          <button
            onClick={exportPDF}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', gap: '0.4rem' }}
            disabled={filteredTithes.length === 0}
          >
            <Download size={16} />
            Exportar PDF
          </button>

          <button
            onClick={() => setShowScanner(true)}
            className="btn btn-outline"
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', gap: '0.4rem' }}
          >
            <ScanLine size={16} />
            Analisar PDF (Beta)
          </button>
        </div>
      </div>

      {/* ── Body: form + table ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '1.25rem', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── Formulário compacto ── */}
        <div className="card" style={{ padding: '1rem', alignSelf: 'start' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.875rem', color: 'var(--text-dark)' }}>Registrar Dízimo</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>

            <div>
              <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '0.3rem' }}>Voluntário</label>
              <VolunteerSearch
                volunteers={volunteers}
                value={formData.volunteerId}
                onChange={(id) => setFormData(prev => ({ ...prev, volunteerId: id }))}
                onSelected={() => amountRef.current?.focus()}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '0.3rem' }}>Valor (R$)</label>
              <input
                ref={amountRef}
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                placeholder="0,00"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (formData.volunteerId && formData.amount && formData.date) {
                      handleSubmit(e);
                    }
                  }
                }}
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                required
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '0.3rem' }}>Data</label>
              <DatePicker
                value={formData.date}
                onChange={(date) => setFormData(prev => ({ ...prev, date }))}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.375rem', fontSize: '0.875rem', padding: '0.55rem' }}
              disabled={!formData.volunteerId || !formData.amount || !formData.date}
            >
              Confirmar
            </button>
          </form>
        </div>

        {/* ── Histórico e Pendentes ── */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>

              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <button
                  onClick={() => setActiveTab('history')}
                  style={{ padding: '0.5rem 0', background: 'none', border: 'none', borderBottom: activeTab === 'history' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'history' ? 'var(--text-dark)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.2s', marginBottom: '-0.6rem' }}
                >
                  Histórico de Dízimos
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  style={{ padding: '0.5rem 0', background: 'none', border: 'none', borderBottom: activeTab === 'pending' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'pending' ? 'var(--text-dark)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.2s', marginBottom: '-0.6rem' }}
                >
                  Pendentes — {months.find(m => m.value === pendingRefMonth)?.label} ({pendingVolunteers.length})
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} ref={dropdownRef}>
                <button
                  className="btn btn-outline"
                  style={{ padding: '0.35rem 0.75rem', height: 'auto', fontSize: '0.875rem', fontWeight: 600 }}
                  onClick={() => {
                    const now = new Date();
                    setFilterMonth((now.getMonth() + 1).toString());
                    setFilterYear(now.getFullYear().toString());
                    setFilterDepartment('all');
                  }}
                >
                  Hoje
                </button>

                {/* ── Department dropdown ── */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setDropdownOpen(dropdownOpen === 'dept' ? null : 'dept')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.45rem 0.9rem',
                      background: dropdownOpen === 'dept' ? 'var(--primary-light)' : 'var(--surface)',
                      border: `1.5px solid ${dropdownOpen === 'dept' ? 'var(--primary)' : 'var(--border-color)'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: dropdownOpen === 'dept' ? 'var(--primary-dark)' : 'var(--text-dark)',
                      minWidth: '160px',
                      boxShadow: dropdownOpen === 'dept' ? '0 0 0 3px var(--primary-light)' : 'var(--shadow-sm)',
                      transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {filterDepartment === 'all' 
                        ? 'Todos Departamentos' 
                        : departments?.find(d => d.id === filterDepartment)?.name || 'Todos Departamentos'}
                    </span>
                    <ChevronDown
                      size={16}
                      style={{
                        color: dropdownOpen === 'dept' ? 'var(--primary)' : 'var(--text-muted)',
                        transition: 'transform 0.25s ease',
                        transform: dropdownOpen === 'dept' ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    />
                  </button>

                  {dropdownOpen === 'dept' && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: '6px',
                      background: 'var(--surface)', border: '1px solid var(--border-color)',
                      borderRadius: '10px', boxShadow: 'var(--shadow-lg)',
                      zIndex: 50, minWidth: '220px', padding: '0.5rem',
                      maxHeight: '300px', overflowY: 'auto',
                      animation: 'fadeIn 0.15s ease-out'
                    }}>
                      <button
                        onClick={() => { setFilterDepartment('all'); setDropdownOpen(null); }}
                        style={{
                          width: '100%', padding: '0.5rem 0.75rem', textAlign: 'left',
                          background: filterDepartment === 'all' ? 'var(--bg-color)' : 'transparent',
                          border: 'none', borderRadius: '6px', cursor: 'pointer',
                          fontSize: '0.875rem', fontWeight: filterDepartment === 'all' ? 600 : 400,
                          color: filterDepartment === 'all' ? 'var(--primary-dark)' : 'var(--text-dark)'
                        }}
                      >
                        Todos Departamentos
                      </button>
                      {departments?.map(dept => (
                        <button
                          key={dept.id}
                          onClick={() => { setFilterDepartment(dept.id); setDropdownOpen(null); }}
                          style={{
                            width: '100%', padding: '0.5rem 0.75rem', textAlign: 'left',
                            background: filterDepartment === dept.id ? 'var(--bg-color)' : 'transparent',
                            border: 'none', borderRadius: '6px', cursor: 'pointer',
                            fontSize: '0.875rem', fontWeight: filterDepartment === dept.id ? 600 : 400,
                            color: filterDepartment === dept.id ? 'var(--primary-dark)' : 'var(--text-dark)'
                          }}
                        >
                          {dept.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Month dropdown ── */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setDropdownOpen(dropdownOpen === 'month' ? null : 'month')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.45rem 0.9rem',
                      background: dropdownOpen === 'month' ? 'var(--primary-light)' : 'var(--surface)',
                      border: `1.5px solid ${dropdownOpen === 'month' ? 'var(--primary)' : 'var(--border-color)'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: dropdownOpen === 'month' ? 'var(--primary-dark)' : 'var(--text-dark)',
                      minWidth: '140px',
                      boxShadow: dropdownOpen === 'month' ? '0 0 0 3px var(--primary-light)' : 'var(--shadow-sm)',
                      transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{months.find(m => m.value === filterMonth)?.label}</span>
                    <ChevronDown
                      size={16}
                      style={{
                        color: dropdownOpen === 'month' ? 'var(--primary)' : 'var(--text-muted)',
                        transition: 'transform 0.25s ease',
                        transform: dropdownOpen === 'month' ? 'rotate(180deg)' : 'rotate(0deg)',
                        flexShrink: 0,
                      }}
                    />
                  </button>
                  {dropdownOpen === 'month' && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                      minWidth: '100%', zIndex: 200,
                      background: 'var(--surface)',
                      border: '1.5px solid var(--primary)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(59,130,246,0.15)',
                      padding: '0.35rem',
                      maxHeight: '220px', overflowY: 'auto',
                      animation: 'fadeIn 0.15s ease-out',
                    }}>
                      {months.map(m => (
                        <div
                          key={m.value}
                          onClick={() => { setFilterMonth(m.value); setDropdownOpen(null); }}
                          style={{
                            padding: '0.5rem 0.75rem',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: filterMonth === m.value ? 600 : 400,
                            background: filterMonth === m.value ? 'var(--primary-light)' : 'transparent',
                            color: filterMonth === m.value ? 'var(--primary-dark)' : 'var(--text-dark)',
                            transition: 'background 0.15s',
                          }}
                          onMouseOver={e => { if (filterMonth !== m.value) e.currentTarget.style.background = 'rgba(59,130,246,0.06)'; }}
                          onMouseOut={e => { if (filterMonth !== m.value) e.currentTarget.style.background = 'transparent'; }}
                        >
                          {m.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Year dropdown ── */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setDropdownOpen(dropdownOpen === 'year' ? null : 'year')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.45rem 0.9rem',
                      background: dropdownOpen === 'year' ? 'var(--primary-light)' : 'var(--surface)',
                      border: `1.5px solid ${dropdownOpen === 'year' ? 'var(--primary)' : 'var(--border-color)'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: dropdownOpen === 'year' ? 'var(--primary-dark)' : 'var(--text-dark)',
                      minWidth: '90px',
                      boxShadow: dropdownOpen === 'year' ? '0 0 0 3px var(--primary-light)' : 'var(--shadow-sm)',
                      transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{years.find(y => y.value === filterYear)?.label}</span>
                    <ChevronDown
                      size={16}
                      style={{
                        color: dropdownOpen === 'year' ? 'var(--primary)' : 'var(--text-muted)',
                        transition: 'transform 0.25s ease',
                        transform: dropdownOpen === 'year' ? 'rotate(180deg)' : 'rotate(0deg)',
                        flexShrink: 0,
                      }}
                    />
                  </button>
                  {dropdownOpen === 'year' && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                      minWidth: '100%', zIndex: 200,
                      background: 'var(--surface)',
                      border: '1.5px solid var(--primary)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(59,130,246,0.15)',
                      padding: '0.35rem',
                      maxHeight: '220px', overflowY: 'auto',
                      animation: 'fadeIn 0.15s ease-out',
                    }}>
                      {years.map(y => (
                        <div
                          key={y.value}
                          onClick={() => { setFilterYear(y.value); setDropdownOpen(null); }}
                          style={{
                            padding: '0.5rem 0.75rem',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: filterYear === y.value ? 600 : 400,
                            background: filterYear === y.value ? 'var(--primary-light)' : 'transparent',
                            color: filterYear === y.value ? 'var(--primary-dark)' : 'var(--text-dark)',
                            transition: 'background 0.15s',
                          }}
                          onMouseOver={e => { if (filterYear !== y.value) e.currentTarget.style.background = 'rgba(59,130,246,0.06)'; }}
                          onMouseOut={e => { if (filterYear !== y.value) e.currentTarget.style.background = 'transparent'; }}
                        >
                          {y.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>


          </div>

          {activeTab === 'history' ? (
            filteredTithes.length > 0 ? (
              <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Voluntário</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredTithes].sort((a, b) => new Date(b.date) - new Date(a.date)).map((tithe) => {
                      const volunteer = volunteers.find(v => v.id === tithe.volunteerId);
                      return (
                        <tr key={tithe.id}>
                          <td>{new Date(tithe.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                          <td className="font-bold">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span>{volunteer?.name || 'Desconhecido'}</span>
                              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                {volunteer?.departmentIds?.map(id => {
                                  const dept = departments?.find(d => d.id === id);
                                  return dept ? (
                                    <span key={id} style={{ fontSize: '0.65rem', fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '0.1rem 0.4rem', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                      {dept.name}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          </td>
                          <td className="font-bold" style={{ color: 'var(--primary-dark)' }}>
                            {formatCurrency(tithe.amount)}
                          </td>
                          <td><span className="badge badge-blue">Recebido</span></td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-icon"
                              onClick={() => handleDeleteClick(tithe)}
                              style={{ color: 'var(--danger)', padding: '0.25rem' }}
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Nenhum dízimo registrado.
              </div>
            )
          ) : (
            pendingVolunteers.length > 0 ? (
              <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Voluntário</th>
                      <th>Contato</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingVolunteers.map((vol) => (
                      <tr key={vol.id}>
                        <td className="font-bold">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span>{vol.name}</span>
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                              {vol.departmentIds?.map(id => {
                                const dept = departments?.find(d => d.id === id);
                                return dept ? (
                                  <span key={id} style={{ fontSize: '0.65rem', fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '0.1rem 0.4rem', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                    {dept.name}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        </td>
                        <td>{vol.contact || '-'}</td>
                        <td><span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>Pendente</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '2rem', color: isFuture ? 'var(--text-muted)' : '#16a34a' }}>
                {isFuture
                  ? <CalendarX size={36} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                  : <CheckCircle size={36} style={{ color: '#16a34a' }} />}
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {isFuture
                    ? 'Este mês ainda não chegou'
                    : 'Todos os voluntários já contribuíram!'}
                </span>
                {isFuture && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Não é possível ter pendentes em meses futuros.
                  </span>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'transparent', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '12px', maxWidth: '400px', width: '90%', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--danger)' }}>Confirmar Exclusão</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Tem certeza que deseja excluir esta contribuição? O valor será permanentemente apagado dos relatórios.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-dark)', cursor: 'pointer', fontWeight: 500 }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: 'var(--danger)', color: 'white', cursor: 'pointer', fontWeight: 500 }}
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Scanner Modal */}
      {showScanner && (
        <PdfScanner
          volunteers={volunteers}
          tithes={tithes}
          churchSettings={churchSettings}
          onRegister={registerTithe}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default Tithes;
