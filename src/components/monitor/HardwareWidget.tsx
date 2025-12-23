import { Cpu, HardDrive, CircuitBoard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface HardwareWidgetProps {
  cpuCores: number | null;
  deviceMemoryGb: number | null;
  hardwareConcurrency: number | null;
  maxTouchPoints: number | null;
}

export const HardwareWidget = ({ 
  cpuCores, 
  deviceMemoryGb, 
  hardwareConcurrency,
  maxTouchPoints
}: HardwareWidgetProps) => {
  
  const getPerformanceLevel = (): { label: string; color: string; percentage: number } => {
    let score = 0;
    let maxScore = 0;
    
    if (cpuCores !== null) {
      maxScore += 100;
      if (cpuCores >= 8) score += 100;
      else if (cpuCores >= 6) score += 80;
      else if (cpuCores >= 4) score += 60;
      else if (cpuCores >= 2) score += 40;
      else score += 20;
    }
    
    if (deviceMemoryGb !== null) {
      maxScore += 100;
      if (deviceMemoryGb >= 8) score += 100;
      else if (deviceMemoryGb >= 6) score += 80;
      else if (deviceMemoryGb >= 4) score += 60;
      else if (deviceMemoryGb >= 2) score += 40;
      else score += 20;
    }
    
    if (maxScore === 0) return { label: 'N/D', color: 'text-muted-foreground', percentage: 0 };
    
    const percentage = Math.round((score / maxScore) * 100);
    
    if (percentage >= 80) return { label: 'Alto', color: 'text-green-500', percentage };
    if (percentage >= 60) return { label: 'Medio', color: 'text-amber-500', percentage };
    if (percentage >= 40) return { label: 'Base', color: 'text-orange-500', percentage };
    return { label: 'Basso', color: 'text-red-500', percentage };
  };
  
  const performance = getPerformanceLevel();
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CircuitBoard className="h-4 w-4 text-primary" />
          Hardware
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Prestazioni</span>
          <span className={`font-medium ${performance.color}`}>{performance.label}</span>
        </div>
        
        <Progress value={performance.percentage} className="h-2" />
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          {cpuCores !== null && (
            <div className="bg-muted/50 rounded-lg p-2 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground text-xs">Core CPU</div>
                <div className="font-medium">{cpuCores}</div>
              </div>
            </div>
          )}
          {deviceMemoryGb !== null && (
            <div className="bg-muted/50 rounded-lg p-2 flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground text-xs">RAM</div>
                <div className="font-medium">{deviceMemoryGb} GB</div>
              </div>
            </div>
          )}
          {hardwareConcurrency !== null && (
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-muted-foreground text-xs">Thread</div>
              <div className="font-medium">{hardwareConcurrency}</div>
            </div>
          )}
          {maxTouchPoints !== null && maxTouchPoints > 0 && (
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-muted-foreground text-xs">Punti Touch</div>
              <div className="font-medium">{maxTouchPoints}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};