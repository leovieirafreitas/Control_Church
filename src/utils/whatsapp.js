/**
 * Utilitários para integração com WhatsApp via Evolution API
 */

const DEFAULT_INSTANCE = import.meta.env.VITE_EVOLUTION_INSTANCE || 'Control_Church';
const API_URL = import.meta.env.VITE_EVOLUTION_API_URL;
const API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY;

/**
 * Obtém o número de telefone do dono da instância conectada
 */
export const getConnectedNumber = async (instanceName = DEFAULT_INSTANCE, apiKey = API_KEY) => {
  try {
    const response = await fetch(`${API_URL}/instance/fetchInstances`, {
      headers: { 'apikey': apiKey }
    });
    const data = await response.json();
    
    // Busca a instância correta pelo nome
    const instance = Array.isArray(data) ? data.find(i => i.name === instanceName) : null;
    
    if (instance && instance.connectionStatus === 'open' && instance.ownerJid) {
      // O ownerJid vem no formato 5592xxxxxxxx@s.whatsapp.net
      return instance.ownerJid.split('@')[0];
    }
  } catch (error) {
    console.error('Erro ao buscar número conectado:', error);
  }
  return null;
};

/**
 * Envia uma mensagem de texto via WhatsApp
 */
export const sendWhatsAppMessage = async (number, text, instanceName = DEFAULT_INSTANCE, apiKey = API_KEY) => {
  try {
    if (!number) return false;
    
    const formattedNumber = number.replace(/\D/g, '');
    const finalNumber = formattedNumber.startsWith('55') ? formattedNumber : `55${formattedNumber}`;

    const response = await fetch(`${API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey || API_KEY
      },
      body: JSON.stringify({
        number: finalNumber,
        text: text
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    return false;
  }
};
