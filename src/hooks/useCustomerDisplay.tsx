import { useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CustomerData {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

interface DeviceData {
  brand: string;
  model: string;
  device_type: string;
  reported_issue: string;
  imei?: string;
  serial_number?: string;
}

interface QuoteItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: 'part' | 'service' | 'labor';
}

interface IntakeSessionData {
  sessionId: string;
  customer: CustomerData;
  device: DeviceData;
  estimatedCost: number;
  diagnosticFee: number;
  amountDueNow: number;
  quoteItems?: QuoteItem[];
  laborCost?: number;
}

export function useCustomerDisplay(centroId: string | null) {
  // Persistent channel reference for sending events
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribedRef = useRef(false);

  // Initialize and maintain persistent channel
  useEffect(() => {
    if (!centroId) return;

    const channel = supabase.channel(`display-${centroId}`, {
      config: {
        broadcast: { self: false }
      }
    });
    
    channel.subscribe((status) => {
      console.log('[CustomerDisplay] Channel status:', status);
      if (status === 'SUBSCRIBED') {
        isSubscribedRef.current = true;
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [centroId]);

  // Helper to send broadcast with retry
  const sendBroadcast = useCallback(async (event: string, payload: any = {}) => {
    if (!channelRef.current) {
      console.warn('[CustomerDisplay] No channel available');
      return;
    }

    // Wait for subscription if not ready
    let retries = 0;
    while (!isSubscribedRef.current && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }

    if (!isSubscribedRef.current) {
      console.warn('[CustomerDisplay] Channel not subscribed after retries');
      return;
    }

    console.log('[CustomerDisplay] Sending event:', event, payload);
    await channelRef.current.send({
      type: 'broadcast',
      event,
      payload
    });
  }, []);

  const startIntakeSession = useCallback(async (data: IntakeSessionData) => {
    if (!centroId) return;
    await sendBroadcast('intake_started', data);
  }, [centroId, sendBroadcast]);

  const updateIntakeSession = useCallback(async (data: Partial<IntakeSessionData>) => {
    if (!centroId) return;
    await sendBroadcast('intake_update', data);
  }, [centroId, sendBroadcast]);

  const requestPassword = useCallback(async () => {
    if (!centroId) return;
    await sendBroadcast('request_password', {});
  }, [centroId, sendBroadcast]);

  const requestSignature = useCallback(async () => {
    if (!centroId) return;
    console.log('[CustomerDisplay] Requesting signature');
    await sendBroadcast('request_signature', {});
  }, [centroId, sendBroadcast]);

  const cancelIntake = useCallback(async () => {
    if (!centroId) return;
    await sendBroadcast('intake_cancelled', {});
  }, [centroId, sendBroadcast]);

  const completeIntake = useCallback(async () => {
    if (!centroId) return;
    await sendBroadcast('intake_completed', {});
  }, [centroId, sendBroadcast]);

  // Listen for responses from customer display
  const listenForCustomerResponses = useCallback((callbacks: {
    onDataConfirmed?: () => void;
    onPasswordSubmitted?: (password: string) => void;
    onPasswordSkipped?: () => void;
    onSignatureSubmitted?: (signatureData: string) => void;
  }) => {
    if (!centroId) return () => {};
    
    const channel = supabase.channel(`intake-${centroId}`);
    
    channel
      .on('broadcast', { event: 'customer_confirmed_data' }, () => {
        callbacks.onDataConfirmed?.();
      })
      .on('broadcast', { event: 'password_submitted' }, (payload) => {
        callbacks.onPasswordSubmitted?.(payload.payload.password);
      })
      .on('broadcast', { event: 'password_skipped' }, () => {
        callbacks.onPasswordSkipped?.();
      })
      .on('broadcast', { event: 'signature_submitted' }, (payload) => {
        callbacks.onSignatureSubmitted?.(payload.payload.signatureData);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [centroId]);

  const getDisplayUrl = useCallback(() => {
    if (!centroId) return null;
    return `${window.location.origin}/display/${centroId}`;
  }, [centroId]);

  return {
    startIntakeSession,
    updateIntakeSession,
    requestPassword,
    requestSignature,
    cancelIntake,
    completeIntake,
    listenForCustomerResponses,
    getDisplayUrl
  };
}
