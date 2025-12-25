import { motion } from "framer-motion";
import { Package, Eye, Clock, ShoppingCart, AlertCircle, TrendingUp, Sparkles, Store } from "lucide-react";

interface UsatoHeroStatsProps {
  stats: {
    total: number;
    published: number;
    reserved: number;
    sold: number;
    pendingReservations: number;
  };
}

const statCards = [
  { key: 'total', label: 'Totale', icon: Package, gradient: 'from-slate-500 to-slate-600', lightGradient: 'from-slate-50 to-slate-100' },
  { key: 'published', label: 'Pubblicati', icon: Eye, gradient: 'from-emerald-500 to-green-600', lightGradient: 'from-emerald-50 to-green-100' },
  { key: 'reserved', label: 'Prenotati', icon: Clock, gradient: 'from-amber-500 to-orange-600', lightGradient: 'from-amber-50 to-orange-100' },
  { key: 'sold', label: 'Venduti', icon: ShoppingCart, gradient: 'from-blue-500 to-indigo-600', lightGradient: 'from-blue-50 to-indigo-100' },
  { key: 'pendingReservations', label: 'Richieste', icon: AlertCircle, gradient: 'from-rose-500 to-pink-600', lightGradient: 'from-rose-50 to-pink-100' },
];

export function UsatoHeroStats({ stats }: UsatoHeroStatsProps) {
  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-primary/5 border border-primary/20 p-6 md:p-8"
      >
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
                  <Store className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    Marketplace Usato
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Gestisci il tuo catalogo di dispositivi ricondizionati
                  </p>
                </div>
              </div>
            </div>
            
            {/* Quick stats badges */}
            <div className="flex flex-wrap items-center gap-2">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
              >
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {stats.sold} venduti
                </span>
              </motion.div>
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">
                  {stats.published} online
                </span>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          const value = stats[card.key as keyof typeof stats];
          const isHighlighted = card.key === 'pendingReservations' && value > 0;
          
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`
                relative overflow-hidden rounded-xl border p-4 transition-all hover:shadow-lg hover:scale-[1.02]
                ${isHighlighted 
                  ? 'border-warning bg-warning/5 shadow-warning/20' 
                  : 'border-border/50 bg-card hover:border-primary/30'
                }
              `}
            >
              {/* Subtle gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.lightGradient} opacity-30 dark:opacity-10`} />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${card.gradient} shadow-sm`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  {isHighlighted && (
                    <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-warning opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-2xl md:text-3xl font-bold tracking-tight">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
