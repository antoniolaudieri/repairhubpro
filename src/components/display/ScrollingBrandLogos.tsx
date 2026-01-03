const BRANDS = [
  "Apple",
  "Samsung", 
  "Huawei",
  "Xiaomi",
  "OnePlus",
  "Google",
  "OPPO",
  "Realme",
  "Motorola",
  "Sony",
  "Nokia",
  "Honor",
  "ASUS",
  "Lenovo",
  "HP",
  "Dell",
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
          className="flex items-center gap-8 sm:gap-12 animate-scroll-brands whitespace-nowrap"
          style={{ animationDuration: `${speed}s` }}
        >
          {scrollItems.map((brand, index) => (
            <span 
              key={`${brand}-${index}`}
              className="text-lg sm:text-xl font-semibold text-muted-foreground/50 hover:text-foreground transition-colors tracking-wide px-2"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
