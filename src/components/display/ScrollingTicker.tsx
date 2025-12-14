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
      className="fixed bottom-16 left-0 right-0 z-[9999] overflow-hidden"
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
              className="flex items-center gap-3 text-lg font-medium px-6"
              style={{ color: textColor }}
            >
              {message.emoji && <span className="text-2xl">{message.emoji}</span>}
              <span>{message.text}</span>
              <span className="mx-6 text-white/40">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
