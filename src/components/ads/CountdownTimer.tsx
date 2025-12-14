import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Timer } from 'lucide-react';

interface CountdownTimerProps {
  endDate: string;
  text?: string;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({ endDate, text = 'Offerta valida ancora', className = '' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endDate).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setIsExpired(true);
        return null;
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };

    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      if (newTimeLeft) {
        setTimeLeft(newTimeLeft);
      } else {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  if (isExpired || !timeLeft) {
    return null;
  }

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-black/40 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20 ${className}`}
    >
      <div className="flex items-center gap-3 text-white mb-2">
        <Timer className="h-5 w-5 text-amber-400" />
        <span className="text-sm font-medium opacity-90">{text}</span>
      </div>
      <div className="flex items-center gap-2">
        {timeLeft.days > 0 && (
          <>
            <TimeBlock value={timeLeft.days} label="giorni" />
            <span className="text-white/60 text-2xl font-light">:</span>
          </>
        )}
        <TimeBlock value={timeLeft.hours} label="ore" />
        <span className="text-white/60 text-2xl font-light">:</span>
        <TimeBlock value={timeLeft.minutes} label="min" />
        <span className="text-white/60 text-2xl font-light">:</span>
        <TimeBlock value={timeLeft.seconds} label="sec" />
      </div>
    </motion.div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <motion.span 
        key={value}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-3xl md:text-4xl font-bold text-white tabular-nums"
      >
        {value.toString().padStart(2, '0')}
      </motion.span>
      <span className="text-xs text-white/60 uppercase tracking-wider">{label}</span>
    </div>
  );
}
