import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
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
        id: 'monthly_thanks',
        name: 'Agradecimento Mensal (Dizimistas)',
        text: 'Olá, {{nome}}! Queremos agradecer de coração pela sua fidelidade e amor à obra de Deus no mês de *{{mes}}*. Suas contribuições totalizaram *{{valor}}*. Que o Senhor continue abençoando poderosamente a sua vida e de toda sua família! 🙏✨'
      }
    ];

    const saved = localStorage.getItem('message_templates');
    if (!saved) return defaultTemplates;

    const parsedSaved = JSON.parse(saved);
    // Garante que todos os defaults existam no salvo
    defaultTemplates.forEach(def => {
      if (!parsedSaved.find(t => t.id === def.id)) {
        parsedSaved.push(def);
      }
    });
    return parsedSaved;
  });

  useEffect(() => {
    localStorage.setItem('message_templates', JSON.stringify(templates));
  }, [templates]);

  // Carrega dados do Supabase ao iniciar
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [depts, vols, tiths, settings] = await Promise.all([
      supabase.from('departments').select('*').order('name'),
      supabase.from('volunteers').select('*').order('name'),
      supabase.from('tithes').select('*').order('date', { ascending: false }),
      supabase.from('church_settings').select('*').limit(1).single(),
    ]);
    if (depts.data)    setDepartments(depts.data);
    if (vols.data)     setVolunteers(vols.data);
    if (tiths.data)    setTithes(tiths.data);
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
      .insert({ name })
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
    refetch: fetchAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
