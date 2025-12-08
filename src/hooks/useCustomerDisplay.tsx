import { useCallback } from "react";
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

interface IntakeSessionData {
  sessionId: string;
  customer: CustomerData;
  device: DeviceData;
  estimatedCost: number;
  diagnosticFee: number;
  amountDueNow: number;
}

export function useCustomerDisplay(centroId: string | null) {
  const startIntakeSession = useCallback(async (data: IntakeSessionData) => {
    if (!centroId) return;
    
    const channel = supabase.channel(`display-${centroId}`);
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'intake_started',
      payload: data
    });
    
    // Keep channel open for updates
    return channel;
  }, [centroId]);

  const updateIntakeSession = useCallback(async (data: Partial<IntakeSessionData>) => {
    if (!centroId) return;
    
    const channel = supabase.channel(`display-${centroId}`);
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'intake_update',
      payload: data
    });
    supabase.removeChannel(channel);
  }, [centroId]);

  const requestPassword = useCallback(async () => {
    if (!centroId) return;
    
    const channel = supabase.channel(`display-${centroId}`);
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'request_password',
      payload: {}
    });
    supabase.removeChannel(channel);
  }, [centroId]);

  const requestSignature = useCallback(async () => {
    if (!centroId) return;
    
    const channel = supabase.channel(`display-${centroId}`);
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'request_signature',
      payload: {}
    });
    supabase.removeChannel(channel);
  }, [centroId]);

  const cancelIntake = useCallback(async () => {
    if (!centroId) return;
    
    const channel = supabase.channel(`display-${centroId}`);
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'intake_cancelled',
      payload: {}
    });
    supabase.removeChannel(channel);
  }, [centroId]);

  const completeIntake = useCallback(async () => {
    if (!centroId) return;
    
    const channel = supabase.channel(`display-${centroId}`);
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'intake_completed',
      payload: {}
    });
    supabase.removeChannel(channel);
  }, [centroId]);

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
