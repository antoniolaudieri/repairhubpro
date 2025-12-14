import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface TickerMessage {
  id: string;
  text: string;
  emoji?: string;
}

interface ScrollingTickerProps {
  messages: TickerMessage[];
  speed?: number; // pixels per second
  backgroundColor?: string;
  textColor?: string;
}

export function ScrollingTicker({ 
  messages, 
  speed = 50,
  backgroundColor = "rgba(0,0,0,0.8)",
  textColor = "#ffffff"
}: ScrollingTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      // Measure actual content width
      const width = contentRef.current.scrollWidth / 3; // Divided by 3 because we tripled the content
      setContentWidth(width);
    }
  }, [messages]);

  if (!messages || messages.length === 0) return null;

  // Create repeated content for seamless loop
  const tickerContent = [...messages, ...messages, ...messages];
  
  // Calculate animation duration based on content width and speed
  const duration = contentWidth > 0 ? contentWidth / speed : 20;

  return (
    <div 
      ref={containerRef}
      className="fixed bottom-0 left-0 right-0 z-50 overflow-hidden backdrop-blur-md border-t border-white/10"
      style={{ backgroundColor }}
    >
      <div className="relative h-12 flex items-center overflow-hidden">
        <motion.div
          ref={contentRef}
          className="flex items-center gap-8 whitespace-nowrap"
          animate={{
            x: contentWidth > 0 ? [0, -contentWidth] : [0, -1000],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: duration,
              ease: "linear",
            },
          }}
        >
          {tickerContent.map((message, index) => (
            <span 
              key={`${message.id}-${index}`} 
              className="flex items-center gap-2 text-lg font-medium px-4"
              style={{ color: textColor }}
            >
              {message.emoji && <span className="text-xl">{message.emoji}</span>}
              <span>{message.text}</span>
              <span className="mx-4 text-white/30">•</span>
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}