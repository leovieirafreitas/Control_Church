import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { DollarSign, Download, Trash2, X } from 'lucide-react';
import VolunteerSearch from '../components/VolunteerSearch';
import DatePicker from '../components/DatePicker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Tithes = () => {
  const { volunteers, tithes, registerTithe, deleteTithe } = useApp();
  const [formData, setFormData] = useState({
    volunteerId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const [filterMonth, setFilterMonth] = useState('all');
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
    
    if (searchVolunteer.trim() !== '') {
      const volunteer = volunteers.find(v => v.id === t.volunteerId);
      if (!volunteer || !volunteer.name.toLowerCase().includes(searchVolunteer.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  });

  const totalAmount = filteredTithes.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Relatorio de Contribuicoes (Dizimos)', 14, 22);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periodo: ${months.find(m => m.value === filterMonth)?.label} de ${filterYear === 'all' ? 'Todos os Anos' : filterYear}`, 14, 30);
    if (searchVolunteer.trim() !== '') {
      doc.text(`Filtro de Membro: ${searchVolunteer}`, 14, 36);
    }

    const tableColumn = ["Data", "Voluntario", "Valor", "Status"];
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
      startY: searchVolunteer.trim() !== '' ? 42 : 36,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }
    });

    const finalY = doc.lastAutoTable?.finalY || 42;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Contribuido: ${formatCurrency(totalAmount)}`, 14, finalY + 10);

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
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl">Dízimos</h2>
        <p className="text-muted">Registro e controle de dizimistas</p>
      </div>

      <div className="grid grid-cols-3 mb-8">
        {/* Formulário */}
        <div className="card h-fit">
          <h3 className="text-xl mb-4">Registrar Dízimo</h3>
          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label className="form-label">Voluntário</label>
              <VolunteerSearch
                volunteers={volunteers}
                value={formData.volunteerId}
                onChange={(id) => setFormData({ ...formData, volunteerId: id })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                placeholder="0,00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Data</label>
              <DatePicker
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary mt-2"
              style={{ width: '100%' }}
              disabled={!formData.volunteerId || !formData.amount || !formData.date}
            >
              Confirmar
            </button>
          </form>
        </div>

        {/* Histórico */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 className="text-xl">Histórico de Dízimos</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} ref={dropdownRef}>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '0.35rem 0.75rem', height: 'auto', fontSize: '0.875rem', fontWeight: 600 }}
                  onClick={() => {
                    const now = new Date();
                    setFilterMonth((now.getMonth() + 1).toString());
                    setFilterYear(now.getFullYear().toString());
                  }}
                >
                  Hoje
                </button>

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
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'var(--bg-color)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Pesquisar por voluntário..." 
                value={searchVolunteer} 
                onChange={e => setSearchVolunteer(e.target.value)} 
                style={{ width: '100%', maxWidth: '350px', background: 'transparent' }} 
              />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Filtrado</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary-dark)', fontSize: '1.5rem', lineHeight: 1 }}>{formatCurrency(totalAmount)}</span>
                </div>
                <button 
                  onClick={exportPDF} 
                  className="btn btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                  disabled={filteredTithes.length === 0}
                >
                  <Download size={18} />
                  Exportar PDF
                </button>
              </div>
            </div>
          </div>
          {filteredTithes.length > 0 ? (
            <div className="table-container">
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
                        <td className="font-bold">{volunteer?.name || 'Desconhecido'}</td>
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
    </div>
  );
};

export default Tithes;
