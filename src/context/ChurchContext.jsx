import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const ChurchContext = createContext();

export const useChurch = () => useContext(ChurchContext);

export const ChurchProvider = ({ children }) => {
  const [churches, setChurches] = useState([]);
  const [activeChurch, setActiveChurch] = useState(null);
  const [loadingChurches, setLoadingChurches] = useState(true);

  useEffect(() => {
    fetchChurches();
  }, []);

  const fetchChurches = async () => {
    setLoadingChurches(true);
    const { data } = await supabase
      .from('churches')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (data && data.length > 0) {
      setChurches(data);

      // Restaura última seleção do localStorage
      const savedId = localStorage.getItem('active_church_id');
      const found = data.find(c => c.id === savedId);
      setActiveChurch(found || data[0]);
    }
    setLoadingChurches(false);
  };

  const switchChurch = (church) => {
    setActiveChurch(church);
    localStorage.setItem('active_church_id', church.id);
  };

  return (
    <ChurchContext.Provider value={{ churches, activeChurch, switchChurch, loadingChurches }}>
      {children}
    </ChurchContext.Provider>
  );
};
