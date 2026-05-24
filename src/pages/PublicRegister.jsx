import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  UserCheck, Phone, User, Church, CheckCircle2,
  Loader2, Search, Check,
  ChevronRight, ArrowLeft, Heart, Sparkles, ChevronDown, Shield,
  Calendar
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useChurch } from '../context/ChurchContext';
import { supabase } from '../lib/supabase';
import Dropdown from '../components/Dropdown';
import { MANAUS_NEIGHBORHOODS_TO_ZONES } from '../utils/manausMapping';
import logoImg from '../assets/cc-logo.webp';

const MODES = {
  VOLUNTEER: 'voluntario',
  REGISTER: 'visitante',
  COORDINATOR: 'coordenador'
};



const PublicRegister = () => {
  const { type } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { churches } = useChurch();
  const { addVisitor, addVolunteer, addLeader } = useApp();

  // churchId pode vir da query string ?church=ID ou ?church=cidade-nova
  const rawUrlChurchId = searchParams.get('church') || '';

  const [mode, setMode] = useState(type || null);
  const [form, setForm] = useState({ name: '', phone: '', churchId: rawUrlChurchId || '', neighborhood: '', maritalStatus: '', age: '' });

  // Resolve o slug para o ID correto quando as igrejas carregarem
  useEffect(() => {
    if (rawUrlChurchId && rawUrlChurchId.length < 30 && churches && churches.length > 0) {
      const slugStr = rawUrlChurchId.toLowerCase().replace(/-/g, ' ');
      const matched = churches.find(c => c.name.toLowerCase().includes(slugStr));
      if (matched && form.churchId !== matched.id) {
        setForm(prev => ({ ...prev, churchId: matched.id }));
      }
    } else if (rawUrlChurchId && rawUrlChurchId.length >= 30 && form.churchId !== rawUrlChurchId) {
      setForm(prev => ({ ...prev, churchId: rawUrlChurchId }));
    }
  }, [rawUrlChurchId, churches]);
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeZone, setActiveZone] = useState('Todos');
  const [nbSearch, setNbSearch] = useState('');
  const [dbDepartments, setDbDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [deptSearch, setDeptSearch] = useState('');
  const [isChurchOpen, setIsChurchOpen] = useState(false);
  const [apiNeighborhoods, setApiNeighborhoods] = useState([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  const GOOGLE_MAPS_API_KEY = 'AIzaSyAuIuAjS-p0SoRcKvVQm50TKEnJ6-QmoY8';

  const handleGoogleSearch = async () => {
    if (!nbSearch || nbSearch.length < 3) return;
    setIsSearchingApi(true);
    try {
      const query = encodeURIComponent(`${nbSearch}, Manaus, Amazonas`);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const json = await response.json();

      if (json.status === 'OK' && json.results.length > 0) {
        // Tenta extrair o nome do bairro (neighborhood) ou sublocality
        const components = json.results[0].address_components;
        const neighborhoodComp = components.find(c =>
          c.types.includes('neighborhood') ||
          c.types.includes('sublocality') ||
          c.types.includes('sublocality_level_1')
        );

        if (neighborhoodComp) {
          const nbName = neighborhoodComp.long_name;
          if (!allNeighborhoods.includes(nbName) && !apiNeighborhoods.includes(nbName)) {
            setApiNeighborhoods(p => [...p, nbName]);
            if (isCoordinator) {
              if (!selectedNeighborhoods.includes(nbName)) {
                setSelectedNeighborhoods(p => [...p, nbName]);
              }
            } else {
              setForm(p => ({ ...p, neighborhood: nbName }));
            }
            setNbSearch('');
            alert(`Bairro encontrado: ${nbName}`);
          } else {
            alert(`O bairro "${nbName}" já está na lista.`);
          }
        } else {
          alert("Não conseguimos identificar um bairro específico nesta busca. Tente ser mais específico.");
        }
      } else {
        alert("Nenhum local encontrado no Google Maps com esse nome.");
      }
    } catch (error) {
      console.error("Erro na busca do Google:", error);
      alert("Erro ao conectar com o Google Maps.");
    } finally {
      setIsSearchingApi(false);
    }
  };

  const isVolunteer = mode === MODES.VOLUNTEER;
  const isCoordinator = mode === MODES.COORDINATOR;
  const isVisitor = mode === MODES.REGISTER;

  const accent = isVisitor ? '#f97316' : '#3b82f6';
  const accentDark = isVisitor ? '#ea580c' : '#2563eb';
  const accentAlpha = isVisitor ? 'rgba(249,115,22,0.10)' : 'rgba(59,130,246,0.10)';
  const accentGradient = `linear-gradient(135deg, ${accent}, ${accentDark})`;

  useEffect(() => {
    if (type && Object.values(MODES).includes(type)) setMode(type);
    else if (!type) setMode(null);
  }, [type]);

  // Busca departamentos do banco quando a igreja é selecionada e o ID é um UUID válido
  useEffect(() => {
    if (!form.churchId || form.churchId.length < 30) { setDbDepartments([]); return; }
    setLoadingDepts(true);
    supabase
      .from('departments')
      .select('id, name')
      .eq('church_id', form.churchId)
      .order('name')
      .then(({ data }) => {
        setDbDepartments(data ?? []);
        setLoadingDepts(false);
      });
  }, [form.churchId]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    // Mantém o churchId na query string ao navegar entre as telas
    const churchQuery = rawUrlChurchId ? `?church=${rawUrlChurchId}` : '';
    setForm({ name: '', phone: '', churchId: form.churchId || rawUrlChurchId || '', neighborhood: '', maritalStatus: '', age: '' });
    setSelectedDeptIds([]);
    setSelectedNeighborhoods([]);
    if (newMode) navigate(`/register/${newMode}${churchQuery}`);
    else navigate(`/register${churchQuery}`);
  };

  const maskPhone = (val) =>
    val.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1');

  const toggleDept = (id) => setSelectedDeptIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleNeighborhood = (nb) => setSelectedNeighborhoods(p => p.includes(nb) ? p.filter(x => x !== nb) : [...p, nb]);

  const neighborhoodsByZone = Object.entries(MANAUS_NEIGHBORHOODS_TO_ZONES).reduce((acc, [nb, zone]) => {
    const shortZone = zone.replace('Zona ', '');
    if (!acc[shortZone]) acc[shortZone] = [];
    acc[shortZone].push(nb);
    return acc;
  }, {});

  // Detecta se o link vem do perfil da Ponta Negra para restringir zonas
  const activeChurchName = churches.find(c => c.id === form.churchId)?.name ?? '';
  const isPontaNegra = activeChurchName.toLowerCase().includes('ponta negra');

  // Zonas permitidas conforme o perfil da igreja
  // Ponta Negra: apenas Oeste e Centro-Oeste
  const allowedZones = isPontaNegra
    ? ['Oeste', 'Centro-Oeste']
    : Object.keys(neighborhoodsByZone).sort();

  // Lista de bairros filtrada pelas zonas permitidas
  const allNeighborhoods = isPontaNegra
    ? [...(neighborhoodsByZone['Oeste'] ?? []), ...(neighborhoodsByZone['Centro-Oeste'] ?? [])].sort()
    : Object.keys(MANAUS_NEIGHBORHOODS_TO_ZONES).sort();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validações Obrigatórias
    if (!form.churchId) {
      alert("Por favor, selecione uma Unidade (Igreja).");
      return;
    }
    if (!form.name?.trim()) {
      alert("Por favor, preencha o seu nome.");
      return;
    }
    if (!form.phone?.trim() || form.phone.length < 10) {
      alert("Por favor, preencha um WhatsApp válido.");
      return;
    }
    if (isVisitor && !form.neighborhood) {
      alert("Por favor, selecione o seu bairro.");
      return;
    }
    if (isVisitor && !form.maritalStatus) {
      alert("Por favor, selecione o seu estado civil.");
      return;
    }
    if (isVisitor && !form.age) {
      alert("Por favor, preencha a sua idade.");
      return;
    }
    if (isCoordinator && selectedNeighborhoods.length === 0) {
      alert("Por favor, selecione ao menos um bairro de atuação.");
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (isVolunteer) res = await addVolunteer({ ...form, departmentIds: selectedDeptIds });
      else if (isCoordinator) res = await addLeader({ ...form, neighborhoods: selectedNeighborhoods.join(', ') });
      else res = await addVisitor(form);

      if (res?.error) {
        alert("Ocorreu um erro no cadastro: " + res.error.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      alert("Ocorreu um erro no cadastro: " + err.message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        .pr-page {
          font-family: 'Inter', sans-serif;
          min-height: 100dvh;
          width: 100%;
          background: #f0f6ff;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2.5rem 1rem;
          position: relative;
          overflow-x: hidden;
          overflow-y: auto;
        }

        @media (max-width: 500px) {
          .pr-page { padding: 1.5rem 1rem; }
        }

        .pr-orb {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(90px);
          opacity: 0.35;
          z-index: 0;
        }
        .pr-orb-1 { top: -10%; left: -8%; width: 380px; height: 380px; background: radial-gradient(circle, #3b82f6, #2563eb); }
        .pr-orb-2 { bottom: -10%; right: -8%; width: 320px; height: 320px; background: radial-gradient(circle, #3b82f6, #1d4ed8); }

        .pr-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 460px;
          margin: auto;
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.75);
          border-radius: 24px;
          padding: 2rem;
          box-shadow: 0 20px 40px -12px rgba(59,130,246,0.12), 0 4px 12px rgba(0,0,0,0.06);
          animation: prFadeIn 0.4s ease-out;
        }

        @keyframes prFadeIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 500px) {
          .pr-card { padding: 1.5rem 1.25rem; border-radius: 20px; }
          .pr-page { padding: 1rem 0.75rem; justify-content: flex-start; padding-top: 1.5rem; }
        }

        .pr-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: #f0f6ff;
          border-radius: 14px;
          padding: 4px;
          margin-bottom: 1.5rem;
        }
        .pr-tab {
          padding: 0.65rem;
          border-radius: 10px;
          border: none;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: #94a3b8;
          font-family: inherit;
        }
        .pr-tab.active {
          background: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .pr-section-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .pr-section-icon {
          width: 42px; height: 42px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .pr-section-title {
          font-size: 1.05rem; font-weight: 700; color: #0f172a; line-height: 1.2;
        }
        .pr-section-sub {
          font-size: 0.78rem; color: #64748b; margin-top: 2px;
        }

        .pr-field { margin-bottom: 1rem; }
        .pr-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
          margin-bottom: 0.35rem;
          margin-left: 2px;
        }
        .pr-input-wrap { position: relative; }
        .pr-input-icon {
          position: absolute; left: 0.875rem; top: 50%;
          transform: translateY(-50%);
          color: #94a3b8; pointer-events: none; z-index: 10;
          display: flex; align-items: center;
        }
        .pr-select-arrow {
          position: absolute; right: 1rem; top: 50%;
          transform: translateY(-50%);
          color: #94a3b8; pointer-events: none; z-index: 10;
          display: flex; align-items: center;
        }
        .pr-input {
          width: 100%; height: 48px;
          padding: 0 1rem 0 2.75rem;
          border-radius: 12px;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          font-size: 16px; color: #0f172a;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          font-family: inherit;
          box-sizing: border-box;
        }
        .pr-input:focus {
          border-color: var(--pr-accent);
          background: #fff;
          box-shadow: 0 0 0 3px var(--pr-accent-alpha);
        }
        .pr-input::placeholder { color: #94a3b8; }
        .pr-select { appearance: none; cursor: pointer; }
        
        .pr-custom-select {
          display: flex; align-items: center; cursor: pointer; user-select: none;
        }
        .pr-dropdown {
          position: absolute; top: 100%; left: 0; right: 0;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-top: 4px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
          z-index: 50;
          max-height: 220px; overflow-y: auto;
          padding: 6px;
        }
        .pr-dropdown-item {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.65rem 1rem;
          border-radius: 8px; cursor: pointer;
          font-size: 0.88rem; font-weight: 500; color: #475569;
          transition: background 0.15s, color 0.15s;
        }
        .pr-dropdown-item:hover, .pr-dropdown-item.selected {
          background: #f1f5f9; color: #0f172a;
        }
        .pr-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 40;
        }

        /* Departamentos */
        .pr-dept-loading {
          text-align: center; padding: 1rem;
          color: #94a3b8; font-size: 0.82rem;
        }

        .pr-dept-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        @media (max-width: 360px) {
          .pr-dept-grid { grid-template-columns: 1fr; }
        }
        .pr-dept-item {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.65rem 0.75rem;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.18s;
          font-family: inherit;
          text-align: left;
        }
        .pr-dept-item:hover { border-color: var(--pr-accent); }
        .pr-dept-item.active {
          border-color: var(--pr-accent);
          background: var(--pr-accent-alpha);
        }
        .pr-check {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid #e2e8f0;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.18s;
        }
        .pr-dept-item.active .pr-check {
          background: var(--pr-accent); border-color: var(--pr-accent);
        }
        .pr-dept-name { font-size: 0.78rem; font-weight: 600; color: #475569; }
        .pr-dept-item.active .pr-dept-name { color: #0f172a; }

        /* Departamentos scroll */
        .pr-dept-scroll {
          max-height: 200px;
          overflow-y: auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.4rem;
          margin-top: 0.4rem;
          padding-right: 2px;
        }
        @media (max-width: 360px) {
          .pr-dept-scroll { grid-template-columns: 1fr; }
        }

        /* Bairros */
        .pr-zone-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-bottom: 0.75rem;
        }
        .pr-zone-pill {
          padding: 0.35rem 0.8rem;
          border-radius: 8px; border: none;
          background: #e2e8f0; color: #64748b;
          font-weight: 600; font-size: 0.72rem;
          white-space: nowrap; cursor: pointer;
          transition: all 0.18s; font-family: inherit;
        }
        .pr-zone-pill.active { background: var(--pr-accent); color: #fff; }

        .pr-nb-list {
          max-height: 150px; overflow-y: auto;
          display: flex; flex-direction: column; gap: 0.35rem;
        }
        .pr-nb-item {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.6rem 0.75rem;
          border-radius: 10px; border: 1.5px solid transparent;
          background: #f8fafc; cursor: pointer;
          transition: all 0.18s; font-family: inherit; text-align: left;
        }
        .pr-nb-item:hover { border-color: var(--pr-accent); }
        .pr-nb-item.active { border-color: var(--pr-accent); background: var(--pr-accent-alpha); }
        .pr-nb-item.active .pr-check { background: var(--pr-accent); border-color: var(--pr-accent); }

        /* Submit button */
        .pr-btn {
          width: 100%; height: 50px;
          border-radius: 14px; border: none;
          color: #fff; font-size: 0.95rem; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 0.5rem; transition: all 0.25s; margin-top: 1.25rem;
          font-family: inherit;
          box-shadow: 0 8px 20px -4px var(--pr-accent-alpha);
        }
        .pr-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.05); }
        .pr-btn:active { transform: scale(0.98); }
        .pr-btn:disabled { opacity: 0.65; cursor: not-allowed; }

        .pr-back {
          width: 100%; background: none; border: none;
          color: #94a3b8; margin-top: 1rem;
          font-size: 0.82rem; font-weight: 600;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 0.35rem;
          font-family: inherit; transition: color 0.2s;
        }
        .pr-back:hover { color: #64748b; }

        /* Selector cards */
        .pr-selector-btn {
          width: 100%; padding: 1.1rem;
          border-radius: 16px; border: 1.5px solid #e2e8f0;
          background: #fff; display: flex; align-items: center;
          gap: 0.85rem; cursor: pointer; transition: all 0.2s;
          text-align: left; font-family: inherit;
        }
        .pr-selector-btn:hover { border-color: var(--pr-accent-hover); transform: translateY(-2px); box-shadow: 0 8px 20px -6px rgba(0,0,0,0.08); }

        .pr-logo { display: flex; justify-content: center; margin-bottom: 1.25rem; }
        .pr-logo img { height: 56px; object-fit: contain; }

        .pr-success-icon {
          width: 60px; height: 60px; border-radius: 50%;
          background: #f0fdf4; display: flex; align-items: center;
          justify-content: center; margin: 0 auto 1rem;
        }

        .pr-footer {
          position: relative; z-index: 10;
          margin-top: 1.5rem; text-align: center;
          color: #94a3b8; font-size: 0.72rem; font-weight: 500;
        }

        .pr-zone-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .pr-zone-label {
          font-size: 0.8rem; font-weight: 600; color: #475569;
          margin-bottom: 0.75rem; display: block;
        }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        className="pr-page"
        style={{ '--pr-accent': accent, '--pr-accent-alpha': accentAlpha, '--pr-accent-hover': accentDark }}
      >
        <div className="pr-orb pr-orb-1" />
        <div className="pr-orb pr-orb-2" />

        {/* SUCCESS */}
        {success ? (
          <div className="pr-card" style={{ textAlign: 'center' }}>
            <div className="pr-success-icon">
              <CheckCircle2 size={30} color="#16a34a" />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>Cadastro Enviado!</h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              Seus dados foram recebidos com sucesso.<br />Bem-vindo(a) à Chama Church!
            </p>
            <button
              onClick={() => {
                setSuccess(false);
                setForm({ name: '', phone: '', neighborhood: '', churchId: form.churchId || rawUrlChurchId || '', departmentIds: [], birthDate: '', cpf: '', email: '', maritalStatus: '', age: '' });
                setSelectedNeighborhoods([]);
                setSelectedDeptIds([]);
              }}
              className="pr-btn"
              style={{ background: accentGradient }}
            >
              Cadastrar Novo
            </button>
          </div>

          /* SELECTOR */
        ) : !mode ? (
          <div className="pr-card">
            <div className="pr-logo">
              <img src={logoImg} alt="Chama Church" />
            </div>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Bem-vindo!</h1>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.3rem' }}>Como deseja se registrar na Chama Church?</p>
            </div>
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              <SelectorBtn
                icon={<UserCheck size={22} />}
                color="#3b82f6"
                title="Voluntário"
                desc="Quero servir em um departamento"
                onClick={() => handleModeChange(MODES.VOLUNTEER)}
              />
              <SelectorBtn
                icon={<Heart size={22} />}
                color="#f97316"
                title="Visitante"
                desc="Quero conhecer a família"
                onClick={() => handleModeChange(MODES.REGISTER)}
              />
            </div>
          </div>

          /* FORM */
        ) : (
          <div className="pr-card">
            <div className="pr-logo">
              <img src={logoImg} alt="Chama Church" />
            </div>

            {/* Tabs removidas a pedido do usuário */}

            <div className="pr-section-header">
              <div className="pr-section-icon" style={{ background: accentAlpha, color: accent }}>
                {isCoordinator ? <Shield size={20} /> : isVolunteer ? <UserCheck size={20} /> : <Heart size={20} />}
              </div>
              <div>
                <div className="pr-section-title">
                  {isCoordinator ? 'Coordenador' : isVolunteer ? 'Voluntário' : 'Nova Família'}
                </div>
                <div className="pr-section-sub">Preencha seus dados abaixo</div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Igreja — só mostra o seletor se NÃO vier da URL do perfil da igreja */}
              {!rawUrlChurchId ? (
                <div className="pr-field" style={{ position: 'relative' }}>
                  <label className="pr-label">Unidade (Igreja)</label>
                  <div className="pr-input-wrap">
                    <span className="pr-input-icon"><Church size={16} /></span>
                    <div
                      className="pr-input pr-custom-select"
                      onClick={() => setIsChurchOpen(!isChurchOpen)}
                    >
                      {form.churchId ? churches.find(c => c.id === form.churchId)?.name : <span style={{ color: '#94a3b8' }}>Selecione sua unidade...</span>}
                    </div>
                    <span className="pr-select-arrow"><ChevronDown size={16} /></span>
                  </div>

                  {isChurchOpen && (
                    <>
                      <div className="pr-overlay" onClick={() => setIsChurchOpen(false)} />
                      <div className="pr-dropdown">
                        <div
                          className="pr-dropdown-item"
                          onClick={() => { setForm({ ...form, churchId: '' }); setIsChurchOpen(false); }}
                        >
                          <Church size={16} color="#94a3b8" />
                          Selecione sua unidade...
                        </div>
                        {churches.map(c => (
                          <div
                            key={c.id}
                            className={`pr-dropdown-item ${form.churchId === c.id ? 'selected' : ''}`}
                            onClick={() => { setForm({ ...form, churchId: c.id }); setIsChurchOpen(false); }}
                          >
                            <Church size={16} color={form.churchId === c.id ? accent : "#64748b"} />
                            {c.name}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Igreja pré-selecionada via URL — mostra o nome da unidade de forma elegante */
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', background: 'var(--pr-accent-alpha)', borderRadius: '12px', marginBottom: '0.5rem', border: '1.5px solid var(--pr-accent)' }}>
                  <Church size={16} style={{ color: accent, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: accent }}>
                    {churches.find(c => c.id === form.churchId)?.name || 'Carregando unidade...'}
                  </span>
                </div>
              )}

              {/* Nome */}
              <div className="pr-field">
                <label className="pr-label">
                  {isCoordinator ? 'Coordenador(a) ou Casal' : 'Nome Completo'}
                </label>
                <div className="pr-input-wrap">
                  <span className="pr-input-icon"><User size={16} /></span>
                  <input
                    required type="text"
                    placeholder={isCoordinator ? "Ex: Lucas e Mariana" : "Ex: Lucas Silva"}
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="pr-input"
                  />
                </div>
              </div>

              {/* WhatsApp */}
              <div className="pr-field">
                <label className="pr-label">WhatsApp</label>
                <div className="pr-input-wrap">
                  <span className="pr-input-icon"><Phone size={16} /></span>
                  <input
                    required type="tel" placeholder="(00) 00000-0000"
                    value={form.phone} onChange={e => setForm({ ...form, phone: maskPhone(e.target.value) })}
                    className="pr-input"
                  />
                </div>
              </div>

              {/* Estado Civil (visitante) */}
              {isVisitor && (
                <div className="pr-field" style={{ marginBottom: '1.25rem' }}>
                  <label className="pr-label">Estado Civil</label>
                  <Dropdown
                    value={form.maritalStatus}
                    valueLabel={form.maritalStatus}
                    options={[
                      { value: 'Solteiro(a)', label: 'Solteiro(a)' },
                      { value: 'Casado(a)', label: 'Casado(a)' },
                      { value: 'Divorciado(a)', label: 'Divorciado(a)' },
                      { value: 'Viúvo(a)', label: 'Viúvo(a)' },
                      { value: 'União Estável', label: 'União Estável' }
                    ]}
                    onSelect={opt => setForm({ ...form, maritalStatus: opt.value })}
                    placeholder="Selecione..."
                    icon={Heart}
                  />
                </div>
              )}

              {/* Idade (visitante) */}
              {isVisitor && (
                <div className="pr-field">
                  <label className="pr-label">Idade</label>
                  <div className="pr-input-wrap">
                    <span className="pr-input-icon"><Calendar size={16} /></span>
                    <input
                      required
                      type="number"
                      min="0"
                      max="120"
                      placeholder="Sua idade"
                      value={form.age}
                      onChange={e => setForm({ ...form, age: e.target.value })}
                      className="pr-input"
                    />
                  </div>
                </div>
              )}

              {/* Departamentos (voluntário) */}
              {isVolunteer && (
                <div className="pr-field">
                  <label className="pr-label">Departamentos</label>
                  {loadingDepts ? (
                    <div className="pr-dept-loading">Carregando departamentos...</div>
                  ) : dbDepartments.length === 0 ? (
                    <div className="pr-dept-loading">
                      {form.churchId ? 'Nenhum departamento cadastrado.' : 'Selecione uma unidade primeiro.'}
                    </div>
                  ) : (
                    <>
                      <div className="pr-input-wrap" style={{ marginBottom: '0.5rem' }}>
                        <span className="pr-input-icon"><Search size={14} /></span>
                        <input
                          type="text"
                          placeholder="Buscar departamento..."
                          value={deptSearch}
                          onChange={e => setDeptSearch(e.target.value)}
                          className="pr-input"
                          style={{ height: '40px', fontSize: '0.82rem' }}
                        />
                      </div>
                      <div className="pr-dept-scroll">
                        {dbDepartments
                          .filter(d => d.name.toLowerCase().includes(deptSearch.toLowerCase()))
                          .map(d => (
                            <button
                              key={d.id} type="button"
                              onClick={() => toggleDept(d.id)}
                              className={`pr-dept-item ${selectedDeptIds.includes(d.id) ? 'active' : ''}`}
                            >
                              <div className="pr-check">
                                {selectedDeptIds.includes(d.id) && <Check size={10} color="#fff" />}
                              </div>
                              <span className="pr-dept-name">{d.name}</span>
                            </button>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Bairros (coordenador e visitante) */}
              {(isCoordinator || isVisitor) && (
                <div className="pr-zone-box">
                  <span className="pr-zone-label">Bairro {isCoordinator ? 'de Atuação' : 'onde reside'}</span>
                  <div className="pr-zone-bar">
                    <button
                      type="button"
                      onClick={() => setActiveZone('Todos')}
                      className={`pr-zone-pill ${activeZone === 'Todos' ? 'active' : ''}`}
                    >
                      Todos
                    </button>
                    {allowedZones.map(z => (
                      <button
                        key={z} type="button"
                        onClick={() => setActiveZone(z)}
                        className={`pr-zone-pill ${activeZone === z ? 'active' : ''}`}
                      >
                        {z}
                      </button>
                    ))}
                  </div>
                  <div className="pr-field" style={{ marginBottom: '0.65rem' }}>
                    <div className="pr-input-wrap">
                      <span className="pr-input-icon"><Search size={14} /></span>
                      <input
                        type="text" placeholder="Filtrar bairro..."
                        value={nbSearch} onChange={e => setNbSearch(e.target.value)}
                        className="pr-input"
                        style={{ height: '40px', fontSize: '0.82rem' }}
                      />
                    </div>
                  </div>
                  <div className="pr-nb-list">
                    {/* Lista local unificada com os vindos da API */}
                    {[
                      ...(activeZone === 'Todos' ? allNeighborhoods : neighborhoodsByZone[activeZone] || []),
                      ...apiNeighborhoods.filter(nb => {
                        // Só mostra na lista se pertencer à zona ativa ou se for "Todos"
                        if (activeZone === 'Todos') return true;
                        return MANAUS_NEIGHBORHOODS_TO_ZONES[nb] === `Zona ${activeZone}`;
                      })
                    ]
                      .filter(nb => nb.toLowerCase().includes(nbSearch.toLowerCase()))
                      .map(nb => {
                        const isSelected = isCoordinator ? selectedNeighborhoods.includes(nb) : form.neighborhood === nb;
                        return (
                          <button
                            key={nb} type="button"
                            onClick={() => {
                              if (isCoordinator) {
                                toggleNeighborhood(nb);
                              } else {
                                setForm(p => ({ ...p, neighborhood: p.neighborhood === nb ? '' : nb }));
                              }
                            }}
                            className={`pr-nb-item ${isSelected ? 'active' : ''}`}
                          >
                            <div className="pr-check">
                              {isSelected && <Check size={10} color="#fff" />}
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>{nb}</span>
                          </button>
                        );
                      })}

                    {/* Sugestão de busca no Google se não encontrar localmente */}
                    {nbSearch.length > 3 && (
                      <div style={{ padding: '0.5rem', width: '100%' }}>
                        <button
                          type="button"
                          onClick={handleGoogleSearch}
                          disabled={isSearchingApi}
                          style={{
                            width: '100%', padding: '0.75rem', borderRadius: '12px', border: `1.5px dashed ${accent}`,
                            background: accentAlpha, color: accent, fontSize: '0.8rem', fontWeight: 600,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            cursor: 'pointer'
                          }}
                        >
                          {isSearchingApi ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                          Não encontrou "{nbSearch}"? Buscar no Google
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit" disabled={submitting}
                className="pr-btn"
                style={{ background: accentGradient }}
              >
                {submitting
                  ? <Loader2 size={20} className="animate-spin" />
                  : <>{isCoordinator ? 'Concluir Cadastro' : 'Enviar Cadastro'} <ChevronRight size={18} /></>
                }
              </button>

              {!isCoordinator && (
                <button type="button" onClick={() => handleModeChange(null)} className="pr-back">
                  <ArrowLeft size={13} /> Voltar
                </button>
              )}
            </form>
          </div>
        )}

        <footer className="pr-footer">© {new Date().getFullYear()} Chama Church · Sistema de Gestão</footer>
      </div>
    </>
  );
};

const SelectorBtn = ({ icon, color, title, desc, onClick }) => (
  <button onClick={onClick} className="pr-selector-btn" style={{ '--pr-accent-hover': color }}>
    <div style={{
      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
      background: `${color}12`, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{title}</div>
      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>{desc}</div>
    </div>
    <ChevronRight size={18} color="#cbd5e1" />
  </button>
);

export default PublicRegister;
