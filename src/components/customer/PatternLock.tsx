import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface PatternLockProps {
  onPatternComplete: (pattern: string) => void;
  pattern: string;
}

export function PatternLock({ onPatternComplete, pattern }: PatternLockProps) {
  const [selectedDots, setSelectedDots] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 3x3 grid positions (1-9)
  const dots = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  const getDotPosition = (dotIndex: number): { row: number; col: number } => {
    const index = dotIndex - 1;
    return {
      row: Math.floor(index / 3),
      col: index % 3
    };
  };

  const getPointFromEvent = (e: React.TouchEvent | React.MouseEvent): { x: number; y: number } | null => {
    if (!containerRef.current) return null;
    
    const rect = containerRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const getDotAtPosition = (x: number, y: number): number | null => {
    if (!containerRef.current) return null;
    
    const rect = containerRef.current.getBoundingClientRect();
    const dotSize = rect.width / 3;
    
    for (let i = 0; i < 9; i++) {
      const dotRow = Math.floor(i / 3);
      const dotCol = i % 3;
      const dotCenterX = (dotCol + 0.5) * dotSize;
      const dotCenterY = (dotRow + 0.5) * dotSize;
      
      const distance = Math.sqrt(Math.pow(x - dotCenterX, 2) + Math.pow(y - dotCenterY, 2));
      
      if (distance < dotSize * 0.35) {
        return i + 1;
      }
    }
    
    return null;
  };

  const handleStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    setSelectedDots([]);
    
    const point = getPointFromEvent(e);
    if (point) {
      const dot = getDotAtPosition(point.x, point.y);
      if (dot) {
        setSelectedDots([dot]);
      }
    }
  }, []);

  const handleMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const point = getPointFromEvent(e);
    if (point) {
      const dot = getDotAtPosition(point.x, point.y);
      if (dot && !selectedDots.includes(dot)) {
        setSelectedDots(prev => [...prev, dot]);
      }
    }
  }, [isDrawing, selectedDots]);

  const handleEnd = useCallback(() => {
    setIsDrawing(false);
    if (selectedDots.length >= 4) {
      const patternString = selectedDots.join('');
      onPatternComplete(patternString);
    }
  }, [selectedDots, onPatternComplete]);

  const clearPattern = () => {
    setSelectedDots([]);
    onPatternComplete('');
  };

  // Calculate line positions
  const getLineCoords = () => {
    if (selectedDots.length < 2) return [];
    
    const lines: { x1: string; y1: string; x2: string; y2: string }[] = [];
    
    for (let i = 0; i < selectedDots.length - 1; i++) {
      const from = getDotPosition(selectedDots[i]);
      const to = getDotPosition(selectedDots[i + 1]);
      
      lines.push({
        x1: `${(from.col + 0.5) * 33.33}%`,
        y1: `${(from.row + 0.5) * 33.33}%`,
        x2: `${(to.col + 0.5) * 33.33}%`,
        y2: `${(to.row + 0.5) * 33.33}%`
      });
    }
    
    return lines;
  };

  const displayPattern = pattern || selectedDots.join('');

  return (
    <div className="space-y-4">
      <div 
        ref={containerRef}
        className="relative w-full aspect-square max-w-[280px] mx-auto bg-slate-800/50 rounded-2xl border-2 border-white/20 p-4 touch-none select-none"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      >
        {/* SVG for lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          {getLineCoords().map((line, idx) => (
            <motion.line
              key={idx}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="url(#lineGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.15 }}
            />
          ))}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>

        {/* Dots grid */}
        <div className="grid grid-cols-3 gap-0 w-full h-full relative" style={{ zIndex: 2 }}>
          {dots.map((dot) => {
            const isSelected = selectedDots.includes(dot);
            const order = selectedDots.indexOf(dot);
            
            return (
              <div
                key={dot}
                className="flex items-center justify-center"
              >
                <motion.div
                  className={`relative flex items-center justify-center transition-all duration-150 ${
                    isSelected ? 'scale-110' : ''
                  }`}
                  animate={isSelected ? { scale: [1, 1.2, 1.1] } : { scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Outer ring */}
                  <div className={`absolute w-16 h-16 rounded-full border-2 transition-all duration-200 ${
                    isSelected 
                      ? 'border-blue-400 bg-blue-500/20' 
                      : 'border-white/20'
                  }`} />
                  
                  {/* Inner dot */}
                  <motion.div 
                    className={`w-5 h-5 rounded-full transition-all duration-200 ${
                      isSelected 
                        ? 'bg-gradient-to-br from-blue-400 to-violet-500 shadow-lg shadow-blue-500/50' 
                        : 'bg-white/40'
                    }`}
                    animate={isSelected ? { scale: [1, 1.3, 1.2] } : { scale: 1 }}
                  />
                  
                  {/* Order number */}
                  {isSelected && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
                    >
                      {order + 1}
                    </motion.span>
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pattern display and clear button */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          {displayPattern && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-500/20 to-violet-500/20 rounded-lg border border-white/10"
            >
              <span className="text-sm font-mono text-white/80">
                Pattern: {displayPattern.split('').join(' → ')}
              </span>
            </motion.div>
          )}
        </div>
        
        {(displayPattern || selectedDots.length > 0) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={clearPattern}
            className="px-3 py-1.5 text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            Cancella
          </motion.button>
        )}
      </div>
      
      {selectedDots.length > 0 && selectedDots.length < 4 && (
        <p className="text-center text-xs text-amber-400/80">
          Collega almeno 4 punti per un pattern valido
        </p>
      )}
    </div>
  );
}
