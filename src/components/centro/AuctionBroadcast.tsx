import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, VideoOff, Mic, MicOff, MonitorPlay, Eye, Timer,
  Gavel, Radio, Link2, Users
} from "lucide-react";

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
  const [mode, setMode] = useState<"webcam" | "external">(streamUrl ? "external" : "webcam");
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [externalUrl, setExternalUrl] = useState(streamUrl || "");
  const [countdown, setCountdown] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Countdown
  useEffect(() => {
    if (!activeItem?.started_at) { setCountdown(null); return; }
    const endTime = new Date(activeItem.started_at).getTime() + activeItem.duration_seconds * 1000;
    const tick = () => setCountdown(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeItem?.started_at, activeItem?.duration_seconds]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: micOn });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      toast({ title: "Errore Camera", description: "Impossibile accedere alla webcam.", variant: "destructive" });
    }
  }, [micOn]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  const toggleMic = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = !micOn; });
    }
    setMicOn(prev => !prev);
  }, [micOn]);

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

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
            <span className={`text-xs ${mode === "webcam" ? "text-foreground font-medium" : "text-muted-foreground"}`}>Webcam</span>
            <Switch checked={mode === "external"} onCheckedChange={v => { if (v) { stopCamera(); setMode("external"); } else setMode("webcam"); }} />
            <span className={`text-xs ${mode === "external" ? "text-foreground font-medium" : "text-muted-foreground"}`}>Stream Esterno</span>
          </div>
        </div>

        <div className="relative">
          {/* Video area */}
          {mode === "webcam" ? (
            <div className="relative bg-black aspect-video max-h-[360px] flex items-center justify-center">
              {cameraOn ? (
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-white/60 space-y-3">
                  <Video className="h-12 w-12 mx-auto opacity-40" />
                  <p className="text-sm">Attiva la webcam per l'anteprima locale</p>
                  <p className="text-xs text-white/40">Gli spettatori vedranno il prodotto in tempo reale.<br />Per lo streaming video, usa un link esterno (YouTube/Twitch).</p>
                </div>
              )}
              {/* Camera controls */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <Button size="sm" variant={cameraOn ? "destructive" : "default"} className="gap-1.5 rounded-full" onClick={cameraOn ? stopCamera : startCamera}>
                  {cameraOn ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  {cameraOn ? "Spegni" : "Attiva Camera"}
                </Button>
                {cameraOn && (
                  <Button size="sm" variant={micOn ? "secondary" : "outline"} className="rounded-full" onClick={toggleMic}>
                    {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </Button>
                )}
              </div>
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
              {streamUrl && (
                <div className="aspect-video max-h-[320px] rounded-lg overflow-hidden bg-black">
                  <iframe src={streamUrl} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
                </div>
              )}
            </div>
          )}

          {/* Stats overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none">
            <div className="flex flex-col gap-2">
              <Badge className="bg-destructive text-destructive-foreground gap-1 pointer-events-none shadow-lg">
                <Radio className="h-3 w-3" /> LIVE
              </Badge>
              <Badge className="bg-background/80 text-foreground backdrop-blur-sm gap-1 shadow pointer-events-none">
                <Eye className="h-3 w-3" /> {viewerCount} spettatori
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
