import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Users, 
  Wrench, 
  Euro, 
  Brain, 
  Star, 
  Calendar,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  Sparkles,
  Target,
  BarChart3,
  ShoppingCart,
  Monitor,
  Bell
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Dashboard Mockup
export function DashboardMockup() {
  return (
    <div className="bg-background rounded-2xl border border-border/50 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 border-b border-border/30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-destructive/60" />
          <div className="w-3 h-3 rounded-full bg-warning/60" />
          <div className="w-3 h-3 rounded-full bg-success/60" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">Dashboard Centro</span>
      </div>
      
      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: Wrench, label: "Riparazioni", value: "127", trend: "+12%", color: "text-primary" },
            { icon: Euro, label: "Fatturato", value: "€8,450", trend: "+18%", color: "text-success" },
            { icon: Users, label: "Clienti", value: "89", trend: "+7%", color: "text-info" },
            { icon: Star, label: "Rating", value: "4.9", trend: "", color: "text-warning" },
          ].map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-muted/30 rounded-xl p-3 border border-border/30"
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                {stat.trend && (
                  <span className="text-[10px] text-success flex items-center gap-0.5">
                    <ArrowUpRight className="h-2.5 w-2.5" />
                    {stat.trend}
                  </span>
                )}
              </div>
              <div className="text-lg font-bold">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Goals Widget */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Obiettivo Mensile</span>
            </div>
            <Badge variant="secondary" className="text-[10px]">75%</Badge>
          </div>
          <Progress value={75} className="h-2" />
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>€6,338 / €8,450</span>
            <span>8 giorni rimanenti</span>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <div className="text-xs font-medium text-muted-foreground mb-2">Attività Recenti</div>
          {[
            { status: "success", text: "iPhone 14 Pro - Schermo riparato", time: "2 min" },
            { status: "warning", text: "Samsung S23 - In attesa ricambi", time: "15 min" },
            { status: "info", text: "Nuovo preventivo inviato", time: "1 ora" },
          ].map((activity, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20">
              <div className={`w-2 h-2 rounded-full ${
                activity.status === 'success' ? 'bg-success' : 
                activity.status === 'warning' ? 'bg-warning' : 'bg-info'
              }`} />
              <span className="text-xs flex-1 truncate">{activity.text}</span>
              <span className="text-[10px] text-muted-foreground">{activity.time}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// AI Quotes Mockup
export function AIQuotesMockup() {
  return (
    <div className="bg-background rounded-2xl border border-border/50 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 border-b border-border/30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-destructive/60" />
          <div className="w-3 h-3 rounded-full bg-warning/60" />
          <div className="w-3 h-3 rounded-full bg-success/60" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">Preventivo con IA</span>
      </div>

      <div className="p-6 space-y-4">
        {/* Device Info */}
        <div className="flex items-center gap-4 p-3 bg-muted/20 rounded-xl border border-border/30">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium text-sm">iPhone 14 Pro Max</div>
            <div className="text-xs text-muted-foreground">Schermo rotto + batteria scarica</div>
          </div>
        </div>

        {/* AI Suggestions */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-xs font-medium">Suggerimenti IA</span>
          </div>
          
          {[
            { name: "Display OLED iPhone 14 Pro Max", price: "€189.00", type: "Ricambio" },
            { name: "Batteria iPhone 14 Pro Max", price: "€45.00", type: "Ricambio" },
            { name: "Sostituzione Schermo", price: "€35.00", type: "Manodopera" },
            { name: "Sostituzione Batteria", price: "€15.00", type: "Manodopera" },
          ].map((item, i) => (
            <motion.div 
              key={item.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-center justify-between p-3 rounded-xl bg-success/5 border border-success/20"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-success" />
                <div>
                  <div className="text-xs font-medium">{item.name}</div>
                  <Badge variant="outline" className="text-[9px] mt-1">{item.type}</Badge>
                </div>
              </div>
              <span className="text-sm font-bold text-success">{item.price}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Total */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20">
          <span className="text-sm font-medium">Totale Preventivo</span>
          <span className="text-xl font-bold text-primary">€284.00</span>
        </div>
      </div>
    </div>
  );
}

// Customer Analytics Mockup
export function CustomerAnalyticsMockup() {
  return (
    <div className="bg-background rounded-2xl border border-border/50 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 border-b border-border/30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-destructive/60" />
          <div className="w-3 h-3 rounded-full bg-warning/60" />
          <div className="w-3 h-3 rounded-full bg-success/60" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">Analytics Clienti IA</span>
      </div>

      <div className="p-6 space-y-4">
        {/* Customer Score */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: "Gold", count: 24, color: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
            { label: "Standard", count: 45, color: "text-info", bg: "bg-info/10", border: "border-info/30" },
            { label: "A Rischio", count: 8, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
          ].map((tier, i) => (
            <motion.div 
              key={tier.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className={`${tier.bg} ${tier.border} border rounded-xl p-3 text-center`}
            >
              <div className={`text-2xl font-bold ${tier.color}`}>{tier.count}</div>
              <div className="text-[10px] text-muted-foreground">{tier.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Prediction Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">Predizioni IA</span>
          </div>
          
          {[
            { name: "Mario Rossi", score: 92, prediction: "Ritorno tra 5 giorni", badge: "Gold" },
            { name: "Laura Bianchi", score: 78, prediction: "Ritorno questa settimana", badge: "Standard" },
            { name: "Giuseppe Verdi", score: 45, prediction: "In ritardo - contattare", badge: "A Rischio" },
          ].map((customer, i) => (
            <motion.div 
              key={customer.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-bold">
                  {customer.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-xs font-medium">{customer.name}</div>
                  <div className="text-[10px] text-muted-foreground">{customer.prediction}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={customer.badge === 'Gold' ? 'default' : customer.badge === 'A Rischio' ? 'destructive' : 'secondary'} className="text-[9px]">
                  {customer.score}
                </Badge>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* AI Chat Hint */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3"
        >
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium">Agente IA disponibile</div>
            <div className="text-[10px] text-muted-foreground">Chiedi informazioni sui tuoi clienti...</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Inventory & Orders Mockup
export function InventoryMockup() {
  return (
    <div className="bg-background rounded-2xl border border-border/50 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 border-b border-border/30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-destructive/60" />
          <div className="w-3 h-3 rounded-full bg-warning/60" />
          <div className="w-3 h-3 rounded-full bg-success/60" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">Inventario & Ordini</span>
      </div>

      <div className="p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Totale Ricambi", value: "342", icon: Package },
            { label: "Ordini Attivi", value: "8", icon: ShoppingCart },
            { label: "Scorta Bassa", value: "12", icon: AlertCircle },
          ].map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-muted/30 rounded-xl p-3 border border-border/30 text-center"
            >
              <stat.icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-lg font-bold">{stat.value}</div>
              <div className="text-[9px] text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Parts List */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <div className="text-xs font-medium text-muted-foreground">Ricambi Recenti</div>
          {[
            { name: "Display iPhone 14 Pro", stock: 5, price: "€189" },
            { name: "Batteria Samsung S23", stock: 12, price: "€35" },
            { name: "Cover Posteriore Pixel 7", stock: 2, price: "€45" },
          ].map((part, i) => (
            <div key={part.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
              <div>
                <div className="text-xs font-medium">{part.name}</div>
                <div className="text-[10px] text-muted-foreground">Giacenza: {part.stock}</div>
              </div>
              <Badge variant="outline" className="text-xs">{part.price}</Badge>
            </div>
          ))}
        </motion.div>

        {/* Utopya Integration */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/20"
        >
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-medium">Integrazione Utopya</span>
          </div>
          <div className="text-[10px] text-muted-foreground">Acquista ricambi con un click direttamente dal gestionale</div>
        </motion.div>
      </div>
    </div>
  );
}

// Display Ads Mockup
export function DisplayAdsMockup() {
  return (
    <div className="bg-background rounded-2xl border border-border/50 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 border-b border-border/30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-destructive/60" />
          <div className="w-3 h-3 rounded-full bg-warning/60" />
          <div className="w-3 h-3 rounded-full bg-success/60" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">Display Pubblicitario</span>
      </div>

      <div className="p-6 space-y-4">
        {/* Monitor Preview */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative aspect-video bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-xl border-4 border-muted overflow-hidden"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-center p-4"
            >
              <Monitor className="h-8 w-8 mx-auto mb-2 text-primary/60" />
              <div className="text-sm font-medium">Il tuo annuncio qui</div>
              <div className="text-[10px] text-muted-foreground">Rotazione automatica ogni 5s</div>
            </motion.div>
          </div>
          {/* Corner indicators */}
          <div className="absolute top-2 right-2 px-2 py-1 bg-destructive/80 rounded text-[8px] text-white font-medium">LIVE</div>
        </motion.div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Clock, text: "Rotazione Auto" },
            { icon: Bell, text: "Notifiche Clienti" },
            { icon: Euro, text: "Monetizzazione" },
            { icon: BarChart3, text: "Analytics" },
          ].map((feature, i) => (
            <motion.div 
              key={feature.text}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/20"
            >
              <feature.icon className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px]">{feature.text}</span>
            </motion.div>
          ))}
        </div>

        {/* Info */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-3 rounded-xl bg-info/10 border border-info/20"
        >
          <div className="text-xs font-medium text-info">Display Esterno Dedicato</div>
          <div className="text-[10px] text-muted-foreground mt-1">
            Mostra pubblicità personalizzate ai clienti in attesa e intrattieni con contenuti brandizzati
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Used Devices Marketplace Mockup
export function MarketplaceMockup() {
  return (
    <div className="bg-background rounded-2xl border border-border/50 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 border-b border-border/30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-destructive/60" />
          <div className="w-3 h-3 rounded-full bg-warning/60" />
          <div className="w-3 h-3 rounded-full bg-success/60" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">Marketplace Usato</span>
      </div>

      <div className="p-6 space-y-4">
        {/* Device Cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "iPhone 13 Pro", price: "€549", condition: "Ricondizionato", color: "bg-success/10 border-success/30" },
            { name: "Samsung S22", price: "€389", condition: "Usato Buono", color: "bg-info/10 border-info/30" },
          ].map((device, i) => (
            <motion.div 
              key={device.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.15 }}
              className={`${device.color} border rounded-xl p-3`}
            >
              <div className="w-full aspect-square bg-muted/30 rounded-lg mb-2 flex items-center justify-center">
                <Package className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div className="text-xs font-medium">{device.name}</div>
              <div className="text-[10px] text-muted-foreground">{device.condition}</div>
              <div className="text-sm font-bold text-primary mt-1">{device.price}</div>
            </motion.div>
          ))}
        </div>

        {/* AI Valuation */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">Valutazione IA Istantanea</span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            L'IA analizza condizione, mercato e storico vendite per suggerire il prezzo ottimale
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Pubblicati", value: "45" },
            { label: "Venduti", value: "128" },
            { label: "Guadagno", value: "€12K" },
          ].map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="text-center p-2 rounded-lg bg-muted/20"
            >
              <div className="text-sm font-bold">{stat.value}</div>
              <div className="text-[9px] text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
