// Utility function to generate status-based messages for customer communication

interface RepairInfo {
  status: string;
  device: {
    brand: string;
    model: string;
  };
  customer: {
    name: string;
  };
}

export const getStatusMessage = (repair: RepairInfo): { subject: string; body: string } => {
  const device = `${repair.device.brand} ${repair.device.model}`;
  const customer = repair.customer?.name || "Cliente";
  
  const messages: Record<string, { subject: string; body: string }> = {
    pending: {
      subject: `Riparazione in attesa - ${device}`,
      body: `Gentile ${customer},\n\nLa informiamo che abbiamo ricevuto il suo dispositivo ${device} e la riparazione è in attesa di essere presa in carico.\n\nLa terremo aggiornata sui progressi.\n\nCordiali saluti`
    },
    waiting_parts: {
      subject: `Riparazione in attesa ricambi - ${device}`,
      body: `Gentile ${customer},\n\nLa informiamo che la riparazione del suo ${device} è in attesa di ricevere i ricambi necessari.\n\nLa contatteremo non appena i pezzi saranno disponibili.\n\nCordiali saluti`
    },
    in_progress: {
      subject: `Riparazione in corso - ${device}`,
      body: `Gentile ${customer},\n\nLa informiamo che stiamo lavorando attivamente alla riparazione del suo ${device}.\n\nLa terremo aggiornata sui progressi.\n\nCordiali saluti`
    },
    completed: {
      subject: `Riparazione completata - ${device}`,
      body: `Gentile ${customer},\n\nSiamo lieti di informarla che la riparazione del suo ${device} è stata completata con successo!\n\nPuò passare a ritirare il dispositivo presso il nostro laboratorio.\n\nRicordiamo che il dispositivo deve essere ritirato entro 30 giorni.\n\nCordiali saluti`
    },
    delivered: {
      subject: `Conferma consegna - ${device}`,
      body: `Gentile ${customer},\n\nConfermiamo che il suo ${device} è stato consegnato.\n\nGrazie per aver scelto i nostri servizi!\n\nCordiali saluti`
    },
    cancelled: {
      subject: `Riparazione annullata - ${device}`,
      body: `Gentile ${customer},\n\nLa informiamo che la riparazione del suo ${device} è stata annullata.\n\nPer ulteriori informazioni, non esiti a contattarci.\n\nCordiali saluti`
    },
    forfeited: {
      subject: `Dispositivo non ritirato - ${device}`,
      body: `Gentile ${customer},\n\nLa informiamo che, non avendo ritirato il suo ${device} entro i termini previsti (30 giorni), il dispositivo è stato alienato secondo quanto previsto dal regolamento.\n\nCordiali saluti`
    },
    // Additional statuses for repair_requests
    assigned: {
      subject: `Riparazione assegnata - ${device}`,
      body: `Gentile ${customer},\n\nLa informiamo che la sua richiesta di riparazione per il ${device} è stata assegnata a un tecnico.\n\nLa contatteremo presto per gli aggiornamenti.\n\nCordiali saluti`
    },
    quote_sent: {
      subject: `Preventivo inviato - ${device}`,
      body: `Gentile ${customer},\n\nLe abbiamo inviato il preventivo per la riparazione del suo ${device}.\n\nLa invitiamo a visionarlo e confermare l'accettazione.\n\nCordiali saluti`
    },
    quote_accepted: {
      subject: `Preventivo accettato - ${device}`,
      body: `Gentile ${customer},\n\nGrazie per aver accettato il preventivo per la riparazione del suo ${device}.\n\nProcederemo con i lavori.\n\nCordiali saluti`
    },
    in_diagnosis: {
      subject: `Diagnosi in corso - ${device}`,
      body: `Gentile ${customer},\n\nStiamo effettuando la diagnosi del suo ${device}.\n\nLa contatteremo con i risultati.\n\nCordiali saluti`
    },
    repair_completed: {
      subject: `Riparazione completata - ${device}`,
      body: `Gentile ${customer},\n\nLa riparazione del suo ${device} è stata completata!\n\nPuò passare a ritirare il dispositivo.\n\nCordiali saluti`
    },
    ready_for_return: {
      subject: `Dispositivo pronto - ${device}`,
      body: `Gentile ${customer},\n\nIl suo ${device} è pronto per il ritiro!\n\nPuò passare a ritirarlo presso il nostro punto vendita.\n\nCordiali saluti`
    },
    at_corner: {
      subject: `Dispositivo disponibile - ${device}`,
      body: `Gentile ${customer},\n\nIl suo ${device} è disponibile presso il punto vendita dove lo ha lasciato.\n\nPuò passare a ritirarlo.\n\nCordiali saluti`
    }
  };
  
  return messages[repair.status] || messages.pending;
};

export const openWhatsApp = (phone: string, message: string) => {
  const cleanPhone = phone?.replace(/\D/g, "") || "";
  const phoneWithPrefix = cleanPhone.startsWith("39") ? cleanPhone : `39${cleanPhone}`;
  const whatsappUrl = `https://wa.me/${phoneWithPrefix}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");
};

export const openEmail = (email: string | null, subject: string, body: string) => {
  const emailTo = email || "";
  window.location.href = `mailto:${emailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export const callPhone = (phone: string) => {
  window.location.href = `tel:${phone}`;
};
