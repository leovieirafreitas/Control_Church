import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useChurch } from '../context/ChurchContext';
import { Plus, Users, Heart, Search, Copy, Check, Link, ChevronRight, Edit2, Trash2, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const SocialDashboard = () => {
  const { activeChurch } = useChurch();
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);
  const [editingCampaignId, setEditingCampaignId] = useState(null);

  // Formulário nova campanha
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    description: '',
    max_capacity: 100
  });

  useEffect(() => {
    if (activeChurch) {
      fetchCampaigns();
    }
  }, [activeChurch]);

  useEffect(() => {
    if (selectedCampaign) {
      fetchRegistrations(selectedCampaign.id);
    }
  }, [selectedCampaign]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('social_campaigns')
        .select(`*, social_registrations(count)`)
        .eq('church_id', activeChurch.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
      if (data && data.length > 0 && !selectedCampaign) {
        setSelectedCampaign(data[0]);
      }
    } catch (err) {
      console.error('Erro ao buscar campanhas:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async (campaignId) => {
    try {
      setLoadingRegs(true);
      const { data, error } = await supabase
        .from('social_registrations')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);
    } catch (err) {
      console.error('Erro ao buscar cadastros:', err);
    } finally {
      setLoadingRegs(false);
    }
  };

  const handleDeleteRegistration = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este cadastro?')) return;
    try {
      const { error } = await supabase
        .from('social_registrations')
        .delete()
        .eq('id', id);
      if (error) throw error;
      
      if (selectedCampaign) {
        fetchRegistrations(selectedCampaign.id);
      }
      fetchCampaigns(); // Atualiza a contagem na lista de campanhas
    } catch (err) {
      console.error('Erro ao remover cadastro:', err);
      alert('Erro ao remover cadastro.');
    }
  };

  const handleExportPDF = () => {
    if (!registrations || registrations.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }

    const doc = new jsPDF();
    
    // Header vermelho
    doc.setFillColor(239, 68, 68);
    doc.rect(0, 0, 210, 20, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Instituto Chama Social', 14, 13);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Campanha: ${selectedCampaign?.title}`, 14, 32);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Exportado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 38);
    doc.text(`Total de Cadastros: ${registrations.length} / ${selectedCampaign?.max_capacity}`, 14, 43);

    const tableColumn = ["Nome", "CPF", "RG", "Telefone", "Idade", "Família", "Data"];
    const tableRows = [];

    registrations.forEach(reg => {
      const date = new Date(reg.created_at).toLocaleDateString('pt-BR');
      const regData = [
        reg.full_name,
        reg.document_id,
        reg.rg || '-',
        reg.phone,
        reg.age.toString(),
        reg.family_size.toString(),
        date
      ];
      tableRows.push(regData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 50, right: 14, bottom: 20, left: 14 }
    });

    doc.save(`cadastros_${selectedCampaign?.title.replace(/\s+/g, '_')}.pdf`);
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      if (editingCampaignId) {
        const { error } = await supabase
          .from('social_campaigns')
          .update({
            title: newCampaign.title,
            description: newCampaign.description,
            max_capacity: parseInt(newCampaign.max_capacity) || 0
          })
          .eq('id', editingCampaignId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('social_campaigns')
          .insert([
            {
              church_id: activeChurch.id,
              title: newCampaign.title,
              description: newCampaign.description,
              max_capacity: parseInt(newCampaign.max_capacity) || 0
            }
          ]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingCampaignId(null);
      setNewCampaign({ title: '', description: '', max_capacity: 100 });
      fetchCampaigns();
    } catch (err) {
      console.error('Erro ao salvar campanha:', err);
      alert('Erro ao salvar campanha.');
    }
  };

  const handleCopyLink = (campaignId) => {
    const link = `${window.location.origin}/cadastro-social/${campaignId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(campaignId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  if (!activeChurch) return null;

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={20} color="white" />
            </div>
            Social
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
            Gerencie campanhas de doação e limites de cadastros.
          </p>
        </div>
        
        <button
          onClick={() => { setEditingCampaignId(null); setNewCampaign({ title: '', description: '', max_capacity: 100 }); setIsModalOpen(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem', borderRadius: '12px',
            background: 'var(--primary)', color: 'white',
            fontWeight: 600, fontSize: '0.9rem', border: 'none',
            cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Plus size={18} />
          Nova Campanha
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Lista de Campanhas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>Campanhas Ativas</h3>
          
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>
          ) : campaigns.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '16px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
              Nenhuma campanha criada.
            </div>
          ) : (
            campaigns.map(camp => {
              const regsCount = camp.social_registrations?.[0]?.count || 0;
              const isSelected = selectedCampaign?.id === camp.id;
              const progress = Math.min((regsCount / camp.max_capacity) * 100, 100);

              return (
                <div
                  key={camp.id}
                  onClick={() => setSelectedCampaign(camp)}
                  style={{
                    padding: '1.25rem', borderRadius: '16px',
                    background: isSelected ? 'var(--primary-light)' : 'var(--card-bg)',
                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: isSelected ? 'var(--primary-dark)' : 'var(--text-dark)' }}>{camp.title}</h4>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {camp.description || 'Sem descrição'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingCampaignId(camp.id);
                          setNewCampaign({ title: camp.title, description: camp.description || '', max_capacity: camp.max_capacity });
                          setIsModalOpen(true);
                        }}
                        style={{
                          padding: '0.4rem', borderRadius: '8px', border: 'none',
                          background: 'transparent', color: 'var(--text-muted)',
                          cursor: 'pointer', transition: '0.2s'
                        }}
                        title="Editar Campanha"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyLink(camp.id); }}
                        style={{
                          padding: '0.4rem', borderRadius: '8px', border: 'none',
                          background: 'transparent', color: copiedLink === camp.id ? 'var(--primary)' : 'var(--text-muted)',
                          cursor: 'pointer', transition: '0.2s'
                        }}
                        title="Copiar Link Público"
                      >
                        {copiedLink === camp.id ? <Check size={18} /> : <Link size={18} />}
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
                      <span>Cadastros: {regsCount} / {camp.max_capacity}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '100px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: progress >= 100 ? '#ef4444' : 'var(--primary)', borderRadius: '100px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detalhes e Cadastros */}
        <div style={{ background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border-color)', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          {selectedCampaign ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} color="var(--primary)" />
                  Pessoas Cadastradas
                </h3>
                {registrations.length > 0 && (
                  <button
                    onClick={handleExportPDF}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                      background: 'white', color: 'var(--text-dark)', fontSize: '0.85rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <Download size={16} />
                    Exportar
                  </button>
                )}
              </div>
              
              {loadingRegs ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Buscando cadastros...</div>
              ) : registrations.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Users size={40} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                  <p>Nenhuma pessoa cadastrada nesta campanha ainda.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '600px' }}>
                  {registrations.map(reg => (
                    <div key={reg.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.95rem' }}>{reg.full_name}</div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span>Doc: {reg.document_id}</span>
                          <span>Tel: {reg.phone}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span>Idade: {reg.age}</span>
                          <span>Família: {reg.family_size} pessoas</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="Editar (Em breve)">
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteRegistration(reg.id)}
                          style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', transition: '0.2s' }} 
                          title="Remover Cadastro"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Selecione uma campanha para ver os cadastros.
            </div>
          )}
        </div>
      </div>

      {/* Modal Nova Campanha */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg, #ffffff)', padding: '2.5rem', borderRadius: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', border: '1px solid var(--border-color, #e2e8f0)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={20} color="white" />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-dark, #1e293b)' }}>
                {editingCampaignId ? 'Editar Campanha' : 'Nova Campanha'}
              </h3>
            </div>
            
            <form onSubmit={handleCreateCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark, #334155)', marginBottom: '0.5rem' }}>Nome da Campanha</label>
                <input
                  type="text" required
                  placeholder="Ex: Cestas Básicas - Junho"
                  value={newCampaign.title}
                  onChange={e => setNewCampaign({...newCampaign, title: e.target.value})}
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '2px solid var(--border-color, #e2e8f0)', outline: 'none', fontSize: '0.95rem', background: 'var(--bg-color, #f8fafc)', color: 'var(--text-dark, #0f172a)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark, #334155)', marginBottom: '0.5rem' }}>Descrição (Opcional)</label>
                <textarea
                  rows={3}
                  value={newCampaign.description}
                  onChange={e => setNewCampaign({...newCampaign, description: e.target.value})}
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '2px solid var(--border-color, #e2e8f0)', outline: 'none', resize: 'vertical', fontSize: '0.95rem', background: 'var(--bg-color, #f8fafc)', color: 'var(--text-dark, #0f172a)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark, #334155)', marginBottom: '0.5rem' }}>Limite de Cadastros (Vagas)</label>
                <input
                  type="number" required min="1"
                  value={newCampaign.max_capacity}
                  onChange={e => setNewCampaign({...newCampaign, max_capacity: e.target.value})}
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '2px solid var(--border-color, #e2e8f0)', outline: 'none', fontSize: '0.95rem', background: 'var(--bg-color, #f8fafc)', color: 'var(--text-dark, #0f172a)' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: '2px solid var(--border-color, #e2e8f0)', background: 'transparent', color: 'var(--text-dark, #334155)', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: 'none', background: 'var(--primary, #3b82f6)', color: 'white', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)', transition: '0.2s' }}
                >
                  {editingCampaignId ? 'Salvar Alterações' : 'Criar Campanha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SocialDashboard;
