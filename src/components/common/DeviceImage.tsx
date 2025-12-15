import { useState, useEffect } from 'react';
import { Smartphone, Tablet, Laptop, Monitor, Watch, Gamepad, LucideIcon } from 'lucide-react';
import { getBrandLogo, useBrandLogos } from '@/utils/brandLogos';
import { cn } from '@/lib/utils';

const deviceIcons: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  computer: Monitor,
  smartwatch: Watch,
  console: Gamepad,
};

interface DeviceImageProps {
  photoUrl?: string | null;
  brand?: string | null;
  deviceType?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-16 w-16',
  lg: 'h-24 w-24',
};

const iconSizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
};

export function DeviceImage({ 
  photoUrl, 
  brand, 
  deviceType = 'smartphone',
  size = 'md',
  className 
}: DeviceImageProps) {
  const [imageError, setImageError] = useState(false);
  const [brandLogoError, setBrandLogoError] = useState(false);
  const { logos } = useBrandLogos();
  
  const Icon = deviceIcons[deviceType] || Smartphone;
  
  // Get brand logo from cache
  const brandLogo = brand ? logos.get(brand.toLowerCase().trim())?.logo_url : null;
  
  // Reset errors when photo URL changes
  useEffect(() => {
    setImageError(false);
    setBrandLogoError(false);
  }, [photoUrl, brand]);

  // Priority 1: Device photo
  if (photoUrl && !imageError) {
    return (
      <div className={cn("relative", className)}>
        <img
          src={photoUrl}
          alt="Device"
          className={cn(
            sizeClasses[size],
            "rounded-xl object-cover ring-2 ring-border group-hover:ring-primary/30 transition-all"
          )}
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Priority 2: Brand logo from database
  if (brandLogo && !brandLogoError) {
    return (
      <div 
        className={cn(
          sizeClasses[size],
          "rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center ring-2 ring-border group-hover:ring-primary/30 transition-all p-2",
          className
        )}
      >
        <img
          src={brandLogo}
          alt={brand || 'Brand'}
          className={cn(iconSizeClasses[size], "object-contain opacity-70")}
          onError={() => setBrandLogoError(true)}
          style={{ filter: 'brightness(0) invert(0.5)' }}
        />
      </div>
    );
  }

  // Priority 3: Generic device icon
  return (
    <div 
      className={cn(
        sizeClasses[size],
        "rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center ring-2 ring-border group-hover:ring-primary/30 transition-all",
        className
      )}
    >
      <Icon className={cn(iconSizeClasses[size], "text-muted-foreground")} />
    </div>
  );
}
