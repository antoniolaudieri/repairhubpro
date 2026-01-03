import { useBrandLogos } from "@/utils/brandLogos";

const DEFAULT_BRANDS = [
  { name: "Apple", logo: "🍎" },
  { name: "Samsung", logo: "📱" },
  { name: "Huawei", logo: "📲" },
  { name: "Xiaomi", logo: "📱" },
  { name: "OnePlus", logo: "📱" },
  { name: "Google", logo: "🔍" },
  { name: "OPPO", logo: "📱" },
  { name: "Realme", logo: "📱" },
  { name: "Motorola", logo: "📱" },
  { name: "Sony", logo: "🎮" },
  { name: "LG", logo: "📺" },
  { name: "Nokia", logo: "📱" },
  { name: "Asus", logo: "💻" },
  { name: "Lenovo", logo: "💻" },
  { name: "HP", logo: "💻" },
  { name: "Dell", logo: "💻" },
];

interface ScrollingBrandLogosProps {
  speed?: number;
  className?: string;
}

export function ScrollingBrandLogos({ 
  speed = 40,
  className = "" 
}: ScrollingBrandLogosProps) {
  const { logos, isLoading } = useBrandLogos();

  // Create brand items with logos from DB or fallback to text
  const brandItems = DEFAULT_BRANDS.map(brand => {
    const dbLogo = logos.get(brand.name.toLowerCase());
    return {
      name: brand.name,
      logoUrl: dbLogo?.logo_url || null,
      displayName: dbLogo?.display_name || brand.name,
    };
  });

  // Double the items for seamless loop
  const scrollItems = [...brandItems, ...brandItems];

  return (
    <div className={`overflow-hidden bg-muted/30 py-8 ${className}`}>
      <div className="relative">
        <div 
          className="flex items-center gap-12 animate-scroll-brands whitespace-nowrap"
          style={{ animationDuration: `${speed}s` }}
        >
          {scrollItems.map((brand, index) => (
            <div 
              key={`${brand.name}-${index}`}
              className="flex items-center gap-3 px-4"
            >
              {brand.logoUrl ? (
                <img 
                  src={brand.logoUrl} 
                  alt={brand.displayName}
                  className="h-8 w-auto object-contain opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
                  loading="lazy"
                />
              ) : (
                <span className="text-xl font-semibold text-muted-foreground/60 hover:text-foreground transition-colors tracking-wide">
                  {brand.displayName}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
