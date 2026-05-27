import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  MessageSquare, 
  TrendingUp, 
  Star, 
  Users, 
  Copy, 
  Check, 
  Settings,
  Plus,
  MapPin,
  Smile,
  Frown,
  Trash2,
  Calendar,
  ChevronRight,
  Meh,
  ChevronDown,
  Send,
  Loader2,
  FileDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Chart from 'react-apexcharts';
import DatePicker from '../components/DatePicker';
import ccLogo from '../assets/cc-logo-small.png';

const FeedbackDashboard = () => {
  const { activeChurch } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState({ total: 0, avg: 0 });
  const [chartData, setChartData] = useState([]);
  const [config, setConfig] = useState(null);
  const [configId, setConfigId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [newQuestionLabel, setNewQuestionLabel] = useState('');
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState((now.getMonth() + 1).toString());
  const [filterYear, setFilterYear] = useState(now.getFullYear().toString());
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const dropdownRef = useRef(null);

  const [dateRange, setDateRange] = useState({ start: '', end: '' });

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
    { value: '1', label: 'Janeiro' }, { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' }, { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' }, { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' }, { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' }, { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
  ];

  const years = [2024, 2025, 2026, 2027, 2028]
    .map(y => ({ value: y.toString(), label: y.toString() }));

  useEffect(() => {
    let start, end;
    if (filterMonth === 'all') {
      start = `${filterYear}-01-01`;
      end = `${filterYear}-12-31`;
    } else {
      const m = parseInt(filterMonth);
      const y = parseInt(filterYear);
      start = new Date(y, m - 1, 1).toISOString().split('T')[0];
      end = new Date(y, m, 0).toISOString().split('T')[0];
    }
    setDateRange({ start, end });
  }, [filterMonth, filterYear]);

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetchData();
      fetchConfig();
    }
  }, [activeChurch, dateRange]);

  const fetchConfig = async () => {
    try {
      let query = supabase.from('feedback_config').select('*');
      if (activeChurch?.id) { query = query.eq('church_id', activeChurch.id); }
      else { query = query.is('church_id', null); }
      const { data, error } = await query.maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      const defaultConfig = {
        title: 'Pesquisa CHAMA CHURCH',
        description: 'Olá, seja bem-vindo(a)! Queremos saber a sua opinião sobre sua experiência conosco.',
        questions: [
          { id: 'reception_rating', label: 'Recepção', active: true },
          { id: 'worship_rating', label: 'Louvor e Adoração', active: true },
          { id: 'facilities_rating', label: 'Instalações', active: true },
          { id: 'program_rating', label: 'Programação', active: true },
          { id: 'kids_ministry_rating', label: 'Ministério Infantil (KIDS)', active: true },
          { id: 'preaching_rating', label: 'Mensagem (Pregação)', active: true },
          { id: 'spiritual_atmosphere_rating', label: 'Atmosfera Espiritual', active: true },
        ]
      };

      if (data) {
        setConfigId(data.id);
        // Mapeia as colunas separadas para o estado 'config'
        setConfig({
          title: data.title || defaultConfig.title,
          description: data.description || defaultConfig.description,
          questions: data.questions || defaultConfig.questions
        });
      } else {
        setConfigId(null);
        setConfig(defaultConfig);
      }
    } catch (err) { 
      console.error('Error config:', err); 
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('feedbacks')
        .select('*, visitors(name)')
        .gte('created_at', dateRange.start)
        .lte('created_at', `${dateRange.end}T23:59:59`);
      if (activeChurch) { query = query.eq('church_id', activeChurch.id); }
      const { data, error } = await query;
      if (error) throw error;
      setFeedbacks(data || []);
      processStats(data || []);
    } catch (err) { console.error('Error feedbacks:', err); }
    finally { setLoading(false); }
  };

  const processStats = (data) => {
    if (!data || data.length === 0) {
      setStats({ total: 0, avg: "0.0" });
      setChartData([]);
      return;
    }
    const total = data.length;
    let sumTotal = 0;
    let countTotal = 0;
    const ratingColumns = [
      'reception_rating', 'worship_rating', 'facilities_rating', 
      'program_rating', 'kids_ministry_rating', 'preaching_rating', 
      'spiritual_atmosphere_rating'
    ];
    const categorySums = {};
    const categoryCounts = {};
    data.forEach(f => {
      ratingColumns.forEach(col => {
        const val = f[col];
        if (val !== undefined && val !== null) {
          categorySums[col] = (categorySums[col] || 0) + val;
          categoryCounts[col] = (categoryCounts[col] || 0) + 1;
          sumTotal += val;
          countTotal += 1;
        }
      });
    });
    const avgTotal = countTotal > 0 ? (sumTotal / countTotal).toFixed(1) : "0.0";
    setStats({ total, avg: avgTotal });
    const friendlyNames = {
      reception_rating: 'Recepção', worship_rating: 'Louvor', facilities_rating: 'Instalações',
      program_rating: 'Programação', kids_ministry_rating: 'Kids', preaching_rating: 'Mensagem',
      spiritual_atmosphere_rating: 'Atmosfera'
    };
    const chart = Object.keys(categorySums).map(col => ({
      name: friendlyNames[col] || col,
      avg: parseFloat((categorySums[col] / categoryCounts[col]).toFixed(1))
    }));
    setChartData(chart);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const churchName = activeChurch?.name || 'Rede Chama';
    const monthLabel = months.find(m => m.value === filterMonth)?.label || '';
    const periodLabel = filterMonth === 'all' ? `Ano ${filterYear}` : `${monthLabel} / ${filterYear}`;
    const pageWidth = doc.internal.pageSize.getWidth();

    // ── Header ──
    doc.setFillColor(5, 150, 105);
    doc.rect(0, 0, pageWidth, 32, 'F');
    
    // Add Logo (Original ratio is approx 3:1)
    try {
      doc.addImage(ccLogo, 'PNG', pageWidth - 52, 8, 39, 13, undefined, 'FAST');
    } catch (e) {
      console.error('Error adding logo to PDF:', e);
    }
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Feedback', 14, 13);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(churchName, 14, 21);
    doc.text(`Período: ${periodLabel}`, 14, 27);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - 14, 27, { align: 'right' });

    let y = 42;

    // ── Resumo ──
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Geral', 14, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Indicador', 'Valor']],
      body: [
        ['Total de Respostas', stats.total.toString()],
        ['Média Geral de Satisfação', `${stats.avg} / 5.0`],
        ['Status', parseFloat(stats.avg) >= 4.5 ? 'Excelente' : parseFloat(stats.avg) >= 4 ? 'Muito Bom' : parseFloat(stats.avg) >= 3 ? 'Bom' : 'Abaixo da Média'],
      ],
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', fontSize: 10 },
      bodyStyles: { fontSize: 10, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      margin: { left: 14, right: 14 },
      theme: 'grid',
    });

    y = doc.lastAutoTable.finalY + 12;

    // ── Categorias ──
    if (chartData.length > 0) {
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Avaliação por Categoria', 14, y);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [['Categoria', 'Média', 'Status']],
        body: chartData.map(d => [
          d.name,
          `${d.avg.toFixed(1)} / 5.0`,
          d.avg >= 4.5 ? 'Excelente' : d.avg >= 4 ? 'Muito Bom' : d.avg >= 3 ? 'Bom' : 'Abaixo da Média'
        ]),
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', fontSize: 10 },
        bodyStyles: { fontSize: 10, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [239, 246, 255] },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
        margin: { left: 14, right: 14 },
        theme: 'grid',
      });

      y = doc.lastAutoTable.finalY + 12;
    }

    // ── Comentários ──
    const comments = feedbacks.filter(f => f.comments);
    if (comments.length > 0) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Comentários dos Membros', 14, y);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [['Data', 'Comentário', 'Média']],
        body: comments.map(f => {
          const ratings = [
            f.reception_rating, f.worship_rating, f.facilities_rating,
            f.program_rating, f.kids_ministry_rating, f.preaching_rating, f.spiritual_atmosphere_rating
          ].filter(v => v !== null && v !== undefined);
          const avg = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '-';
          return [
            new Date(f.created_at).toLocaleDateString('pt-BR'),
            f.comments,
            avg
          ];
        }),
        headStyles: { fillColor: [100, 116, 139], textColor: 255, fontStyle: 'bold', fontSize: 10 },
        bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 18, halign: 'center' } },
        margin: { left: 14, right: 14 },
        theme: 'grid',
      });
    } else {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text('Nenhum comentário registrado no período.', 14, y + 8);
    }

    // ── Footer ──
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text(`${churchName} — Relatório de Feedback — ${periodLabel}`, 14, doc.internal.pageSize.getHeight() - 8);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    }

    doc.save(`feedback_${churchName.replace(/\s+/g, '_')}_${periodLabel.replace(/\s+\/\s+/g, '_')}.pdf`);
  };

  const copyLink = () => {
    let slug = '';
    if (activeChurch) {
      slug = activeChurch.name
        .toLowerCase()
        .replace('chama church - ', '')
        .replace('chama church ', '')
        .trim()
        .replace(/\s+/g, '-');
    }
    const baseUrl = import.meta.env.VITE_APP_URL || 'https://chamachurch.com.br';
    const link = `${baseUrl}/pesquisa${slug ? `/${slug}` : ''}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveConfig = async () => {
    if (!activeChurch?.id) {
      alert('Selecione uma igreja ativa para salvar as configurações.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        church_id: activeChurch.id,
        title: config.title,
        description: config.description,
        questions: config.questions,
        updated_at: new Date().toISOString()
      };

      let result;
      if (configId) {
        result = await supabase
          .from('feedback_config')
          .update(payload)
          .eq('id', configId);
      } else {
        result = await supabase
          .from('feedback_config')
          .insert(payload)
          .select()
          .single();
        if (!result.error && result.data) {
          setConfigId(result.data.id);
        }
      }

      if (result.error) throw result.error;
      alert('Configurações salvas com sucesso!');
    } catch (err) { 
      console.error('Save error:', err);
      alert('Erro ao salvar configurações: ' + (err.message || 'Erro desconhecido')); 
    }
    finally { setSaving(false); }
  };

  // IDs dos campos padrão que não podem ser removidos
  const DEFAULT_QUESTION_IDS = [
    'reception_rating', 'worship_rating', 'facilities_rating',
    'program_rating', 'kids_ministry_rating', 'preaching_rating',
    'spiritual_atmosphere_rating'
  ];

  const addQuestion = () => {
    const label = newQuestionLabel.trim();
    if (!label) return;
    // Gera um ID único baseado no timestamp
    const id = `custom_${Date.now()}`;
    setConfig(prev => ({
      ...prev,
      questions: [...(prev.questions || []), { id, label, active: true }]
    }));
    setNewQuestionLabel('');
  };

  const removeQuestion = (index) => {
    setConfig(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const dropBtn = (active) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    padding: '0.6rem 1.8rem',
    background: active ? '#3b82f6' : '#ffffff',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 700,
    color: active ? 'white' : '#334155',
    boxShadow: active ? '0 4px 15px rgba(59,130,246,0.4)' : '0 2px 4px rgba(0,0,0,0.05)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  });

  const pickerBtnStyle = (key) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
    padding: '0.45rem 1rem',
    background: dropdownOpen === key ? 'var(--primary-light)' : '#ffffff',
    border: `1.5px solid ${dropdownOpen === key ? 'var(--primary)' : '#e2e8f0'}`,
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 700,
    color: dropdownOpen === key ? 'var(--primary-dark)' : '#334155',
    boxShadow: dropdownOpen === key ? '0 0 0 3px var(--primary-light)' : '0 1px 2px rgba(0,0,0,0.05)',
    transition: 'all 0.2s',
    minWidth: key === 'month' ? '140px' : '90px'
  });

  const dropPanel = {
    position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: '100%', zIndex: 1000,
    background: '#ffffff',
    border: '1.5px solid var(--primary)',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(59,130,246,0.15)',
    padding: '0.35rem',
    maxHeight: '220px', overflowY: 'auto',
  };

  const dropItem = (active) => ({
    padding: '0.5rem 0.75rem', cursor: 'pointer', borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: active ? 700 : 500,
    background: active ? 'var(--primary-light)' : 'transparent',
    color: active ? 'var(--primary-dark)' : '#334155',
    transition: 'background 0.15s',
  });

  if (!config && loading) return <div className="p-20 text-center text-muted">Carregando painel...</div>;

  return (
    <div className="animate-fade-in dashboard-main-wrapper" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
      
      {/* ── Top Header ── */}
      <div className="dashboard-header" style={{ flexShrink: 0, marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Feedback Dashboard</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Análise de satisfação e experiência dos membros</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '14px' }}>
            <button onClick={() => setActiveTab('overview')} style={dropBtn(activeTab === 'overview')}>Visão Geral</button>
            <button onClick={() => setActiveTab('comments')} style={dropBtn(activeTab === 'comments')}>Comentários</button>
            <button onClick={() => setActiveTab('settings')} style={dropBtn(activeTab === 'settings')}>Ajustes</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative', zIndex: 1100 }} ref={dropdownRef}>
            {/* Month */}
            <div style={{ position: 'relative' }}>
              <button style={pickerBtnStyle('month')}
                onClick={() => setDropdownOpen(dropdownOpen === 'month' ? null : 'month')}>
                <span>{months.find(m => m.value === filterMonth)?.label}</span>
                <ChevronDown size={16} style={{
                  color: dropdownOpen === 'month' ? 'var(--primary)' : '#94a3b8',
                  transition: 'transform 0.25s ease',
                  transform: dropdownOpen === 'month' ? 'rotate(180deg)' : 'rotate(0deg)',
                }} />
              </button>
              {dropdownOpen === 'month' && (
                <div style={dropPanel}>
                  {months.map(m => (
                    <div key={m.value}
                      style={dropItem(filterMonth === m.value)}
                      onClick={() => { setFilterMonth(m.value); setDropdownOpen(null); }}
                    >{m.label}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Year */}
            <div style={{ position: 'relative' }}>
              <button style={pickerBtnStyle('year')}
                onClick={() => setDropdownOpen(dropdownOpen === 'year' ? null : 'year')}>
                <span>{years.find(y => y.value === filterYear)?.label}</span>
                <ChevronDown size={16} style={{
                  color: dropdownOpen === 'year' ? 'var(--primary)' : '#94a3b8',
                  transition: 'transform 0.25s ease',
                  transform: dropdownOpen === 'year' ? 'rotate(180deg)' : 'rotate(0deg)',
                }} />
              </button>
              {dropdownOpen === 'year' && (
                <div style={dropPanel}>
                  {years.map(y => (
                    <div key={y.value}
                      style={dropItem(filterYear === y.value)}
                      onClick={() => { setFilterYear(y.value); setDropdownOpen(null); }}
                    >{y.label}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={exportPDF}
            style={{
              borderRadius: '20px', height: '44px', padding: '0 1.5rem',
              display: 'flex', gap: '0.6rem', alignItems: 'center',
              background: '#ffffff', color: '#475569', border: '1.5px solid #e2e8f0',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#059669'; e.currentTarget.style.color = '#059669'; e.currentTarget.style.background = '#f0fdf4'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = '#ffffff'; }}
          >
            <FileDown size={18} />
            Relatório PDF
          </button>

          <button 
            onClick={copyLink} 
            style={{ 
              borderRadius: '20px', height: '44px', padding: '0 1.5rem', 
              display: 'flex', gap: '0.6rem', alignItems: 'center',
              background: '#3b82f6', color: 'white', border: 'none',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(59,130,246,0.2)'
            }}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Link Copiado' : 'Link da Pesquisa'}
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
          
          {/* Status Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1.25rem' }}>
            <div style={{ 
              background: parseFloat(stats.avg) >= 4 ? '#059669' : parseFloat(stats.avg) >= 3 ? '#3b82f6' : '#ef4444',
              borderRadius: '20px', padding: '1.25rem 2rem', color: 'white', display: 'flex', alignItems: 'center', gap: '1.5rem',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              transition: 'all 0.4s ease'
            }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {parseFloat(stats.avg) >= 4 ? (
                  <Smile size={28} color="white" strokeWidth={2.5} />
                ) : parseFloat(stats.avg) >= 3 ? (
                  <Meh size={28} color="white" strokeWidth={2.5} />
                ) : (
                  <Frown size={28} color="white" strokeWidth={2.5} />
                )}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9, fontWeight: 500 }}>Status de Satisfação</p>
                <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
                  {parseFloat(stats.avg) >= 4.5 ? 'Excelente' : parseFloat(stats.avg) >= 4 ? 'Muito Bom' : parseFloat(stats.avg) >= 3 ? 'Bom' : 'Abaixo da Média'}
                </h2>
              </div>
            </div>

            <div className="card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ background: '#ecfdf5', color: '#059669', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={24} />
              </div>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Média Geral</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{stats.avg}</h3>
              </div>
            </div>

            <div className="card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ background: '#eff6ff', color: '#3b82f6', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={24} />
              </div>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Respostas</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{stats.total}</h3>
              </div>
            </div>
          </div>

          {/* Main Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.75rem' }}>
              <div className="flex justify-between items-center mb-8">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>Evolução do NPS</h3>
              </div>
              <div style={{ height: '300px' }}>
                <Chart 
                  type="line"
                  height="100%"
                  series={[{ name: 'Nota', data: chartData.map(d => d.avg) }]}
                  options={{
                    chart: { toolbar: { show: false }, zoom: { enabled: false } },
                    stroke: { curve: 'smooth', width: 4, colors: ['#059669'] },
                    markers: { size: 6, colors: ['#059669'], strokeColors: '#fff', strokeWidth: 3 },
                    dataLabels: { enabled: true, offsetY: -12, style: { fontSize: '11px', colors: ['#059669'], fontWeight: 600 } },
                    grid: { borderColor: '#f1f5f9', strokeDashArray: 5 },
                    xaxis: { 
                      categories: chartData.map(d => d.name),
                      labels: { 
                        style: { colors: '#94a3b8', fontSize: '10px', fontWeight: 600 },
                        rotate: -30,
                        rotateAlways: false
                      },
                      axisBorder: { show: false }, axisTicks: { show: false }
                    },
                    yaxis: { max: 5, min: 0, labels: { style: { colors: '#94a3b8', fontSize: '11px' } } }
                  }}
                />
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', marginBottom: '0.75rem' }}>Categorias</h3>
              <div style={{ flex: 1, marginTop: '-10px' }}>
                <Chart 
                  type="bar"
                  height="100%"
                  series={[{ name: 'Média', data: chartData.map(d => d.avg) }]}
                  options={{
                    chart: { toolbar: { show: false }, padding: { left: 0, right: 0 } },
                    plotOptions: { bar: { horizontal: true, borderRadius: 8, barHeight: '65%', distributed: true } },
                    colors: chartData.map(d => d.avg >= 4 ? '#10b981' : d.avg >= 3 ? '#3b82f6' : '#f43f5e'),
                    fill: {
                      type: 'gradient',
                      gradient: {
                        shade: 'light',
                        type: "horizontal",
                        shadeIntensity: 0.25,
                        gradientToColors: chartData.map(d => d.avg >= 4 ? '#34d399' : d.avg >= 3 ? '#60a5fa' : '#fb7185'),
                        inverseColors: true,
                        opacityFrom: 0.9,
                        opacityTo: 0.95,
                        stops: [50, 100]
                      }
                    },
                    dataLabels: { 
                      enabled: true, 
                      formatter: (v) => v.toFixed(1), 
                      style: { fontSize: '12px', fontWeight: 700, colors: ['#fff'] },
                      dropShadow: { enabled: true, top: 1, left: 1, blur: 1, opacity: 0.3 }
                    },
                    xaxis: { categories: chartData.map(d => d.name), labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
                    yaxis: { labels: { style: { colors: '#475569', fontSize: '12px', fontWeight: 600 } } },
                    grid: { 
                      show: false,
                      padding: { top: -20, bottom: -10, left: 15, right: 0 }
                    },
                    states: {
                      hover: { filter: { type: 'none' } },
                      active: { filter: { type: 'none' } }
                    },
                    tooltip: { 
                      enabled: true, 
                      y: { formatter: (v) => v.toFixed(1) + " / 5.0" },
                      theme: 'light',
                      style: { fontSize: '12px', fontFamily: 'Inter' }
                    },
                    legend: { show: false }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Feedback List */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Últimos feedbacks</h3>
              <button 
                onClick={() => setActiveTab('comments')}
                style={{ 
                  background: 'none', border: 'none', color: 'var(--primary)', 
                  fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  padding: '0.5rem 0.75rem', borderRadius: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-light)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                Ver todos <ChevronRight size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {feedbacks.length > 0 ? (
                feedbacks.slice(0, 5).map((f, i) => (
                  <div key={i} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #f1f5f9', transition: 'transform 0.2s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div style={{ 
                        width: '48px', height: '48px', borderRadius: '50%', 
                        background: (f.reception_rating || 5) >= 4 ? '#ecfdf5' : '#fef2f2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: (f.reception_rating || 5) >= 4 ? '#059669' : '#ef4444',
                        boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.05)'
                      }}>
                        { (f.reception_rating || 5) >= 4 ? <Smile size={28} /> : <Frown size={28} /> }
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span style={{ fontWeight: 700, color: '#334155', fontSize: '1rem' }}>{f.visitors?.name ? `Visitante: ${f.visitors.name}` : 'Membro Anônimo'}</span>
                          <span style={{ background: '#f0fdf4', color: '#166534', fontSize: '10px', padding: '3px 10px', borderRadius: '8px', fontWeight: 800, textTransform: 'uppercase' }}>Respondido</span>
                          {f.comments && <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '10px', padding: '3px 10px', borderRadius: '8px', fontWeight: 800, textTransform: 'uppercase' }}>Comentário</span>}
                        </div>
                        {f.comments ? (
                          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', lineHeight: '1.5' }}>"{f.comments}"</p>
                        ) : (
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Nenhum comentário adicional deixado.</p>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', borderLeft: '1px solid #f1f5f9', paddingLeft: '1.5rem' }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#334155', fontWeight: 700 }}>{new Date(f.created_at).toLocaleDateString('pt-BR')}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>às {new Date(f.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '20px', border: '2px dashed #e2e8f0' }}>
                  <MessageSquare size={56} style={{ margin: '0 auto 1.5rem', opacity: 0.1 }} />
                  <p style={{ fontWeight: 600 }}>Nenhum feedback registrado no período selecionado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Todos os Comentários</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {feedbacks.filter(f => f.comments).map((f, i) => (
              <div key={i} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #f1f5f9', transition: 'transform 0.2s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ 
                    width: '48px', height: '48px', borderRadius: '50%', 
                    background: (f.reception_rating || 5) >= 4 ? '#ecfdf5' : '#fef2f2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: (f.reception_rating || 5) >= 4 ? '#059669' : '#ef4444',
                    boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.05)'
                  }}>
                    { (f.reception_rating || 5) >= 4 ? <Smile size={28} /> : <Frown size={28} /> }
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span style={{ fontWeight: 700, color: '#334155', fontSize: '1rem' }}>{f.visitors?.name ? `Visitante: ${f.visitors.name}` : 'Membro Anônimo'}</span>
                      <span style={{ background: '#f0fdf4', color: '#166534', fontSize: '10px', padding: '3px 10px', borderRadius: '8px', fontWeight: 800, textTransform: 'uppercase' }}>Respondido</span>
                      <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '10px', padding: '3px 10px', borderRadius: '8px', fontWeight: 800, textTransform: 'uppercase' }}>Comentário</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', lineHeight: '1.5' }}>"{f.comments}"</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', borderLeft: '1px solid #f1f5f9', paddingLeft: '1.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#334155', fontWeight: 700 }}>{new Date(f.created_at).toLocaleDateString('pt-BR')}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>às {new Date(f.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <div className="card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>Configurações do Formulário</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Personalize como os membros visualizam sua pesquisa de feedback.</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Título do Formulário</label>
                <input 
                  type="text" 
                  value={config?.title || ''} 
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  placeholder="Ex: Pesquisa de Satisfação - Chama Church"
                  style={{ 
                    width: '100%', padding: '0.875rem 1rem', borderRadius: '12px', border: '2px solid #e2e8f0',
                    fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Descrição / Boas-vindas</label>
                <textarea 
                  value={config?.description || ''} 
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  placeholder="Mensagem que aparece abaixo do título..."
                  style={{ 
                    width: '100%', padding: '0.875rem 1rem', borderRadius: '12px', border: '2px solid #e2e8f0',
                    fontSize: '0.95rem', outline: 'none', minHeight: '100px', resize: 'vertical'
                  }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '1rem', textTransform: 'uppercase' }}>Campos de Avaliação</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {config?.questions?.map((q, i) => (
                    <div key={q.id} style={{ 
                      background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0',
                      display: 'flex', alignItems: 'center', gap: '1rem', transition: 'all 0.2s'
                    }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <input 
                          type="text" 
                          value={q.label} 
                          onChange={(e) => {
                            const newQs = [...config.questions];
                            newQs[i].label = e.target.value;
                            setConfig({ ...config, questions: newQs });
                          }}
                          style={{ 
                            width: '100%', 
                            background: '#ffffff', 
                            border: '1.5px solid #cbd5e1', 
                            borderRadius: '8px',
                            fontSize: '0.95rem', 
                            fontWeight: 600, 
                            color: '#1e293b', 
                            padding: '0.5rem 0.75rem', 
                            outline: 'none',
                            transition: 'all 0.2s'
                          }}
                          onFocus={e => {
                            e.target.style.borderColor = '#3b82f6';
                            e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                          }}
                          onBlur={e => {
                            e.target.style.borderColor = '#cbd5e1';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '130px', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: q.active ? '#059669' : '#94a3b8' }}>
                          {q.active ? 'Ativo' : 'Inativo'}
                        </span>
                        <button 
                          onClick={() => {
                            const newQs = [...config.questions];
                            newQs[i].active = !newQs[i].active;
                            setConfig({ ...config, questions: newQs });
                          }}
                          style={{
                            width: '40px', height: '22px', borderRadius: '11px', border: 'none',
                            background: q.active ? '#10b981' : '#cbd5e1', cursor: 'pointer',
                            position: 'relative', transition: 'all 0.3s', flexShrink: 0
                          }}
                        >
                          <div style={{
                            width: '18px', height: '18px', background: 'white', borderRadius: '50%',
                            position: 'absolute', top: '2px', left: q.active ? '20px' : '2px',
                            transition: 'all 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }} />
                        </button>
                        {/* Botão excluir — apenas para campos personalizados */}
                        {!DEFAULT_QUESTION_IDS.includes(q.id) && (
                          <button
                            onClick={() => removeQuestion(i)}
                            className="btn-icon danger"
                            title="Remover campo"
                            style={{ width: '32px', height: '32px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Adicionar Novo Campo */}
                  <div style={{
                    marginTop: '0.5rem',
                    border: '2px dashed #cbd5e1',
                    borderRadius: '16px',
                    padding: '1rem',
                    background: '#f8fafc',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'center'
                  }}>
                    <input
                      type="text"
                      value={newQuestionLabel}
                      onChange={e => setNewQuestionLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addQuestion()}
                      placeholder="Nome do novo campo (ex: Estacionamento)..."
                      style={{
                        flex: 1,
                        padding: '0.6rem 0.875rem',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '0.9rem',
                        outline: 'none',
                        background: '#fff',
                        transition: 'all 0.2s'
                      }}
                      onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                    />
                    <button
                      onClick={addQuestion}
                      disabled={!newQuestionLabel.trim()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.6rem 1.1rem',
                        background: newQuestionLabel.trim() ? '#3b82f6' : '#e2e8f0',
                        color: newQuestionLabel.trim() ? '#fff' : '#94a3b8',
                        border: 'none', borderRadius: '10px',
                        fontWeight: 700, fontSize: '0.85rem',
                        cursor: newQuestionLabel.trim() ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap', flexShrink: 0
                      }}
                    >
                      <Plus size={16} /> Adicionar
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={saveConfig} 
                disabled={saving}
                style={{ 
                  height: '52px', fontSize: '1rem', fontWeight: 700, borderRadius: '20px',
                  background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer',
                  width: '100%', marginTop: '1.5rem', boxShadow: '0 4px 15px rgba(59,130,246,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                {saving ? 'Salvando...' : 'Publicar Alterações'}
              </button>
            </div>
          </div>
          <div style={{ height: '5rem' }} />
        </div>
      )}

      <style>{`
        .dp-compact .dp-trigger {
          padding: 0.5rem 1rem !important;
          font-size: 0.85rem !important;
          border-radius: 10px !important;
          background: white !important;
          border: 1px solid #e2e8f0 !important;
        }
        .dp-compact .dp-trigger:hover { border-color: var(--primary) !important; }
      `}</style>

    </div>
  );
};

export default FeedbackDashboard;
