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
  if (!messages || messages.length === 0) return null;

  // Create repeated content for seamless loop
  const tickerContent = [...messages, ...messages, ...messages];
  
  // Calculate animation duration based on content length and speed
  const contentLength = messages.reduce((acc, m) => acc + m.text.length, 0) * 12 + messages.length * 60;
  const duration = contentLength / speed;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-40 overflow-hidden backdrop-blur-md border-t border-white/10"
      style={{ backgroundColor }}
    >
      <div className="relative h-12 flex items-center">
        <motion.div
          className="flex items-center gap-8 whitespace-nowrap"
          animate={{
            x: [0, -contentLength],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration,
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
