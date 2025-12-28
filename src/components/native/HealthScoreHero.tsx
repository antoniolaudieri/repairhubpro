import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";

interface HealthScoreHeroProps {
  score: number;
  lastSyncAt?: Date | null;
  isLoading?: boolean;
}

export const HealthScoreHero = ({ score, lastSyncAt, isLoading = false }: HealthScoreHeroProps) => {
  const getScoreColor = () => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreGradient = () => {
    if (score >= 80) return "from-green-400 to-emerald-600";
    if (score >= 60) return "from-yellow-400 to-amber-600";
    if (score >= 40) return "from-orange-400 to-orange-600";
    return "from-red-400 to-red-600";
  };

  const getScoreLabel = () => {
    if (score >= 90) return "Eccellente";
    if (score >= 80) return "Ottimo";
    if (score >= 70) return "Buono";
    if (score >= 60) return "Discreto";
    if (score >= 50) return "Sufficiente";
    if (score >= 40) return "Scarso";
    return "Critico";
  };

  const getScoreIcon = () => {
    if (score >= 70) return <TrendingUp className="h-4 w-4" />;
    if (score >= 40) return <Minus className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  const strokeDasharray = 2 * Math.PI * 58; // 58 is the radius
  const strokeDashoffset = strokeDasharray - (strokeDasharray * score) / 100;

  return (
    <div className="relative flex flex-col items-center justify-center py-4">
      {/* Glow effect */}
      <motion.div
        className={`absolute w-40 h-40 rounded-full bg-gradient-to-br ${getScoreGradient()} blur-3xl opacity-30`}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.35, 0.2],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Score circle */}
      <motion.div 
        className="relative w-44 h-44"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          {/* Background circle */}
          <circle
            cx="64"
            cy="64"
            r="58"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted/30"
          />
          
          {/* Progress circle */}
          <motion.circle
            cx="64"
            cy="64"
            r="58"
            stroke="url(#scoreGradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            initial={{ strokeDashoffset: strokeDasharray }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              {score >= 80 ? (
                <>
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#10b981" />
                </>
              ) : score >= 60 ? (
                <>
                  <stop offset="0%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </>
              ) : score >= 40 ? (
                <>
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ea580c" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#dc2626" />
                </>
              )}
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isLoading ? (
            <motion.div
              className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            <>
              <motion.span
                className={`text-5xl font-bold ${getScoreColor()}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
              >
                {Math.round(score)}
              </motion.span>
              <motion.div
                className={`flex items-center gap-1 mt-1 ${getScoreColor()}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {getScoreIcon()}
                <span className="text-sm font-medium">{getScoreLabel()}</span>
              </motion.div>
            </>
          )}
        </div>
      </motion.div>

      {/* Health label */}
      <motion.div
        className="mt-4 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="text-lg font-semibold text-foreground">Salute Dispositivo</h2>
        {lastSyncAt && (
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
            <Zap className="h-3 w-3" />
            Ultimo sync: {lastSyncAt.toLocaleDateString("it-IT", { 
              day: "numeric", 
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </p>
        )}
      </motion.div>
    </div>
  );
};
