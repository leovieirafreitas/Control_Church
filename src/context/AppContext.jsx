import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useChurch } from './ChurchContext';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const { activeChurch, churches } = useChurch();

  const [departments, setDepartments] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [members, setMembers] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [tithes, setTithes] = useState([]);
  const [churchSettings, setChurchSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [volunteerSearch, setVolunteerSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [visitorSearch, setVisitorSearch] = useState('');
  const [templates, setTemplates] = useState(() => {
    const defaultTemplates = [
      {
        id: 'default',
        name: 'Lembrete de Pendência',
        text: 'Olá {{nome}}! \n\nNotamos que ainda não recebemos a sua contribuição referente ao mês de *{{mes}}*. \n\nSua ajuda é fundamental para mantermos os trabalhos da igreja. Se já realizou, por favor, desconsidere esta mensagem. \n\nDeus te abençoe!'
      },
      {
        id: 'custom_message',
        name: 'Mensagem Elaborada',
        text: 'Olá {{nome}}!\n\nEscreva aqui sua mensagem elaborada para os voluntários do departamento {{departamentos}}.\n\nVocê pode usar as variáveis disponíveis para personalizar o texto conforme necessário.\n\nDeus te abençoe!'
      },
      {
        id: 'welcome',
        name: 'Boas Vindas',
        text: 'Paz do Senhor, {{nome}}!\n\nÉ uma alegria ter você conosco no departamento {{departamentos}}. Que Deus te use grandemente nesta obra!\n\nSeja muito bem-vindo!'
      },
      {
        id: 'tithe_receipt',
        name: 'Comprovante de Contribuição',
        text: 'Olá, {{nome}}! Sua contribuição (dízimo) no valor de *{{valor}}* referente ao dia *{{data}}* foi registrada com sucesso em nosso sistema. Muito obrigado por sua fidelidade e contribuição!'
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

      // Inscrição em tempo real para visitantes
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'visitors',
            filter: `church_id=eq.${activeChurch.id}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setVisitors(prev => {
                // Evita duplicatas se o próprio usuário inseriu
                if (prev.some(v => v.id === payload.new.id)) return prev;
                return [payload.new, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              setVisitors(prev => prev.map(v => v.id === payload.new.id ? payload.new : v));
            } else if (payload.eventType === 'DELETE') {
              setVisitors(prev => prev.filter(v => v.id === payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeChurch?.id]);

  const defaultTemplatesList = [
    {
      id: 'default',
      name: 'Lembrete de Pendência',
      text: 'Olá {{nome}}! \n\nNotamos que ainda não recebemos a sua contribuição referente ao mês de *{{mes}}*. \n\nSua ajuda é fundamental para mantermos os trabalhos da igreja. Se já realizou, por favor, desconsidere esta mensagem. \n\nDeus te abençoe!'
    },
    {
      id: 'custom_message',
      name: 'Mensagem Elaborada',
      text: 'Olá {{nome}}!\n\nEscreva aqui sua mensagem elaborada para os voluntários do departamento {{departamentos}}.\n\nVocê pode usar as variáveis disponíveis para personalizar o texto conforme necessário.\n\nDeus te abençoe!'
    },
    {
      id: 'welcome',
      name: 'Boas Vindas',
      text: 'Paz do Senhor, {{nome}}!\n\nÉ uma alegria ter você conosco no departamento {{departamentos}}. Que Deus te use grandemente nesta obra!\n\nSeja muito bem-vindo!'
    },
    {
      id: 'tithe_receipt',
      name: 'Comprovante de Contribuição',
      text: 'Olá, {{nome}}! Sua contribuição (dízimo) no valor de *{{valor}}* referente ao dia *{{data}}* foi registrada com sucesso em nosso sistema. Muito obrigado por sua fidelidade e contribuição!'
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

  const saveTemplateToDb = async (templateId, name, text) => {
    if (!activeChurch?.id) return;
    try {
      const { data: existing } = await supabase
        .from('message_templates')
        .select('id')
        .eq('church_id', activeChurch.id)
        .eq('template_id', templateId)
        .maybeSingle();
        
      if (existing) {
        await supabase
          .from('message_templates')
          .update({ name, text, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('message_templates')
          .insert({ church_id: activeChurch.id, template_id: templateId, name, text });
      }
    } catch (e) {
      console.error('Erro ao salvar template no banco:', e);
    }
  };

  const fetchAll = async (churchId) => {
    setLoading(true);
    const [depts, vols, mems, vists, leadrs, tiths, settingsRes, tmpls] = await Promise.all([
      supabase.from('departments').select('*').eq('church_id', churchId).order('name'),
      supabase.from('volunteers').select('*').eq('church_id', churchId).order('name'),
      supabase.from('members').select('*').eq('church_id', churchId).order('name'),
      supabase.from('visitors').select('*').eq('church_id', churchId).order('name'),
      supabase.from('coordenadores').select('*').eq('church_id', churchId).order('name'),
      supabase.from('tithes').select('*').eq('church_id', churchId).order('date', { ascending: false }),
      supabase.from('church_settings').select('*').eq('church_id', churchId).limit(1),
      supabase.from('message_templates').select('*').eq('church_id', churchId),
    ]);
    if (depts.data) setDepartments(depts.data);
    if (vols.data) setVolunteers(vols.data);
    if (mems.data) setMembers(mems.data);
    if (vists.data) setVisitors(vists.data);
    if (leadrs.data) setLeaders(leadrs.data);
    if (tiths.data) setTithes(tiths.data);
    if (settingsRes.data && settingsRes.data.length > 0) setChurchSettings(settingsRes.data[0]);
    else setChurchSettings(null);
    
    if (tmpls && tmpls.data) {
      setTemplates(prev => {
        let merged = [...defaultTemplatesList];
        tmpls.data.forEach(dbTmpl => {
          const idx = merged.findIndex(t => t.id === dbTmpl.template_id);
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], text: dbTmpl.text };
          } else {
            merged.push({ id: dbTmpl.template_id, name: dbTmpl.name, text: dbTmpl.text });
          }
        });
        return merged;
      });
    }

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

    // churchId do formulário tem prioridade sobre o contexto do admin
    const churchId = volunteerData.churchId || activeChurch?.id;

    const { data, error } = await supabase
      .from('volunteers')
      .insert({
        name,
        contact: volunteerData.contact || volunteerData.phone,
        department_ids: volunteerData.departmentIds ?? [],
        initials: initials.toUpperCase(),
        church_id: churchId,
        birth_date: volunteerData.birthDate || null,
        cpf: volunteerData.cpf || null,
        email: volunteerData.email || null,
      })
      .select()
      .single();
    if (!error && data) {
      if (activeChurch && data.church_id === activeChurch.id) {
        setVolunteers(prev => [...prev, data]);
      }
    }
    return { error, data };
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

  // ── Membros / Visitantes ──────────────────────────────────────
  const addMember = async (memberData) => {
    const { data, error } = await supabase
      .from('members')
      .insert({
        ...memberData,
        church_id: activeChurch?.id
      })
      .select()
      .single();
    if (!error && data) setMembers(prev => [...prev, data]);
    return { error, data };
  };

  const updateMember = async (id, memberData) => {
    const { data, error } = await supabase
      .from('members')
      .update(memberData)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      setMembers(prev => prev.map(m => m.id === id ? data : m));
    }
    return { error, data };
  };

  const deleteMember = async (id) => {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id);
    if (!error) {
      setMembers(prev => prev.filter(m => m.id !== id));
    }
    return { error };
  };

  // ── Visitantes ────────────────────────────────────────────────
  const addVisitor = async (data) => {
    const churchId = data.churchId || activeChurch?.id;
    let assignedLeaderId = data.assigned_leader_id || null;
    let leaderFound = false;

    // Se não tiver coordenador assinado ainda e tivermos o bairro, faz a auto-atribuição
    if (!assignedLeaderId && data.neighborhood) {
      // Prioriza coordenadores já carregados no estado, MAS verifica se pertencem à igreja correta
      const sourceLeaders = (leaders.length > 0 && leaders[0].church_id === churchId) ? leaders : null;
      
      let matchingLeaders = sourceLeaders;
      if (!matchingLeaders) {
        const { data: res } = await supabase
          .from('coordenadores')
          .select('id, neighborhoods')
          .eq('church_id', churchId);
        matchingLeaders = res;
      }

      if (matchingLeaders) {
        const matchedLeader = matchingLeaders.find(l => {
          if (!l.neighborhoods) return false;
          const list = l.neighborhoods.split(',').map(n => n.trim().toLowerCase());
          return list.includes(data.neighborhood.trim().toLowerCase());
        });
        if (matchedLeader) {
          assignedLeaderId = matchedLeader.id;
          leaderFound = true;
        }
      }
    } else if (assignedLeaderId) {
      leaderFound = true;
    }

    const payload = {
      name: data.name,
      phone: data.phone,
      neighborhood: data.neighborhood,
      church_id: churchId,
      assigned_leader_id: assignedLeaderId,
      marital_status: data.maritalStatus || data.marital_status || null,
      age: data.age ? parseInt(data.age) : null
    };

    const { data: created, error } = await supabase
      .from('visitors')
      .insert(payload)
      .select()
      .single();

    if (!error && created) {
      if (activeChurch && created.church_id === activeChurch.id) {
        setVisitors(prev => [...prev, created]);
      }

      // FALLBACK: Notifica o administrador de forma não-bloqueante
      if (!leaderFound) {
        (async () => {
          try {
            const { getConnectedNumber, sendWhatsAppMessage } = await import('../utils/whatsapp');
            const instance = churchSettings?.evolution_instance || 'Control_Church';
            const apiKey = churchSettings?.evolution_apikey || import.meta.env.VITE_EVOLUTION_API_KEY;
            const adminNumber = await getConnectedNumber(instance, apiKey);
            
            if (adminNumber) {
              const churchName = churches.find(c => c.id === churchId)?.name || 'Chama Church';
              const savedMsg = localStorage.getItem('system_alert_msg');
              const defaultAlert = `*ALERTA DE CONTINGÊNCIA*\n\nNovo visitante em bairro *sem coordenador* mapeado!\n\nNome: *{{nome}}*\nTelefone: {{telefone}}\nBairro: {{bairro}}\nEstado Civil: {{estado_civil}}\nIdade: {{idade}}\nUnidade: {{unidade}}\n\nO contato foi salvo na "fila de espera" do sistema. Por favor, atribua um coordenador manualmente.`;
              
              const rawMsg = savedMsg || defaultAlert;
              const alertMsg = rawMsg
                .replace(/{{nome}}/g, data.name || '')
                .replace(/{{telefone}}/g, data.phone || '')
                .replace(/{{bairro}}/g, data.neighborhood || 'Não informado')
                .replace(/{{estado_civil}}/g, data.maritalStatus || data.marital_status || 'Não informado')
                .replace(/{{idade}}/g, data.age || 'Não informado')
                .replace(/{{unidade}}/g, churchName)
                .replace(/\\n/g, '\n');

              await sendWhatsAppMessage(adminNumber, alertMsg, instance, apiKey);
            }
          } catch (err) {
            console.error('Erro silencioso na notificação de contingência:', err);
          }
        })();
      }
    }
    return { error, data: created };
  };

  const updateVisitor = async (id, data) => {
    const payload = { ...data };
    if (payload.maritalStatus !== undefined) {
      payload.marital_status = payload.maritalStatus;
      delete payload.maritalStatus;
    }
    if (payload.age !== undefined) {
      payload.age = payload.age ? parseInt(payload.age) : null;
    }

    const { data: updated, error } = await supabase
      .from('visitors')
      .update(payload)
      .eq('id', id)
      .select(`
        *,
        coordenadores (
          name,
          phone
        )
      `)
      .single();
    if (!error && updated) {
      setVisitors(prev => prev.map(v => v.id === id ? updated : v));
    }
    return { error, data: updated };
  };

  const deleteVisitor = async (id) => {
    const { error } = await supabase
      .from('visitors')
      .delete()
      .eq('id', id);
    if (!error) {
      setVisitors(prev => prev.filter(v => v.id !== id));
    }
    return { error };
  };

  const promoteVisitorToMember = async (visitor) => {
    const memberPayload = {
      name: visitor.name,
      phone: visitor.phone,
      birth_date: visitor.birth_date || visitor.birthDate || null,
      neighborhood: visitor.neighborhood,
      church_id: visitor.church_id,
      registration_type: 'member'
    };

    const { data: member, error: insertError } = await supabase
      .from('members')
      .insert(memberPayload)
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao promover membro:', insertError);
      alert(`Erro ao promover: ${insertError.message}`);
      return { error: insertError };
    }

    if (member) {
      const { error: deleteError } = await supabase
        .from('visitors')
        .delete()
        .eq('id', visitor.id);

      if (deleteError) {
        console.error('Erro ao remover visitante:', deleteError);
      } else {
        setVisitors(prev => prev.filter(v => v.id !== visitor.id));
      }
      setMembers(prev => [...prev, member]);
      return { success: true };
    }
    return { error: 'Erro desconhecido' };
  };

  // ── Coordenadores ───────────────────────────────────────────────
  const addLeader = async (data) => {
    const payload = {
      name: data.name,
      phone: data.phone,
      neighborhoods: data.neighborhoods,
      church_id: data.churchId || activeChurch?.id
    };

    const { data: created, error } = await supabase
      .from('coordenadores')
      .insert(payload)
      .select()
      .single();
    if (!error && created) {
      if (activeChurch && created.church_id === activeChurch.id) {
        setLeaders(prev => [...prev, created]);
      }
    }
    return { error, data: created };
  };

  const updateLeader = async (id, data) => {
    // Only pass the fields that should be updated
    const payload = {
      name: data.name,
      phone: data.phone,
      neighborhoods: data.neighborhoods
    };

    const { data: updated, error } = await supabase
      .from('coordenadores')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (!error && updated) {
      setLeaders(prev => prev.map(l => l.id === id ? updated : l));
    }
    return { error, data: updated };
  };

  const deleteLeader = async (id) => {
    // 1. Desvincula os visitantes associados a este coordenador para evitar erro de Foreign Key
    await supabase
      .from('visitors')
      .update({ assigned_leader_id: null })
      .eq('assigned_leader_id', id);

    // 2. Exclui o coordenador
    const { error } = await supabase
      .from('coordenadores')
      .delete()
      .eq('id', id);
      
    if (!error) {
      setLeaders(prev => prev.filter(l => l.id !== id));
      setVisitors(prev => prev.map(v => v.assigned_leader_id === id ? { ...v, assigned_leader_id: null } : v));
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

  const membersNormalized = members.map(m => ({
    ...m,
    birthDate: m.birth_date,
    registrationType: m.registration_type,
    createdAt: m.created_at,
  }));

  const visitorsNormalized = visitors.map(v => ({
    ...v,
    birthDate: v.birth_date,
    registrationType: v.registration_type,
    createdAt: v.created_at,
    maritalStatus: v.marital_status,
    age: v.age,
  }));

  const tithesNormalized = tithes.map(t => ({
    ...t,
    volunteerId: t.volunteer_id,
    registeredAt: t.registered_at,
  }));

  const value = {
    departments,
    volunteers: volunteersNormalized,
    members: membersNormalized,
    visitors: visitorsNormalized,
    tithes: tithesNormalized,
    churchSettings,
    updateChurchSettings,
    loading,
    volunteerSearch,
    setVolunteerSearch,
    memberSearch,
    setMemberSearch,
    visitorSearch,
    setVisitorSearch,
    addDepartment,
    addVolunteer,
    updateVolunteer,
    deleteVolunteer,
    addMember,
    updateMember,
    deleteMember,
    addVisitor,
    updateVisitor,
    deleteVisitor,
    promoteVisitorToMember,
    leaders,
    addLeader,
    updateLeader,
    deleteLeader,
    registerTithe,
    deleteTithe,
    templates,
    setTemplates,
    saveTemplateToDb,
    activeChurch,
    churches,
    churchSettings,
    refetch: () => fetchAll(activeChurch?.id),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
