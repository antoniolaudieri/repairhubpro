import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  AreaChart, Area, CartesianGrid,
  Legend
} from "recharts";
import { TrendingUp, Activity, PieChartIcon, BarChart3 } from "lucide-react";

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
    <div className="grid gap-4 md:gap-6">
      {/* Top Row - Status and Spending */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Status Distribution */}
        {statusData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-primary" />
                Stato Riparazioni
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-1/2 h-[140px] sm:h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={3}
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
                <div className="flex flex-wrap sm:flex-col gap-1.5 sm:gap-2 justify-center sm:w-1/2">
                  {statusData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: statusColors[item.status] || "hsl(215 16% 47%)" }}
                      />
                      <span className="text-xs sm:text-sm">
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                Andamento Spesa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[140px] sm:h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlySpending}>
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
                    />
                    <Tooltip 
                      formatter={(value: number) => [`€${value.toFixed(2)}`, "Spesa"]}
                      contentStyle={{
                        backgroundColor: "hsl(0 0% 100%)",
                        border: "1px solid hsl(214 32% 88%)",
                        borderRadius: "8px",
                        fontSize: "12px"
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

      {/* Bottom Row - Device Types and Brands */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Device Types */}
        {deviceTypeData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-info" />
                Tipi Dispositivi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-1/2 h-[120px] sm:h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceTypeData}
                        cx="50%"
                        cy="50%"
                        outerRadius={50}
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
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
                <div className="flex flex-wrap sm:flex-col gap-1.5 sm:gap-2 justify-center sm:w-1/2">
                  {deviceTypeData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: deviceColors[index % deviceColors.length] }}
                      />
                      <span className="text-xs sm:text-sm">
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-warning" />
                Top Brand
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[120px] sm:h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={brandData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      tick={{ fontSize: 11 }}
                      stroke="hsl(215 16% 47%)"
                      axisLine={false}
                      tickLine={false}
                      width={70}
                    />
                    <Tooltip 
                      formatter={(value: number) => [value, "Dispositivi"]}
                      contentStyle={{
                        backgroundColor: "hsl(0 0% 100%)",
                        border: "1px solid hsl(214 32% 88%)",
                        borderRadius: "8px",
                        fontSize: "12px"
                      }}
                    />
                    <Bar 
                      dataKey="riparazioni" 
                      fill="hsl(38 92% 50%)" 
                      radius={[0, 4, 4, 0]}
                      barSize={16}
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
