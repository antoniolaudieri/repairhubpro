import { useState, useEffect, useCallback } from "react";
import { DashboardWidget, WidgetType, Layouts, Layout } from "../components/dashboard/types";
import { widgetRegistry } from "../components/dashboard/WidgetRegistry";

const STORAGE_KEY = "dashboard-layout-v1";

const getDefaultWidgets = (): DashboardWidget[] => [
  { id: "stat-pending", type: "stat-pending", title: "In Attesa" },
  { id: "stat-in-progress", type: "stat-in-progress", title: "In Lavorazione" },
  { id: "stat-completed", type: "stat-completed", title: "Completate Oggi" },
  { id: "stat-low-stock", type: "stat-low-stock", title: "Scorte Basse" },
  { id: "stat-forfeitures", type: "stat-forfeitures", title: "In Scadenza" },
  { id: "stat-customers", type: "stat-customers", title: "Clienti" },
  { id: "stat-revenue", type: "stat-revenue", title: "Fatturato" },
  { id: "stat-active", type: "stat-active", title: "Attive" },
  { id: "chart-weekly", type: "chart-weekly", title: "Andamento Settimanale" },
  { id: "recent-repairs", type: "recent-repairs", title: "Riparazioni Recenti" },
  { id: "quick-access", type: "quick-access", title: "Accesso Rapido" },
  { id: "alerts", type: "alerts", title: "Avvisi" },
];

const getDefaultLayouts = (): Layouts => ({
  lg: [
    { i: "stat-pending", x: 0, y: 0, w: 2, h: 1 },
    { i: "stat-in-progress", x: 2, y: 0, w: 2, h: 1 },
    { i: "stat-completed", x: 4, y: 0, w: 2, h: 1 },
    { i: "stat-low-stock", x: 6, y: 0, w: 2, h: 1 },
    { i: "stat-forfeitures", x: 8, y: 0, w: 2, h: 1 },
    { i: "stat-customers", x: 0, y: 1, w: 2, h: 1 },
    { i: "stat-revenue", x: 2, y: 1, w: 2, h: 1 },
    { i: "stat-active", x: 4, y: 1, w: 2, h: 1 },
    { i: "alerts", x: 6, y: 1, w: 6, h: 2 },
    { i: "chart-weekly", x: 0, y: 2, w: 6, h: 3 },
    { i: "recent-repairs", x: 0, y: 5, w: 6, h: 3 },
    { i: "quick-access", x: 6, y: 3, w: 6, h: 3 },
  ],
  md: [
    { i: "stat-pending", x: 0, y: 0, w: 2, h: 1 },
    { i: "stat-in-progress", x: 2, y: 0, w: 2, h: 1 },
    { i: "stat-completed", x: 4, y: 0, w: 2, h: 1 },
    { i: "stat-low-stock", x: 6, y: 0, w: 2, h: 1 },
    { i: "stat-forfeitures", x: 8, y: 0, w: 2, h: 1 },
    { i: "stat-customers", x: 0, y: 1, w: 2, h: 1 },
    { i: "stat-revenue", x: 2, y: 1, w: 2, h: 1 },
    { i: "stat-active", x: 4, y: 1, w: 2, h: 1 },
    { i: "alerts", x: 0, y: 2, w: 10, h: 2 },
    { i: "chart-weekly", x: 0, y: 4, w: 10, h: 3 },
    { i: "recent-repairs", x: 0, y: 7, w: 5, h: 3 },
    { i: "quick-access", x: 5, y: 7, w: 5, h: 3 },
  ],
  sm: [
    { i: "stat-pending", x: 0, y: 0, w: 2, h: 1 },
    { i: "stat-in-progress", x: 2, y: 0, w: 2, h: 1 },
    { i: "stat-completed", x: 4, y: 0, w: 2, h: 1 },
    { i: "stat-low-stock", x: 0, y: 1, w: 2, h: 1 },
    { i: "stat-forfeitures", x: 2, y: 1, w: 2, h: 1 },
    { i: "stat-customers", x: 4, y: 1, w: 2, h: 1 },
    { i: "stat-revenue", x: 0, y: 2, w: 3, h: 1 },
    { i: "stat-active", x: 3, y: 2, w: 3, h: 1 },
    { i: "alerts", x: 0, y: 3, w: 6, h: 2 },
    { i: "chart-weekly", x: 0, y: 5, w: 6, h: 3 },
    { i: "recent-repairs", x: 0, y: 8, w: 6, h: 3 },
    { i: "quick-access", x: 0, y: 11, w: 6, h: 3 },
  ],
  xs: [
    { i: "stat-pending", x: 0, y: 0, w: 2, h: 1 },
    { i: "stat-in-progress", x: 2, y: 0, w: 2, h: 1 },
    { i: "stat-completed", x: 0, y: 1, w: 2, h: 1 },
    { i: "stat-low-stock", x: 2, y: 1, w: 2, h: 1 },
    { i: "stat-forfeitures", x: 0, y: 2, w: 2, h: 1 },
    { i: "stat-customers", x: 2, y: 2, w: 2, h: 1 },
    { i: "stat-revenue", x: 0, y: 3, w: 2, h: 1 },
    { i: "stat-active", x: 2, y: 3, w: 2, h: 1 },
    { i: "alerts", x: 0, y: 4, w: 4, h: 2 },
    { i: "chart-weekly", x: 0, y: 6, w: 4, h: 3 },
    { i: "recent-repairs", x: 0, y: 9, w: 4, h: 3 },
    { i: "quick-access", x: 0, y: 12, w: 4, h: 3 },
  ],
});

interface SavedLayout {
  widgets: DashboardWidget[];
  layouts: Layouts;
}

export const useDashboardLayout = () => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [layouts, setLayouts] = useState<Layouts>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved layout from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedLayout = JSON.parse(saved);
        setWidgets(parsed.widgets);
        setLayouts(parsed.layouts);
      } else {
        setWidgets(getDefaultWidgets());
        setLayouts(getDefaultLayouts());
      }
    } catch (error) {
      console.error("Error loading dashboard layout:", error);
      setWidgets(getDefaultWidgets());
      setLayouts(getDefaultLayouts());
    }
    setIsLoaded(true);
  }, []);

  // Save layout to localStorage whenever it changes
  const saveLayout = useCallback((newWidgets: DashboardWidget[], newLayouts: Layouts) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        widgets: newWidgets,
        layouts: newLayouts,
      }));
    } catch (error) {
      console.error("Error saving dashboard layout:", error);
    }
  }, []);

  const handleLayoutChange = useCallback((currentLayout: Layout[], allLayouts: Layouts) => {
    setLayouts(allLayouts);
    saveLayout(widgets, allLayouts);
  }, [widgets, saveLayout]);

  const addWidget = useCallback((type: WidgetType) => {
    const config = widgetRegistry[type];
    if (!config) return;

    const id = `${type}-${Date.now()}`;
    const newWidget: DashboardWidget = {
      id,
      type,
      title: config.title,
    };

    const newWidgets = [...widgets, newWidget];
    
    // Add to all breakpoints
    const newLayouts = { ...layouts };
    const breakpointCols: Record<string, number> = { lg: 12, md: 10, sm: 6, xs: 4 };
    
    Object.keys(newLayouts).forEach((breakpoint) => {
      const cols = breakpointCols[breakpoint] || 12;
      const w = Math.min(config.defaultSize.w, cols);
      
      newLayouts[breakpoint] = [
        ...newLayouts[breakpoint],
        {
          i: id,
          x: 0,
          y: Infinity, // Will be placed at the bottom
          w,
          h: config.defaultSize.h,
          minW: config.minSize?.w,
          minH: config.minSize?.h,
        },
      ];
    });

    setWidgets(newWidgets);
    setLayouts(newLayouts);
    saveLayout(newWidgets, newLayouts);
  }, [widgets, layouts, saveLayout]);

  const removeWidget = useCallback((id: string) => {
    const newWidgets = widgets.filter((w) => w.id !== id);
    const newLayouts: Layouts = {};
    
    Object.keys(layouts).forEach((breakpoint) => {
      newLayouts[breakpoint] = layouts[breakpoint].filter((l) => l.i !== id);
    });

    setWidgets(newWidgets);
    setLayouts(newLayouts);
    saveLayout(newWidgets, newLayouts);
  }, [widgets, layouts, saveLayout]);

  const resetLayout = useCallback(() => {
    const defaultWidgets = getDefaultWidgets();
    const defaultLayouts = getDefaultLayouts();
    setWidgets(defaultWidgets);
    setLayouts(defaultLayouts);
    saveLayout(defaultWidgets, defaultLayouts);
  }, [saveLayout]);

  return {
    widgets,
    layouts,
    isLoaded,
    handleLayoutChange,
    addWidget,
    removeWidget,
    resetLayout,
  };
};
