import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [departments, setDepartments] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [tithes, setTithes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [volunteerSearch, setVolunteerSearch] = useState('');

  // Carrega dados do Supabase ao iniciar
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [depts, vols, tiths] = await Promise.all([
      supabase.from('departments').select('*').order('name'),
      supabase.from('volunteers').select('*').order('name'),
      supabase.from('tithes').select('*').order('date', { ascending: false }),
    ]);
    if (depts.data)  setDepartments(depts.data);
    if (vols.data)   setVolunteers(vols.data);
    if (tiths.data)  setTithes(tiths.data);
    setLoading(false);
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

  // ── Dízimos ────────────────────────────────────────────────────
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
    loading,
    volunteerSearch,
    setVolunteerSearch,
    addDepartment,
    addVolunteer,
    updateVolunteer,
    deleteVolunteer,
    registerTithe,
    deleteTithe,
    refetch: fetchAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
