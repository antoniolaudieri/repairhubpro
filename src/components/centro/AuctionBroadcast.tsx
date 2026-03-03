import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import {
  Video, VideoOff, Mic, MicOff, MonitorPlay, Eye, Timer,
  Radio, Link2, Users, Camera, CameraOff, SwitchCamera, Wifi
} from "lucide-react";
import { useWebRTCBroadcast } from "@/hooks/useWebRTCBroadcast";

interface AuctionItem {
  id: string;
  title: string;
  current_price: number;
  bid_count: number;
  status: string;
  started_at: string | null;
  duration_seconds: number;
}

interface AuctionBroadcastProps {
  auctionId: string;
  viewerCount: number;
  activeItem: AuctionItem | null;
  streamUrl: string | null;
  onStreamUrlChange: (url: string | null) => void;
}

export function AuctionBroadcast({
  auctionId,
  viewerCount,
  activeItem,
  streamUrl,
  onStreamUrlChange,
}: AuctionBroadcastProps) {
  const [mode, setMode] = useState<"camera" | "external">(streamUrl && !streamUrl.startsWith("camera:") ? "external" : "camera");
  const [micOn, setMicOn] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [externalUrl, setExternalUrl] = useState(streamUrl && !streamUrl.startsWith("camera:") ? streamUrl : "");
  const [countdown, setCountdown] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { isStreaming, viewerConnections, stream, startBroadcast, stopBroadcast } = useWebRTCBroadcast(auctionId);

  // Re-attach stream to video when stream changes
  useEffect(() => {
    if (videoRef.current && stream && isStreaming) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isStreaming]);

  // Presence-based viewer count
  const [presenceCount, setPresenceCount] = useState(0);
  useEffect(() => {
    const channel = supabase.channel(`presence-auction-${auctionId}`, {
      config: { presence: { key: `host-${auctionId}` } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setPresenceCount(Math.max(0, count - 1)); // exclude host
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ type: "host" });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [auctionId]);

  // Countdown
  useEffect(() => {
    if (!activeItem?.started_at) { setCountdown(null); return; }
    const endTime = new Date(activeItem.started_at).getTime() + activeItem.duration_seconds * 1000;
    const tick = () => setCountdown(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeItem?.started_at, activeItem?.duration_seconds]);

  const handleStartCamera = useCallback(async () => {
    try {
      const stream = await startBroadcast(facingMode);
      if (videoRef.current && stream) videoRef.current.srcObject = stream;
      onStreamUrlChange("camera:live");
      toast({ title: "📹 Camera attiva!", description: "Gli spettatori vedranno la tua camera in diretta." });
    } catch {
      toast({ title: "Errore Camera", description: "Impossibile accedere alla camera.", variant: "destructive" });
    }
  }, [startBroadcast, facingMode, onStreamUrlChange]);

  const handleStopCamera = useCallback(async () => {
    await stopBroadcast();
    if (videoRef.current) videoRef.current.srcObject = null;
    onStreamUrlChange(null);
  }, [stopBroadcast, onStreamUrlChange]);

  const handleFlipCamera = useCallback(async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    if (isStreaming) {
      await handleStopCamera();
      setTimeout(async () => {
        try {
          const stream = await startBroadcast(newMode);
          if (videoRef.current && stream) videoRef.current.srcObject = stream;
          onStreamUrlChange("camera:live");
        } catch {}
      }, 300);
    }
  }, [facingMode, isStreaming, handleStopCamera, startBroadcast, onStreamUrlChange]);

  const toggleMic = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach(t => { t.enabled = !micOn; });
    }
    setMicOn(prev => !prev);
  }, [micOn]);

  const saveStreamUrl = async () => {
    const url = externalUrl.trim() || null;
    await supabase.from("live_auctions").update({ stream_url: url } as any).eq("id", auctionId);
    onStreamUrlChange(url);
    toast({ title: url ? "Stream URL salvato!" : "Stream URL rimosso" });
  };

  return (
    <Card className="border-destructive/30 bg-destructive/5 overflow-hidden">
      <CardContent className="p-0">
        {/* Mode toggle */}
        <div className="flex items-center gap-4 px-4 py-3 bg-background/50 border-b border-border">
          <Radio className="h-5 w-5 text-destructive animate-pulse" />
          <span className="font-semibold text-foreground text-sm">Broadcast</span>
          <div className="flex items-center gap-2 ml-auto">
            <span className={`text-xs ${mode === "camera" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              <Camera className="h-3 w-3 inline mr-0.5" />Camera
            </span>
            <Switch checked={mode === "external"} onCheckedChange={v => { 
              if (v) { 
                if (isStreaming) handleStopCamera(); 
                setMode("external"); 
              } else setMode("camera"); 
            }} />
            <span className={`text-xs ${mode === "external" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              <MonitorPlay className="h-3 w-3 inline mr-0.5" />Esterno
            </span>
          </div>
        </div>

        <div className="relative">
          {mode === "camera" ? (
            <div className="relative bg-black aspect-video max-h-[360px] flex items-center justify-center">
              {isStreaming ? (
                <>
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  {/* Camera controls overlay */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
                    <Button size="sm" variant="destructive" className="gap-1.5 rounded-full shadow-lg" onClick={handleStopCamera}>
                      <CameraOff className="h-4 w-4" /> Stop
                    </Button>
                    <Button size="sm" variant={micOn ? "secondary" : "outline"} className="rounded-full shadow-lg" onClick={toggleMic}>
                      {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="secondary" className="rounded-full shadow-lg" onClick={handleFlipCamera}>
                      <SwitchCamera className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Connection badge */}
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-chart-2/90 text-white gap-1 shadow-lg">
                      <Wifi className="h-3 w-3" /> {viewerConnections} connessi
                    </Badge>
                  </div>
                </>
              ) : (
                <div className="text-center text-white/60 space-y-4 p-6">
                  <Camera className="h-16 w-16 mx-auto opacity-50" />
                  <div>
                    <p className="text-base font-semibold text-white/80">Trasmetti dalla Camera</p>
                    <p className="text-sm text-white/40 mt-1">
                      Gli spettatori vedranno il video della tua camera in diretta.<br />
                      Perfetto per mostrare i prodotti dal vivo!
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Button size="lg" className="gap-2 rounded-full px-6" onClick={handleStartCamera}>
                      <Camera className="h-5 w-5" /> Avvia Diretta Camera
                    </Button>
                  </div>
                  <p className="text-xs text-white/30">
                    Puoi usare la camera frontale o posteriore del tuo dispositivo
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MonitorPlay className="h-5 w-5 text-primary" />
                <Label className="text-foreground font-medium">URL Stream Esterno</Label>
              </div>
              <div className="flex gap-2">
                <Input
                  value={externalUrl}
                  onChange={e => setExternalUrl(e.target.value)}
                  placeholder="https://youtube.com/embed/VIDEO_ID oppure https://player.twitch.tv/?channel=..."
                  className="flex-1"
                />
                <Button onClick={saveStreamUrl} className="gap-1.5">
                  <Link2 className="h-4 w-4" /> Salva
                </Button>
              </div>
              {streamUrl && !streamUrl.startsWith("camera:") && (
                <div className="aspect-video max-h-[320px] rounded-lg overflow-hidden bg-black">
                  <iframe src={streamUrl} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
                </div>
              )}
            </div>
          )}

          {/* Stats overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none">
            <div className="flex flex-col gap-2">
              {isStreaming && (
                <Badge className="bg-destructive text-destructive-foreground gap-1 pointer-events-none shadow-lg">
                  <Radio className="h-3 w-3" /> LIVE
                </Badge>
              )}
              <Badge className="bg-background/80 text-foreground backdrop-blur-sm gap-1 shadow pointer-events-none">
                <Eye className="h-3 w-3" /> {presenceCount} spettatori
              </Badge>
            </div>
            {activeItem && (
              <motion.div
                key={activeItem.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-background/90 backdrop-blur-sm rounded-xl p-3 shadow-lg text-right max-w-[220px]"
              >
                <p className="text-xs text-muted-foreground truncate">{activeItem.title}</p>
                <motion.p
                  key={activeItem.current_price}
                  initial={{ scale: 1.3, color: "hsl(var(--primary))" }}
                  animate={{ scale: 1, color: "hsl(var(--foreground))" }}
                  className="text-2xl font-black"
                >
                  €{activeItem.current_price}
                </motion.p>
                <div className="flex items-center gap-2 justify-end text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{activeItem.bid_count}</span>
                  {countdown !== null && (
                    <span className={`flex items-center gap-0.5 font-bold tabular-nums ${countdown <= 10 ? "text-destructive animate-pulse" : ""}`}>
                      <Timer className="h-3 w-3" />{countdown}s
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
