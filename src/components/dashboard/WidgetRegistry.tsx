import {
  Clock,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Users,
  Euro,
  TrendingUp,
  BarChart3,
  Activity,
  Zap,
} from "lucide-react";
import { WidgetConfig, WidgetType } from "./types";

export const widgetRegistry: Record<WidgetType, WidgetConfig> = {
  'stat-pending': {
    type: 'stat-pending',
    title: 'In Attesa',
    description: 'Riparazioni in attesa di lavorazione',
    icon: Clock,
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 2, h: 1 },
  },
  'stat-in-progress': {
    type: 'stat-in-progress',
    title: 'In Lavorazione',
    description: 'Riparazioni attualmente in corso',
    icon: Wrench,
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 2, h: 1 },
  },
  'stat-completed': {
    type: 'stat-completed',
    title: 'Completate Oggi',
    description: 'Riparazioni completate oggi',
    icon: CheckCircle2,
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 2, h: 1 },
  },
  'stat-low-stock': {
    type: 'stat-low-stock',
    title: 'Scorte Basse',
    description: 'Ricambi con stock sotto il minimo',
    icon: AlertTriangle,
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 2, h: 1 },
  },
  'stat-forfeitures': {
    type: 'stat-forfeitures',
    title: 'In Scadenza',
    description: 'Dispositivi vicini alla scadenza',
    icon: Clock,
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 2, h: 1 },
  },
  'stat-customers': {
    type: 'stat-customers',
    title: 'Clienti',
    description: 'Totale clienti registrati',
    icon: Users,
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 2, h: 1 },
  },
  'stat-revenue': {
    type: 'stat-revenue',
    title: 'Fatturato',
    description: 'Fatturato totale',
    icon: Euro,
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 2, h: 1 },
  },
  'stat-active': {
    type: 'stat-active',
    title: 'Attive',
    description: 'Riparazioni attive totali',
    icon: TrendingUp,
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 2, h: 1 },
  },
  'chart-weekly': {
    type: 'chart-weekly',
    title: 'Andamento Settimanale',
    description: 'Grafico riparazioni della settimana',
    icon: BarChart3,
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 2 },
  },
  'recent-repairs': {
    type: 'recent-repairs',
    title: 'Riparazioni Recenti',
    description: 'Ultime riparazioni inserite',
    icon: Wrench,
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 3, h: 2 },
  },
  'quick-access': {
    type: 'quick-access',
    title: 'Accesso Rapido',
    description: 'Link rapidi alle sezioni',
    icon: Activity,
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 3, h: 2 },
  },
  'alerts': {
    type: 'alerts',
    title: 'Avvisi',
    description: 'Notifiche e avvisi importanti',
    icon: Zap,
    defaultSize: { w: 6, h: 2 },
    minSize: { w: 4, h: 2 },
  },
};

export const getWidgetConfig = (type: WidgetType): WidgetConfig => {
  return widgetRegistry[type];
};

export const getAllWidgetTypes = (): WidgetType[] => {
  return Object.keys(widgetRegistry) as WidgetType[];
};
