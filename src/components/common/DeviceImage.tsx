import { useState, useEffect } from 'react';
import { Smartphone, Tablet, Laptop, Monitor, Watch, Gamepad, LucideIcon, Loader2 } from 'lucide-react';
import { useBrandLogos } from '@/utils/brandLogos';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

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
  model?: string | null;
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
  model,
  deviceType = 'smartphone',
  size = 'md',
  className 
}: DeviceImageProps) {
  const [imageError, setImageError] = useState(false);
  const [brandLogoError, setBrandLogoError] = useState(false);
  const [lookupImage, setLookupImage] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const { logos } = useBrandLogos();
  
  const Icon = deviceIcons[deviceType] || Smartphone;
  
  // Get brand logo from cache
  const brandLogo = brand ? logos.get(brand.toLowerCase().trim())?.logo_url : null;
  
  // Reset errors when photo URL changes
  useEffect(() => {
    setImageError(false);
    setBrandLogoError(false);
    setLookupError(false);
    setLookupImage(null);
  }, [photoUrl, brand, model]);

  // Lookup device image when no photo and no brand logo
  useEffect(() => {
    const shouldLookup = !photoUrl && brand && model && !brandLogo && !lookupImage && !lookupLoading && !lookupError;
    
    if (shouldLookup) {
      const lookupDeviceImage = async () => {
        setLookupLoading(true);
        try {
          const { data, error } = await supabase.functions.invoke('lookup-device', {
            body: {
              brand,
              model,
              deviceType
            }
          });

          if (error) throw error;
          
          if (data?.imageUrl) {
            setLookupImage(data.imageUrl);
          }
        } catch (e) {
          console.log('Could not fetch device image:', e);
          setLookupError(true);
        } finally {
          setLookupLoading(false);
        }
      };

      lookupDeviceImage();
    }
  }, [photoUrl, brand, model, brandLogo, lookupImage, lookupLoading, lookupError, deviceType]);

  // Priority 1: Device photo from database
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

  // Priority 2: Lookup image from edge function
  if (lookupImage && !lookupError) {
    return (
      <div className={cn("relative", className)}>
        <img
          src={lookupImage}
          alt={`${brand} ${model}`}
          className={cn(
            sizeClasses[size],
            "rounded-xl object-contain bg-gradient-to-br from-muted to-muted/50 ring-2 ring-border group-hover:ring-primary/30 transition-all p-1"
          )}
          onError={() => setLookupError(true)}
        />
      </div>
    );
  }

  // Show loading while looking up
  if (lookupLoading) {
    return (
      <div 
        className={cn(
          sizeClasses[size],
          "rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center ring-2 ring-border transition-all",
          className
        )}
      >
        <Loader2 className={cn(iconSizeClasses[size], "text-muted-foreground animate-spin")} />
      </div>
    );
  }

  // Priority 3: Brand logo from database
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

  // Priority 4: Generic device icon
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
