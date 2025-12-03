import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  AreaChart, Area, CartesianGrid
} from "recharts";
import { TrendingUp, Activity, PieChartIcon, BarChart3 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Repair {
  id: string;
  status: string;
  final_cost: number | null;
  created_at: string;
  completed_at: string | null;
}

interface Device {
  id: string;
  device_type: string;
  brand: string;
  model: string;
  repairs: Repair[];
}

interface CustomerChartsProps {
  devices: Device[];
  allRepairs: Repair[];
}

export function CustomerCharts({ devices, allRepairs }: CustomerChartsProps) {
  const isMobile = useIsMobile();
  
  // Status distribution
  const statusCounts = allRepairs.reduce((acc, repair) => {
    acc[repair.status] = (acc[repair.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: getStatusLabel(status),
    value: count,
    status
  }));

  const statusColors: Record<string, string> = {
    pending: "hsl(38 92% 50%)",
    "in-progress": "hsl(217 91% 60%)",
    completed: "hsl(142 76% 36%)",
    cancelled: "hsl(0 84% 60%)",
    waiting_for_parts: "hsl(280 60% 50%)",
    delivered: "hsl(199 89% 48%)"
  };

  // Device type distribution
  const deviceTypeCounts = devices.reduce((acc, device) => {
    acc[device.device_type] = (acc[device.device_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const deviceTypeData = Object.entries(deviceTypeCounts).map(([type, count]) => ({
    name: getDeviceTypeLabel(type),
    value: count
  }));

  const deviceColors = [
    "hsl(217 91% 60%)",
    "hsl(142 76% 36%)",
    "hsl(38 92% 50%)",
    "hsl(280 60% 50%)",
    "hsl(199 89% 48%)"
  ];

  // Monthly spending trend
  const monthlySpending = getMonthlySpending(allRepairs);

  // Brand distribution
  const brandCounts = devices.reduce((acc, device) => {
    acc[device.brand] = (acc[device.brand] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const brandData = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([brand, count]) => ({
      name: brand,
      riparazioni: count
    }));

  if (allRepairs.length === 0 && devices.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2 sm:gap-4">
      {/* Status and Spending - Single column on mobile */}
      <div className="grid gap-2 sm:gap-4 sm:grid-cols-2">
        {/* Status Distribution */}
        {statusData.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-1.5 px-3 sm:px-4 pt-2.5 sm:pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <PieChartIcon className="h-3.5 w-3.5 text-primary" />
                Stato Riparazioni
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
              <div className="flex items-center gap-3">
                <div className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={isMobile ? 20 : 28}
                        outerRadius={isMobile ? 35 : 42}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={statusColors[entry.status] || "hsl(215 16% 47%)"}
                            strokeWidth={0}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  {statusData.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <div 
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: statusColors[item.status] || "hsl(215 16% 47%)" }}
                      />
                      <span className="text-[10px] sm:text-xs truncate">
                        {item.name}: <strong>{item.value}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Spending Trend */}
        {monthlySpending.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-1.5 px-3 sm:px-4 pt-2.5 sm:pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-accent" />
                Andamento Spesa
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
              <div className="h-[90px] sm:h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlySpending} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSpesa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 88%)" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 10 }}
                      stroke="hsl(215 16% 47%)"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      stroke="hsl(215 16% 47%)"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `€${value}`}
                      width={35}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`€${value.toFixed(2)}`, "Spesa"]}
                      contentStyle={{
                        backgroundColor: "hsl(0 0% 100%)",
                        border: "1px solid hsl(214 32% 88%)",
                        borderRadius: "6px",
                        fontSize: "11px",
                        padding: "4px 8px"
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="spesa" 
                      stroke="hsl(142 76% 36%)" 
                      strokeWidth={2}
                      fill="url(#colorSpesa)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Device Types and Brands - Single column on mobile */}
      <div className="grid gap-2 sm:gap-4 sm:grid-cols-2">
        {/* Device Types */}
        {deviceTypeData.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-1.5 px-3 sm:px-4 pt-2.5 sm:pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-info" />
                Tipi Dispositivi
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
              <div className="flex items-center gap-3">
                <div className="w-[75px] h-[75px] sm:w-[85px] sm:h-[85px] flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceTypeData}
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 32 : 36}
                        dataKey="value"
                      >
                        {deviceTypeData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={deviceColors[index % deviceColors.length]}
                            strokeWidth={0}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  {deviceTypeData.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <div 
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: deviceColors[index % deviceColors.length] }}
                      />
                      <span className="text-[10px] sm:text-xs truncate">
                        {item.name}: <strong>{item.value}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Brands */}
        {brandData.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-1.5 px-3 sm:px-4 pt-2.5 sm:pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-warning" />
                Top Brand
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
              <div className="h-[80px] sm:h-[85px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={brandData.slice(0, 4)} layout="vertical" margin={{ top: 0, right: 5, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      tick={{ fontSize: 10 }}
                      stroke="hsl(215 16% 47%)"
                      axisLine={false}
                      tickLine={false}
                      width={55}
                    />
                    <Tooltip 
                      formatter={(value: number) => [value, "Dispositivi"]}
                      contentStyle={{
                        backgroundColor: "hsl(0 0% 100%)",
                        border: "1px solid hsl(214 32% 88%)",
                        borderRadius: "6px",
                        fontSize: "11px",
                        padding: "4px 8px"
                      }}
                    />
                    <Bar 
                      dataKey="riparazioni" 
                      fill="hsl(38 92% 50%)" 
                      radius={[0, 4, 4, 0]}
                      barSize={12}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "In Attesa",
    "in-progress": "In Corso",
    completed: "Completata",
    cancelled: "Annullata",
    waiting_for_parts: "Attesa Ricambi",
    delivered: "Consegnata"
  };
  return labels[status] || status;
}

function getDeviceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    smartphone: "Smartphone",
    tablet: "Tablet",
    laptop: "Laptop",
    desktop: "Desktop",
    console: "Console",
    smartwatch: "Smartwatch",
    other: "Altro"
  };
  return labels[type] || type;
}

function getMonthlySpending(repairs: Repair[]): Array<{ month: string; spesa: number }> {
  const monthlyData: Record<string, number> = {};
  
  repairs.forEach(repair => {
    if (repair.final_cost && repair.completed_at) {
      const date = new Date(repair.completed_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + repair.final_cost;
    }
  });

  const sortedMonths = Object.keys(monthlyData).sort();
  const last6Months = sortedMonths.slice(-6);
  
  return last6Months.map(key => {
    const [year, month] = key.split('-');
    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    return {
      month: monthNames[parseInt(month) - 1],
      spesa: monthlyData[key]
    };
  });
}
