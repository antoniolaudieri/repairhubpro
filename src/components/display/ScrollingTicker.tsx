import { useEffect, useState } from "react";

interface TickerMessage {
  id: string;
  text: string;
  emoji?: string;
}

interface ScrollingTickerProps {
  messages: TickerMessage[];
  speed?: number; // duration in seconds for one loop
  backgroundColor?: string;
  textColor?: string;
}

export function ScrollingTicker({ 
  messages, 
  speed = 30,
  backgroundColor = "rgba(0,0,0,0.85)",
  textColor = "#ffffff"
}: ScrollingTickerProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!messages || messages.length === 0) return null;

  // Create doubled content for seamless loop
  const tickerContent = [...messages, ...messages];

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-[9999] overflow-hidden"
      style={{ backgroundColor }}
    >
      <div className="relative h-12 flex items-center">
        <div 
          className="flex items-center whitespace-nowrap animate-scroll-ticker"
          style={{
            animationDuration: `${speed}s`,
          }}
        >
          {tickerContent.map((message, index) => (
            <span 
              key={`${message.id}-${index}`} 
              className="flex items-center gap-3 text-base sm:text-lg md:text-xl font-semibold px-4 sm:px-6"
              style={{ color: textColor }}
            >
              {message.emoji && <span className="text-xl sm:text-2xl">{message.emoji}</span>}
              <span className="drop-shadow-sm">{message.text}</span>
              <span className="mx-4 sm:mx-6 text-white/50">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
