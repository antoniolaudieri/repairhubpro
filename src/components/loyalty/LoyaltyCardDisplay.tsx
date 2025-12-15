import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Check, Calendar, Smartphone, Gift, Percent } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';

interface LoyaltyCardDisplayProps {
  card: {
    id: string;
    card_number: string | null;
    activated_at: string | null;
    expires_at: string | null;
    devices_used: number;
    max_devices: number;
    centro?: {
      business_name: string;
      logo_url: string | null;
      phone: string;
      email: string;
    };
  };
  compact?: boolean;
}

export function LoyaltyCardDisplay({ card, compact = false }: LoyaltyCardDisplayProps) {
  const isExpired = card.expires_at && new Date(card.expires_at) < new Date();
  const daysRemaining = card.expires_at 
    ? Math.ceil((new Date(card.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6" />
              <div>
                <p className="font-semibold">{card.centro?.business_name}</p>
                <p className="text-xs opacity-80 font-mono">{card.card_number}</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              {card.devices_used}/{card.max_devices} dispositivi
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white overflow-hidden shadow-xl">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            {card.centro?.logo_url ? (
              <img 
                src={card.centro.logo_url} 
                alt={card.centro.business_name}
                className="w-14 h-14 rounded-lg bg-white/20 object-contain p-1"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-white/20 flex items-center justify-center">
                <CreditCard className="h-8 w-8" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-xl">{card.centro?.business_name}</h3>
              <p className="text-sm opacity-80">Tessera Fedeltà</p>
            </div>
          </div>
          
          {card.card_number && (
            <div className="bg-white rounded-lg p-2">
              <QRCodeSVG 
                value={`loyalty:${card.card_number}`} 
                size={70}
                level="M"
              />
            </div>
          )}
        </div>

        {/* Card Number */}
        <div className="mb-6">
          <p className="text-xs opacity-70 mb-1">NUMERO TESSERA</p>
          <p className="text-2xl font-mono tracking-wider">{card.card_number || '---'}</p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Check className="h-4 w-4" />
              <span className="text-xs font-medium">DIAGNOSI</span>
            </div>
            <p className="text-lg font-bold">€10 <span className="text-xs opacity-70 line-through">€15</span></p>
          </div>
          
          <div className="bg-white/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="h-4 w-4" />
              <span className="text-xs font-medium">SCONTO</span>
            </div>
            <p className="text-lg font-bold">10%</p>
          </div>
          
          <div className="bg-white/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="h-4 w-4" />
              <span className="text-xs font-medium">DISPOSITIVI</span>
            </div>
            <p className="text-lg font-bold">{card.devices_used}/{card.max_devices}</p>
          </div>
          
          <div className="bg-white/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium">SCADENZA</span>
            </div>
            <p className="text-sm font-bold">
              {card.expires_at 
                ? format(new Date(card.expires_at), 'dd/MM/yyyy', { locale: it })
                : 'N/A'
              }
            </p>
          </div>
        </div>

        {/* Status Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/20">
          {isExpired ? (
            <Badge variant="destructive" className="bg-red-800/50">Scaduta</Badge>
          ) : daysRemaining <= 30 ? (
            <Badge variant="secondary" className="bg-yellow-500/50 text-white">
              Scade tra {daysRemaining} giorni
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-green-500/50 text-white border-0">
              <Check className="h-3 w-3 mr-1" /> Attiva
            </Badge>
          )}
          
          {card.activated_at && (
            <p className="text-xs opacity-70">
              Attiva dal {format(new Date(card.activated_at), 'dd/MM/yyyy', { locale: it })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
