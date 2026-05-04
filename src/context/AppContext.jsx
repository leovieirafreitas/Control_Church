import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useChurch } from './ChurchContext';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const { activeChurch } = useChurch();

  const [departments, setDepartments] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [tithes, setTithes] = useState([]);
  const [churchSettings, setChurchSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [volunteerSearch, setVolunteerSearch] = useState('');
  const [templates, setTemplates] = useState(() => {
    const defaultTemplates = [
      {
        id: 'default',
        name: 'Lembrete de Pendência',
        text: 'Olá {{nome}}! 🌟 \n\nNotamos que ainda não recebemos a sua contribuição referente ao mês de *{{mes}}*. \n\nSua ajuda é fundamental para mantermos os trabalhos da igreja. Se já realizou, por favor, desconsidere esta mensagem. \n\nDeus te abençoe! 🙏'
      },
      {
        id: 'custom_message',
        name: 'Mensagem Elaborada',
        text: 'Olá {{nome}}! 🙏\n\nEscreva aqui sua mensagem elaborada para os voluntários do departamento {{departamentos}}.\n\nVocê pode usar as variáveis disponíveis para personalizar o texto conforme necessário.\n\nDeus te abençoe!'
      },
      {
        id: 'welcome',
        name: 'Boas Vindas',
        text: 'Paz do Senhor, {{nome}}! 👋\n\nÉ uma alegria ter você conosco no departamento {{departamentos}}. Que Deus te use grandemente nesta obra!\n\nSeja muito bem-vindo!'
      },
      {
        id: 'tithe_receipt',
        name: 'Comprovante de Contribuição',
        text: 'Olá, {{nome}}! Sua contribuição (dízimo) no valor de *{{valor}}* referente ao dia *{{data}}* foi registrada com sucesso em nosso sistema. Muito obrigado por sua fidelidade e contribuição! 🙏✨'
      },
      {
        id: 'complete_registration',
        name: 'Finalizar Cadastro',
        text: 'Ola {{nome}}!\n\nVoce esta cadastrado como voluntario da *Chama Church*! Para acessar sua area exclusiva e completar seu perfil, acesse o link abaixo:\n\n{{link_cadastro}}\n\nLa voce podera criar sua senha e visualizar seu historico de contribuicoes.\n\nQualquer duvida, estamos a disposicao!\n*Equipe Chama Church*'
      },
      {
        id: 'monthly_thanks',
        name: 'Agradecimento Mensal (Dizimistas)',
        text: 'Ola, {{nome}}! Queremos agradecer de coracao pela sua fidelidade e amor a obra de Deus no mes de *{{mes}}*. Suas contribuicoes totalizaram *{{valor}}*. Que o Senhor continue abencoando poderosamente a sua vida e de toda sua familia!'
      }
    ];

    const saved = localStorage.getItem('message_templates');
    if (!saved) return defaultTemplates;

    const parsedSaved = JSON.parse(saved);
    // Sempre atualiza nome e texto dos templates padrão a partir do código
    // (evita que valores antigos do localStorage fiquem desatualizados)
    const defaultIds = defaultTemplates.map(d => d.id);
    const merged = parsedSaved
      .filter(t => !defaultIds.includes(t.id)) // mantém só os customizados
      .concat(defaultTemplates);               // adiciona todos os padrões atualizados
    return merged;
  });

  useEffect(() => {
    localStorage.setItem('message_templates', JSON.stringify(templates));
  }, [templates]);

  // Re-busca dados quando a igreja ativa mudar
  useEffect(() => {
    if (activeChurch?.id) {
      fetchAll(activeChurch.id);
    }
  }, [activeChurch?.id]);

  const fetchAll = async (churchId) => {
    setLoading(true);
    const [depts, vols, tiths, settings] = await Promise.all([
      supabase.from('departments').select('*').eq('church_id', churchId).order('name'),
      supabase.from('volunteers').select('*').eq('church_id', churchId).order('name'),
      supabase.from('tithes').select('*').eq('church_id', churchId).order('date', { ascending: false }),
      supabase.from('church_settings').select('*').eq('church_id', churchId).limit(1).single(),
    ]);
    if (depts.data) setDepartments(depts.data);
    if (vols.data) setVolunteers(vols.data);
    if (tiths.data) setTithes(tiths.data);
    if (settings.data) setChurchSettings(settings.data);
    setLoading(false);
  };

  const updateChurchSettings = async (data) => {
    const { data: updated, error } = await supabase
      .from('church_settings')
      .update(data)
      .eq('id', churchSettings?.id)
      .select()
      .single();
    if (!error && updated) setChurchSettings(updated);
    return { error };
  };

  // ── Departamentos ──────────────────────────────────────────────
  const addDepartment = async (name) => {
    const { data, error } = await supabase
      .from('departments')
      .insert({ name, church_id: activeChurch?.id })
      .select()
      .single();
    if (!error && data) setDepartments(prev => [...prev, data]);
  };

  // ── Voluntários ────────────────────────────────────────────────
  const addVolunteer = async (volunteerData) => {
    const name = volunteerData.name;
    const nameParts = name.trim().split(' ').filter(Boolean);
    const initials = (nameParts[0]?.[0] ?? '') + (nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : '');

    const { data, error } = await supabase
      .from('volunteers')
      .insert({
        name,
        contact: volunteerData.contact,
        department_ids: volunteerData.departmentIds ?? [],
        initials: initials.toUpperCase(),
        church_id: activeChurch?.id,
        birth_date: volunteerData.birthDate || null,
        cpf: volunteerData.cpf || null,
        email: volunteerData.email || null,
      })
      .select()
      .single();
    if (!error && data) setVolunteers(prev => [...prev, data]);
  };

  const updateVolunteer = async (id, volunteerData) => {
    const name = volunteerData.name;
    const nameParts = name.trim().split(' ').filter(Boolean);
    const initials = (nameParts[0]?.[0] ?? '') + (nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : '');

    const { data, error } = await supabase
      .from('volunteers')
      .update({
        name,
        contact: volunteerData.contact,
        department_ids: volunteerData.departmentIds ?? [],
        initials: initials.toUpperCase(),
        birth_date: volunteerData.birthDate || null,
        cpf: volunteerData.cpf || null,
        email: volunteerData.email || null,
      })
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      setVolunteers(prev => prev.map(v => v.id === id ? data : v));
    }
    return { error };
  };

  const deleteVolunteer = async (id) => {
    const { error } = await supabase
      .from('volunteers')
      .delete()
      .eq('id', id);
    if (!error) {
      setVolunteers(prev => prev.filter(v => v.id !== id));
    }
    return { error };
  };

  // ── Contribuições ────────────────────────────────────────────────────
  const registerTithe = async (volunteerId, amount, date) => {
    const { data, error } = await supabase
      .from('tithes')
      .insert({
        volunteer_id: volunteerId,
        amount: parseFloat(amount),
        date,
        church_id: activeChurch?.id,
      })
      .select()
      .single();
    if (!error && data) setTithes(prev => [data, ...prev]);
  };

  const deleteTithe = async (id) => {
    const { error } = await supabase
      .from('tithes')
      .delete()
      .eq('id', id);
    if (!error) {
      setTithes(prev => prev.filter(t => t.id !== id));
    }
  };

  // Mapeia snake_case → camelCase para compatibilidade com componentes existentes
  const volunteersNormalized = volunteers.map(v => ({
    ...v,
    departmentIds: v.department_ids ?? [],
    createdAt: v.created_at,
    birthDate: v.birth_date,
    cpf: v.cpf,
    email: v.email,
  }));

  const tithesNormalized = tithes.map(t => ({
    ...t,
    volunteerId: t.volunteer_id,
    registeredAt: t.registered_at,
  }));

  const value = {
    departments,
    volunteers: volunteersNormalized,
    tithes: tithesNormalized,
    churchSettings,
    updateChurchSettings,
    loading,
    volunteerSearch,
    setVolunteerSearch,
    addDepartment,
    addVolunteer,
    updateVolunteer,
    deleteVolunteer,
    registerTithe,
    deleteTithe,
    templates,
    setTemplates,
    refetch: () => fetchAll(activeChurch?.id),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
