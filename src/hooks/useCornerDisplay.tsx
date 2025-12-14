import { useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CustomerData {
  name: string;
  phone: string;
  email?: string;
}

interface DeviceData {
  brand: string;
  model: string;
  device_type: string;
  issue_description: string;
}

interface SessionData {
  sessionId: string;
  customer: CustomerData;
  device: DeviceData;
}

export function useCornerDisplay(cornerId: string | null) {
  // Persistent channel reference for sending events
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribedRef = useRef(false);

  // Initialize and maintain persistent channel
  useEffect(() => {
    if (!cornerId) return;

    console.log('[CornerDisplay] Initializing channel for corner:', cornerId);
    
    const channel = supabase.channel(`display-corner-${cornerId}`, {
      config: {
        broadcast: { self: false, ack: true }
      }
    });
    
    channel.subscribe((status) => {
      console.log('[CornerDisplay] Channel status:', status);
      if (status === 'SUBSCRIBED') {
        isSubscribedRef.current = true;
        console.log('[CornerDisplay] Channel subscribed successfully');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[CornerDisplay] Channel error');
        isSubscribedRef.current = false;
      }
    });

    channelRef.current = channel;

    return () => {
      console.log('[CornerDisplay] Cleaning up channel');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [cornerId]);

  // Helper to send broadcast with retry
  const sendBroadcast = useCallback(async (event: string, payload: any = {}, attempt = 1): Promise<boolean> => {
    const maxAttempts = 3;
    
    if (!channelRef.current) {
      console.warn('[CornerDisplay] No channel available for event:', event);
      return false;
    }

    // Wait for subscription if not ready
    let retries = 0;
    const maxRetries = 30;
    while (!isSubscribedRef.current && retries < maxRetries) {
      console.log('[CornerDisplay] Waiting for subscription... attempt:', retries + 1);
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }

    if (!isSubscribedRef.current) {
      console.error('[CornerDisplay] Channel not subscribed after', maxRetries, 'retries for event:', event);
      return false;
    }

    console.log('[CornerDisplay] Sending event:', event, 'attempt:', attempt);
    
    try {
      const result = await channelRef.current.send({
        type: 'broadcast',
        event,
        payload
      });
      console.log('[CornerDisplay] Send result:', result);
      
      if (result === 'ok') {
        return true;
      }
      
      // Retry on failure
      if (attempt < maxAttempts) {
        console.log('[CornerDisplay] Retrying broadcast in 500ms...');
        await new Promise(resolve => setTimeout(resolve, 500));
        return sendBroadcast(event, payload, attempt + 1);
      }
      
      return false;
    } catch (error) {
      console.error('[CornerDisplay] Error sending broadcast:', error);
      
      // Retry on error
      if (attempt < maxAttempts) {
        console.log('[CornerDisplay] Retrying after error in 500ms...');
        await new Promise(resolve => setTimeout(resolve, 500));
        return sendBroadcast(event, payload, attempt + 1);
      }
      
      return false;
    }
  }, []);

  const startSession = useCallback(async (data: SessionData) => {
    if (!cornerId) return;
    await sendBroadcast('session_started', data);
  }, [cornerId, sendBroadcast]);

  const updateSession = useCallback(async (data: Partial<SessionData>) => {
    if (!cornerId) return;
    await sendBroadcast('session_update', data);
  }, [cornerId, sendBroadcast]);

  const cancelSession = useCallback(async () => {
    if (!cornerId) return;
    await sendBroadcast('session_cancelled', {});
  }, [cornerId, sendBroadcast]);

  const completeSession = useCallback(async () => {
    if (!cornerId) return;
    await sendBroadcast('session_completed', {});
  }, [cornerId, sendBroadcast]);

  // Listen for responses from corner display
  const listenForCustomerResponses = useCallback((callbacks: {
    onDataConfirmed?: () => void;
  }) => {
    if (!cornerId) return () => {};
    
    const channel = supabase.channel(`corner-intake-${cornerId}`);
    
    channel
      .on('broadcast', { event: 'customer_confirmed_data' }, () => {
        callbacks.onDataConfirmed?.();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cornerId]);

  const getDisplayUrl = useCallback(() => {
    if (!cornerId) return null;
    return `${window.location.origin}/display/corner/${cornerId}`;
  }, [cornerId]);

  return {
    startSession,
    updateSession,
    cancelSession,
    completeSession,
    listenForCustomerResponses,
    getDisplayUrl
  };
}
