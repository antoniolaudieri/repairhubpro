import { useRef, useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
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

  const startBroadcast = useCallback(async (facingMode: "user" | "environment" = "environment") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;

      // Signal on DB that camera mode is active
      await supabase.from("live_auctions").update({ stream_url: "camera:live" } as any).eq("id", auctionId);

      // Setup signaling channel
      const channel = supabase.channel(`webrtc-${auctionId}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on("broadcast", { event: "viewer-join" }, async ({ payload }) => {
          const { viewerId } = payload;
          const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

          // Add tracks
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));

          // ICE candidates
          pc.onicecandidate = (e) => {
            if (e.candidate) {
              channel.send({ type: "broadcast", event: "ice-candidate", payload: { candidate: e.candidate, from: broadcasterId.current, to: viewerId } });
            }
          };

          pc.onconnectionstatechange = () => {
            if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
              peersRef.current = peersRef.current.filter((p) => p.viewerId !== viewerId);
              setViewerConnections(peersRef.current.length);
              pc.close();
            }
          };

          // Create offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          channel.send({ type: "broadcast", event: "offer", payload: { sdp: offer, from: broadcasterId.current, to: viewerId } });

          peersRef.current.push({ pc, viewerId });
          setViewerConnections(peersRef.current.length);
        })
        .on("broadcast", { event: "answer" }, async ({ payload }) => {
          if (payload.to !== broadcasterId.current) return;
          const peer = peersRef.current.find((p) => p.viewerId === payload.from);
          if (peer && peer.pc.signalingState === "have-local-offer") {
            await peer.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          }
        })
        .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          if (payload.to !== broadcasterId.current) return;
          const peer = peersRef.current.find((p) => p.viewerId === payload.from);
          if (peer) {
            try { await peer.pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {}
          }
        })
        .subscribe();

      channelRef.current = channel;
      setIsStreaming(true);

      return stream;
    } catch (err) {
      console.error("Camera broadcast error:", err);
      throw err;
    }
  }, [auctionId]);

  const stopBroadcast = useCallback(async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    peersRef.current.forEach((p) => p.pc.close());
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
      peersRef.current.forEach((p) => p.pc.close());
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  return { isStreaming, viewerConnections, stream: streamRef.current, startBroadcast, stopBroadcast };
}
