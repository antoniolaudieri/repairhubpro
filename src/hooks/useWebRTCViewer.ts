import { useRef, useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export function useWebRTCViewer(auctionId: string, enabled: boolean) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<string>("new");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const viewerId = useRef(`viewer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const joinIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const cleanup = useCallback(() => {
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    if (joinIntervalRef.current) { clearInterval(joinIntervalRef.current); joinIntervalRef.current = null; }
    pcRef.current?.close();
    pcRef.current = null;
    setRemoteStream(null);
    setConnectionState("new");
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !auctionId) return;
    cleanup();

    console.log("[WebRTC Viewer] Connecting to auction:", auctionId, "viewerId:", viewerId.current);
    setConnectionState("connecting");

    const channel = supabase.channel(`webrtc-${auctionId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.to !== viewerId.current) return;
        console.log("[WebRTC Viewer] Received offer from:", payload.from);

        // Stop sending join requests
        if (joinIntervalRef.current) { clearInterval(joinIntervalRef.current); joinIntervalRef.current = null; }

        // Close any existing PC
        pcRef.current?.close();

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        pc.ontrack = (e) => {
          console.log("[WebRTC Viewer] Got remote track:", e.track.kind);
          if (e.streams[0]) {
            setRemoteStream(e.streams[0]);
            setConnectionState("connected");
          }
        };

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            channel.send({
              type: "broadcast",
              event: "ice-candidate",
              payload: { candidate: e.candidate, from: viewerId.current, to: payload.from },
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (!mountedRef.current) return;
          const state = pc.connectionState;
          console.log("[WebRTC Viewer] Connection state:", state);
          setConnectionState(state);

          if (state === "failed" || state === "disconnected") {
            // Retry: send viewer-join again after delay
            retryTimerRef.current = setTimeout(() => {
              if (!mountedRef.current) return;
              console.log("[WebRTC Viewer] Retrying connection...");
              setConnectionState("connecting");
              channel.send({
                type: "broadcast",
                event: "viewer-join",
                payload: { viewerId: viewerId.current },
              });
            }, 2000);
          }
        };

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({
            type: "broadcast",
            event: "answer",
            payload: { sdp: answer, from: viewerId.current, to: payload.from },
          });
          console.log("[WebRTC Viewer] Sent answer");
        } catch (err) {
          console.error("[WebRTC Viewer] Error handling offer:", err);
        }
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        if (payload.to !== viewerId.current) return;
        if (pcRef.current) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch {}
        }
      })
      .subscribe((status) => {
        console.log("[WebRTC Viewer] Channel status:", status);
        if (status === "SUBSCRIBED") {
          // Send viewer-join immediately, then retry every 3s until we get an offer
          const sendJoin = () => {
            console.log("[WebRTC Viewer] Sending viewer-join");
            channel.send({
              type: "broadcast",
              event: "viewer-join",
              payload: { viewerId: viewerId.current },
            });
          };
          sendJoin();
          joinIntervalRef.current = setInterval(() => {
            // Only keep retrying if we haven't connected yet
            if (pcRef.current?.connectionState === "connected") {
              if (joinIntervalRef.current) clearInterval(joinIntervalRef.current);
              return;
            }
            sendJoin();
          }, 3000);
        }
      });

    channelRef.current = channel;
  }, [auctionId, enabled, cleanup]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      connect();
    } else {
      cleanup();
    }
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [enabled, connect, cleanup]);

  return { remoteStream, connectionState };
}
