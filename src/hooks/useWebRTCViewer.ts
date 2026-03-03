import { useRef, useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function useWebRTCViewer(auctionId: string, enabled: boolean) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<string>("new");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const viewerId = useRef(`viewer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  const retryRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    // Cleanup previous
    pcRef.current?.close();
    pcRef.current = null;

    const channel = supabase.channel(`webrtc-${auctionId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.to !== viewerId.current) return;

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        pc.ontrack = (e) => {
          setRemoteStream(e.streams[0] || null);
        };

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            channel.send({ type: "broadcast", event: "ice-candidate", payload: { candidate: e.candidate, from: viewerId.current, to: payload.from } });
          }
        };

        pc.onconnectionstatechange = () => {
          setConnectionState(pc.connectionState);
          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            // Retry after a delay
            retryRef.current = setTimeout(() => {
              channel.send({ type: "broadcast", event: "viewer-join", payload: { viewerId: viewerId.current } });
            }, 3000);
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        channel.send({ type: "broadcast", event: "answer", payload: { sdp: answer, from: viewerId.current, to: payload.from } });
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        if (payload.to !== viewerId.current) return;
        if (pcRef.current) {
          try { await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {}
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Tell broadcaster we want to connect
          channel.send({ type: "broadcast", event: "viewer-join", payload: { viewerId: viewerId.current } });
        }
      });

    channelRef.current = channel;
  }, [auctionId, enabled]);

  const disconnect = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    setRemoteStream(null);
    setConnectionState("new");
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (retryRef.current) clearTimeout(retryRef.current);
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [enabled, connect, disconnect]);

  return { remoteStream, connectionState };
}
