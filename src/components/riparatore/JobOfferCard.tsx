import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  MapPin, 
  Clock, 
  Check, 
  X, 
  User,
  Navigation
} from "lucide-react";
import { motion } from "framer-motion";

interface JobOffer {
  id: string;
  repair_request_id: string;
  distance_km: number | null;
  expires_at: string;
  status: string;
  repair_requests?: {
    device_type: string;
    device_brand: string | null;
    device_model: string | null;
    issue_description: string;
    service_type: string;
    estimated_cost: number | null;
    customers?: {
      name: string;
    };
  };
}

interface JobOfferCardProps {
  offer: JobOffer;
  onAccept: (offerId: string) => void;
  onDecline: (offerId: string) => void;
  isProcessing: boolean;
}

export const JobOfferCard = ({ offer, onAccept, onDecline, isProcessing }: JobOfferCardProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const expiresAt = new Date(offer.expires_at).getTime();
      const now = Date.now();
      const diff = Math.max(0, expiresAt - now);
      setTimeLeft(Math.floor(diff / 1000));
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [offer.expires_at]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft < 180; // Less than 3 minutes
  const isExpired = timeLeft === 0;

  const request = offer.repair_requests;

  if (isExpired) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`relative overflow-hidden ${isUrgent ? "border-destructive" : "border-primary"}`}>
        {/* Timer Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
          <motion.div
            className={`h-full ${isUrgent ? "bg-destructive" : "bg-primary"}`}
            initial={{ width: "100%" }}
            animate={{ width: `${(timeLeft / 900) * 100}%` }}
            transition={{ duration: 1 }}
          />
        </div>

        <CardContent className="p-4 pt-6">
          {/* Header with Timer */}
          <div className="flex items-center justify-between mb-4">
            <Badge variant={isUrgent ? "destructive" : "default"} className="text-sm animate-pulse">
              <Clock className="h-3 w-3 mr-1" />
              {minutes}:{seconds.toString().padStart(2, "0")}
            </Badge>
            {offer.distance_km && (
              <Badge variant="outline" className="text-xs">
                <Navigation className="h-3 w-3 mr-1" />
                {offer.distance_km.toFixed(1)} km
              </Badge>
            )}
          </div>

          {/* Device Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <span className="font-semibold">
                {request?.device_brand || "N/D"} {request?.device_model || ""}
              </span>
              <Badge variant="secondary" className="text-xs">
                {request?.device_type}
              </Badge>
            </div>

            {request?.customers?.name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{request.customers.name}</span>
              </div>
            )}

            <p className="text-sm text-muted-foreground line-clamp-2">
              {request?.issue_description}
            </p>

            <div className="flex items-center gap-2">
              <Badge variant="outline">
                <MapPin className="h-3 w-3 mr-1" />
                {request?.service_type === "domicilio" ? "A Domicilio" : "In Negozio"}
              </Badge>
              {request?.estimated_cost && (
                <Badge variant="default" className="bg-green-600">
                  €{request.estimated_cost.toFixed(0)}
                </Badge>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button
              variant="default"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => onAccept(offer.id)}
              disabled={isProcessing || isExpired}
            >
              <Check className="h-4 w-4 mr-2" />
              Accetta
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onDecline(offer.id)}
              disabled={isProcessing || isExpired}
            >
              <X className="h-4 w-4 mr-2" />
              Rifiuta
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
