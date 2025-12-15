import { Badge } from '@/components/ui/badge';
import { CreditCard, Check, Percent, Smartphone } from 'lucide-react';

interface LoyaltyStatusBannerProps {
  benefits: {
    hasActiveCard: boolean;
    diagnosticFee: number;
    repairDiscountPercent: number;
    canUseRepairDiscount: boolean;
    devicesUsed: number;
    maxDevices: number;
  };
}

export function LoyaltyStatusBanner({ benefits }: LoyaltyStatusBannerProps) {
  if (!benefits.hasActiveCard) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <CreditCard className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h4 className="font-semibold text-amber-900">Cliente Fedeltà</h4>
          <p className="text-xs text-amber-700">Sconti applicati automaticamente</p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
          <Check className="h-3 w-3 mr-1" />
          Diagnosi €{benefits.diagnosticFee}
        </Badge>
        
        {benefits.canUseRepairDiscount && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
            <Percent className="h-3 w-3 mr-1" />
            Sconto {benefits.repairDiscountPercent}% attivo
          </Badge>
        )}
        
        <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
          <Smartphone className="h-3 w-3 mr-1" />
          {benefits.devicesUsed}/{benefits.maxDevices} dispositivi
        </Badge>
      </div>
    </div>
  );
}
