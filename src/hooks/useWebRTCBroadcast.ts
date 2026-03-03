import { useRef, useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

interface PeerEntry {
  pc: RTCPeerConnection;
  viewerId: string;
}

export function useWebRTCBroadcast(auctionId: string) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewerConnections, setViewerConnections] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<PeerEntry[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const broadcasterId = useRef(`host-${Date.now()}`);

  const createPeerForViewer = useCallback((viewerId: string, stream: MediaStream, channel: ReturnType<typeof supabase.channel>) => {
    const existing = peersRef.current.find((p) => p.viewerId === viewerId);
    if (existing) {
      existing.pc.close();
      peersRef.current = peersRef.current.filter((p) => p.viewerId !== viewerId);
    }

    console.log("[WebRTC Host] Creating peer for viewer:", viewerId);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        channel.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate: e.candidate, from: broadcasterId.current, to: viewerId },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC Host] Peer", viewerId, "state:", pc.connectionState);
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        peersRef.current = peersRef.current.filter((p) => p.viewerId !== viewerId);
        setViewerConnections(peersRef.current.length);
        try {
          pc.close();
        } catch {}
      }
    };

    return pc;
  }, []);

  const getCameraStream = useCallback(async (facingMode: "user" | "environment") => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
    } catch (primaryError) {
      console.warn("[WebRTC Host] Primary camera constraint failed, fallback to generic camera", primaryError);
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    }
  }, []);

  const startBroadcast = useCallback(
    async (facingMode: "user" | "environment" = "environment") => {
      try {
        console.log("[WebRTC Host] Starting broadcast, facingMode:", facingMode);

        const stream = await getCameraStream(facingMode);
        streamRef.current = stream;

        const { error: updateError } = await supabase
          .from("live_auctions")
          .update({ stream_url: "camera:live" } as any)
          .eq("id", auctionId);

        if (updateError) {
          throw updateError;
        }

        const channel = supabase.channel(`webrtc-${auctionId}`, {
          config: { broadcast: { self: false } },
        });

        channel
          .on("broadcast", { event: "viewer-join" }, async ({ payload }) => {
            const { viewerId } = payload;
            const currentStream = streamRef.current;
            if (!currentStream) return;

            const pc = createPeerForViewer(viewerId, currentStream, channel);

            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              channel.send({
                type: "broadcast",
                event: "offer",
                payload: { sdp: offer, from: broadcasterId.current, to: viewerId },
              });
              console.log("[WebRTC Host] Sent offer to:", viewerId);

              peersRef.current.push({ pc, viewerId });
              setViewerConnections(peersRef.current.length);
            } catch (err) {
              console.error("[WebRTC Host] Error creating offer:", err);
              pc.close();
            }
          })
          .on("broadcast", { event: "answer" }, async ({ payload }) => {
            if (payload.to !== broadcasterId.current) return;
            const peer = peersRef.current.find((p) => p.viewerId === payload.from);
            if (peer && peer.pc.signalingState === "have-local-offer") {
              try {
                await peer.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                console.log("[WebRTC Host] Set answer from:", payload.from);
              } catch (err) {
                console.error("[WebRTC Host] Error setting answer:", err);
              }
            }
          })
          .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
            if (payload.to !== broadcasterId.current) return;
            const peer = peersRef.current.find((p) => p.viewerId === payload.from);
            if (peer) {
              try {
                await peer.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch {}
            }
          })
          .subscribe((status) => {
            console.log("[WebRTC Host] Channel status:", status);
          });

        channelRef.current = channel;
        setIsStreaming(true);
        console.log("[WebRTC Host] Broadcast started successfully");

        return stream;
      } catch (err) {
        console.error("[WebRTC Host] Camera broadcast error:", err);
        throw err;
      }
    },
    [auctionId, createPeerForViewer, getCameraStream]
  );

  const stopBroadcast = useCallback(async () => {
    console.log("[WebRTC Host] Stopping broadcast");
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    peersRef.current.forEach((p) => {
      try {
        p.pc.close();
      } catch {}
    });
    peersRef.current = [];
    setViewerConnections(0);

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    await supabase.from("live_auctions").update({ stream_url: null } as any).eq("id", auctionId);
    setIsStreaming(false);
  }, [auctionId]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach((p) => {
        try {
          p.pc.close();
        } catch {}
      });
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  return { isStreaming, viewerConnections, stream: streamRef.current, startBroadcast, stopBroadcast };
}
