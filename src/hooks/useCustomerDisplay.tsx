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
  photo_url?: string;
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

    console.log('[CustomerDisplay] Initializing channel for centro:', centroId);
    
    const channel = supabase.channel(`display-${centroId}`, {
      config: {
        broadcast: { self: false, ack: true }
      }
    });
    
    channel.subscribe((status) => {
      console.log('[CustomerDisplay] Channel status:', status);
      if (status === 'SUBSCRIBED') {
        isSubscribedRef.current = true;
        console.log('[CustomerDisplay] Channel subscribed successfully');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[CustomerDisplay] Channel error');
        isSubscribedRef.current = false;
      }
    });

    channelRef.current = channel;

    return () => {
      console.log('[CustomerDisplay] Cleaning up channel');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [centroId]);

  // Helper to send broadcast with retry and reconnect
  const sendBroadcast = useCallback(async (event: string, payload: any = {}, attempt = 1): Promise<boolean> => {
    const maxAttempts = 3;
    
    if (!channelRef.current) {
      console.warn('[CustomerDisplay] No channel available for event:', event);
      return false;
    }

    // Wait for subscription if not ready
    let retries = 0;
    const maxRetries = 30;
    while (!isSubscribedRef.current && retries < maxRetries) {
      console.log('[CustomerDisplay] Waiting for subscription... attempt:', retries + 1);
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }

    if (!isSubscribedRef.current) {
      console.error('[CustomerDisplay] Channel not subscribed after', maxRetries, 'retries for event:', event);
      return false;
    }

    console.log('[CustomerDisplay] Sending event:', event, 'attempt:', attempt);
    
    try {
      const result = await channelRef.current.send({
        type: 'broadcast',
        event,
        payload
      });
      console.log('[CustomerDisplay] Send result:', result);
      
      if (result === 'ok') {
        return true;
      }
      
      // Retry on failure
      if (attempt < maxAttempts) {
        console.log('[CustomerDisplay] Retrying broadcast in 500ms...');
        await new Promise(resolve => setTimeout(resolve, 500));
        return sendBroadcast(event, payload, attempt + 1);
      }
      
      return false;
    } catch (error) {
      console.error('[CustomerDisplay] Error sending broadcast:', error);
      
      // Retry on error
      if (attempt < maxAttempts) {
        console.log('[CustomerDisplay] Retrying after error in 500ms...');
        await new Promise(resolve => setTimeout(resolve, 500));
        return sendBroadcast(event, payload, attempt + 1);
      }
      
      return false;
    }
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
    onPrivacyConsentChanged?: (consent: boolean) => void;
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
      .on('broadcast', { event: 'privacy_consent_changed' }, (payload) => {
        callbacks.onPrivacyConsentChanged?.(payload.payload.privacyConsent);
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
