// @ts-ignore - react-grid-layout types are not fully compatible
import GridLayout from "react-grid-layout";
// @ts-ignore
const { Responsive, WidthProvider } = GridLayout;
import { DashboardWidget, Layouts, Layout } from "./types";
import { widgetRegistry } from "./WidgetRegistry";
import { StatWidget } from "./widgets/StatWidget";
import { ChartWidget } from "./widgets/ChartWidget";
import { RecentRepairsWidget } from "./widgets/RecentRepairsWidget";
import { QuickAccessWidget } from "./widgets/QuickAccessWidget";
import { AlertsWidget } from "./widgets/AlertsWidget";
import { WidgetWrapper } from "./WidgetWrapper";
import { useDashboardContext } from "./DashboardContext";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface WidgetGridProps {
  widgets: DashboardWidget[];
  layouts: Layouts;
  onLayoutChange: (currentLayout: Layout[], allLayouts: Layouts) => void;
  onRemoveWidget: (id: string) => void;
}

export const WidgetGrid = ({
  widgets,
  layouts,
  onLayoutChange,
  onRemoveWidget,
}: WidgetGridProps) => {
  const { isEditMode } = useDashboardContext();

  const renderWidget = (widget: DashboardWidget) => {
    const isStatWidget = widget.type.startsWith('stat-');
    
    if (isStatWidget) {
      return (
        <WidgetWrapper
          id={widget.id}
          title={widgetRegistry[widget.type]?.title || widget.title}
          onRemove={onRemoveWidget}
        >
          <StatWidget type={widget.type} />
        </WidgetWrapper>
      );
    }

    switch (widget.type) {
      case 'chart-weekly':
        return <ChartWidget id={widget.id} onRemove={onRemoveWidget} />;
      case 'recent-repairs':
        return <RecentRepairsWidget id={widget.id} onRemove={onRemoveWidget} />;
      case 'quick-access':
        return <QuickAccessWidget id={widget.id} onRemove={onRemoveWidget} />;
      case 'alerts':
        return <AlertsWidget id={widget.id} onRemove={onRemoveWidget} />;
      default:
        return null;
    }
  };

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
      rowHeight={80}
      onLayoutChange={onLayoutChange}
      isDraggable={isEditMode}
      isResizable={isEditMode}
      draggableHandle=".drag-handle"
      margin={[12, 12]}
      containerPadding={[0, 0]}
      useCSSTransforms={true}
    >
      {widgets.map((widget) => (
        <div key={widget.id}>
          {renderWidget(widget)}
        </div>
      ))}
    </ResponsiveGridLayout>
  );
};
