import { motion } from "framer-motion";

interface PatternDisplayProps {
  pattern: string;
  size?: "sm" | "md" | "lg";
}

export function PatternDisplay({ pattern, size = "md" }: PatternDisplayProps) {
  // Parse pattern string (e.g., "1593" -> [1, 5, 9, 3])
  const patternDots = pattern.split('').map(n => parseInt(n, 10)).filter(n => n >= 1 && n <= 9);
  
  const getDotPosition = (dotIndex: number): { row: number; col: number } => {
    const index = dotIndex - 1;
    return {
      row: Math.floor(index / 3),
      col: index % 3
    };
  };

  const getLineCoords = () => {
    if (patternDots.length < 2) return [];
    
    const lines: { x1: string; y1: string; x2: string; y2: string; delay: number }[] = [];
    
    for (let i = 0; i < patternDots.length - 1; i++) {
      const from = getDotPosition(patternDots[i]);
      const to = getDotPosition(patternDots[i + 1]);
      
      lines.push({
        x1: `${(from.col + 0.5) * 33.33}%`,
        y1: `${(from.row + 0.5) * 33.33}%`,
        x2: `${(to.col + 0.5) * 33.33}%`,
        y2: `${(to.row + 0.5) * 33.33}%`,
        delay: i * 0.1
      });
    }
    
    return lines;
  };

  const sizeClasses = {
    sm: "w-24 h-24",
    md: "w-32 h-32",
    lg: "w-48 h-48"
  };

  const dotSizeClasses = {
    sm: { outer: "w-6 h-6", inner: "w-2 h-2", order: "w-3 h-3 text-[8px]" },
    md: { outer: "w-8 h-8", inner: "w-2.5 h-2.5", order: "w-4 h-4 text-[9px]" },
    lg: { outer: "w-10 h-10", inner: "w-3 h-3", order: "w-5 h-5 text-[10px]" }
  };

  return (
    <div className={`relative ${sizeClasses[size]} bg-slate-800/50 rounded-xl border border-white/10 p-2`}>
      {/* SVG for lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
        {getLineCoords().map((line, idx) => (
          <motion.line
            key={idx}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="url(#patternLineGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: line.delay }}
          />
        ))}
        <defs>
          <linearGradient id="patternLineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>

      {/* Dots grid */}
      <div className="grid grid-cols-3 gap-0 w-full h-full relative" style={{ zIndex: 2 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((dot) => {
          const isSelected = patternDots.includes(dot);
          const order = patternDots.indexOf(dot);
          
          return (
            <div key={dot} className="flex items-center justify-center">
              <div className="relative flex items-center justify-center">
                {/* Outer ring */}
                <div className={`absolute ${dotSizeClasses[size].outer} rounded-full border transition-all duration-200 ${
                  isSelected 
                    ? 'border-blue-400 bg-blue-500/20' 
                    : 'border-white/20'
                }`} />
                
                {/* Inner dot */}
                <motion.div 
                  className={`${dotSizeClasses[size].inner} rounded-full transition-all duration-200 ${
                    isSelected 
                      ? 'bg-gradient-to-br from-blue-400 to-violet-500 shadow-sm shadow-blue-500/50' 
                      : 'bg-white/30'
                  }`}
                  initial={isSelected ? { scale: 0 } : { scale: 1 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: order * 0.1 }}
                />
                
                {/* Order number */}
                {isSelected && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: order * 0.1 + 0.1 }}
                    className={`absolute -top-0.5 -right-0.5 ${dotSizeClasses[size].order} bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center font-bold text-white shadow`}
                  >
                    {order + 1}
                  </motion.span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
