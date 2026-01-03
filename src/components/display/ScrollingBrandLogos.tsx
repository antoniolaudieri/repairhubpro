const BRANDS = [
  { name: "Apple", logo: "/brand-logos/apple.svg" },
  { name: "Samsung", logo: "/brand-logos/samsung.svg" },
  { name: "Huawei", logo: "/brand-logos/huawei.svg" },
  { name: "Xiaomi", logo: "/brand-logos/xiaomi.svg" },
  { name: "OnePlus", logo: "/brand-logos/oneplus.svg" },
  { name: "Google", logo: "/brand-logos/google.svg" },
  { name: "OPPO", logo: "/brand-logos/oppo.svg" },
  { name: "Motorola", logo: "/brand-logos/motorola.svg" },
  { name: "Sony", logo: "/brand-logos/sony.svg" },
  { name: "Nokia", logo: "/brand-logos/nokia.svg" },
  { name: "Honor", logo: "/brand-logos/honor.svg" },
  { name: "ASUS", logo: "/brand-logos/asus.svg" },
  { name: "Lenovo", logo: "/brand-logos/lenovo.svg" },
  { name: "HP", logo: "/brand-logos/hp.svg" },
  { name: "Dell", logo: "/brand-logos/dell.svg" },
];

interface ScrollingBrandLogosProps {
  speed?: number;
  className?: string;
}

export function ScrollingBrandLogos({ 
  speed = 30,
  className = "" 
}: ScrollingBrandLogosProps) {
  // Triple the items for seamless loop
  const scrollItems = [...BRANDS, ...BRANDS, ...BRANDS];

  return (
    <div className={`w-full overflow-hidden py-6 ${className}`}>
      <div 
        className="inline-flex items-center gap-16 animate-scroll-brands"
        style={{ 
          animationDuration: `${speed}s`,
        }}
      >
        {scrollItems.map((brand, index) => (
          <div 
            key={`${brand.name}-${index}`}
            className="flex-shrink-0"
          >
            <img 
              src={brand.logo} 
              alt={brand.name}
              title={brand.name}
              width={80}
              height={32}
              className="h-8 w-auto opacity-50 hover:opacity-100 transition-opacity"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
