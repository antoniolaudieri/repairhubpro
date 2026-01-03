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
  // Double the items for seamless loop
  const scrollItems = [...BRANDS, ...BRANDS];

  return (
    <div className={`overflow-hidden py-6 ${className}`}>
      <div className="relative">
        <div 
          className="flex items-center gap-10 sm:gap-14 animate-scroll-brands whitespace-nowrap"
          style={{ animationDuration: `${speed}s` }}
        >
          {scrollItems.map((brand, index) => (
            <div 
              key={`${brand.name}-${index}`}
              className="flex items-center justify-center px-4"
            >
              <img 
                src={brand.logo} 
                alt={brand.name}
                className="h-6 sm:h-8 w-auto object-contain opacity-40 hover:opacity-80 transition-opacity"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
