import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Clock, Copy } from "lucide-react";
import { toast } from "sonner";

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export interface OpeningHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

const dayNames: Record<keyof OpeningHours, string> = {
  monday: "Lunedì",
  tuesday: "Martedì",
  wednesday: "Mercoledì",
  thursday: "Giovedì",
  friday: "Venerdì",
  saturday: "Sabato",
  sunday: "Domenica",
};

const defaultHours: DayHours = {
  open: "09:00",
  close: "18:00",
  closed: false,
};

const defaultClosedHours: DayHours = {
  open: "09:00",
  close: "18:00",
  closed: true,
};

export const defaultOpeningHours: OpeningHours = {
  monday: { ...defaultHours },
  tuesday: { ...defaultHours },
  wednesday: { ...defaultHours },
  thursday: { ...defaultHours },
  friday: { ...defaultHours },
  saturday: { open: "09:00", close: "13:00", closed: false },
  sunday: { ...defaultClosedHours },
};

interface OpeningHoursEditorProps {
  value: OpeningHours | null;
  onChange: (hours: OpeningHours) => void;
}

export function OpeningHoursEditor({ value, onChange }: OpeningHoursEditorProps) {
  const hours = value || defaultOpeningHours;

  const updateDay = (day: keyof OpeningHours, field: keyof DayHours, fieldValue: string | boolean) => {
    const newHours = {
      ...hours,
      [day]: {
        ...hours[day],
        [field]: fieldValue,
      },
    };
    onChange(newHours);
  };

  const copyToWeekdays = (sourceDay: keyof OpeningHours) => {
    const weekdays: (keyof OpeningHours)[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const newHours = { ...hours };
    weekdays.forEach((day) => {
      newHours[day] = { ...hours[sourceDay] };
    });
    onChange(newHours);
    toast.success("Orari copiati ai giorni feriali");
  };

  const copyToAll = (sourceDay: keyof OpeningHours) => {
    const allDays: (keyof OpeningHours)[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const newHours = { ...hours };
    allDays.forEach((day) => {
      newHours[day] = { ...hours[sourceDay] };
    });
    onChange(newHours);
    toast.success("Orari copiati a tutti i giorni");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Orari di Apertura
        </CardTitle>
        <CardDescription>
          Imposta gli orari di apertura visibili ai clienti sulla mappa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(Object.keys(dayNames) as (keyof OpeningHours)[]).map((day, index) => (
          <div key={day} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
            <div className="w-24 flex-shrink-0">
              <Label className="font-medium">{dayNames[day]}</Label>
            </div>
            
            <div className="flex items-center gap-2 flex-1">
              <Switch
                checked={!hours[day].closed}
                onCheckedChange={(checked) => updateDay(day, "closed", !checked)}
              />
              <span className="text-sm text-muted-foreground w-16">
                {hours[day].closed ? "Chiuso" : "Aperto"}
              </span>
            </div>

            {!hours[day].closed && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={hours[day].open}
                  onChange={(e) => updateDay(day, "open", e.target.value)}
                  className="w-28"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="time"
                  value={hours[day].close}
                  onChange={(e) => updateDay(day, "close", e.target.value)}
                  className="w-28"
                />
              </div>
            )}

            {index === 0 && (
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToWeekdays(day)}
                  className="text-xs h-7 px-2"
                  title="Copia a Lun-Ven"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Lun-Ven
                </Button>
              </div>
            )}
          </div>
        ))}

        <p className="text-xs text-muted-foreground pt-2">
          Questi orari saranno visibili ai clienti sulla mappa e nella pagina di prenotazione.
        </p>
      </CardContent>
    </Card>
  );
}

// Utility function to format opening hours for display
export function formatOpeningHoursForDisplay(hours: OpeningHours | null): string {
  if (!hours) return "Orari non disponibili";
  
  const lines: string[] = [];
  const dayOrder: (keyof OpeningHours)[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  
  dayOrder.forEach((day) => {
    const dayData = hours[day];
    const shortName = dayNames[day].substring(0, 3);
    if (dayData.closed) {
      lines.push(`${shortName}: Chiuso`);
    } else {
      lines.push(`${shortName}: ${dayData.open}-${dayData.close}`);
    }
  });
  
  return lines.join(" | ");
}

// Compact HTML for map popups
export function formatOpeningHoursForPopup(hours: OpeningHours | null): string {
  if (!hours) return "";
  
  const dayOrder: (keyof OpeningHours)[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const shortNames = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  
  const lines = dayOrder.map((day, i) => {
    const dayData = hours[day];
    if (dayData.closed) {
      return `<span style="color: #9ca3af;">${shortNames[i]}: Chiuso</span>`;
    }
    return `<span>${shortNames[i]}: ${dayData.open}-${dayData.close}</span>`;
  });
  
  return `<div style="font-size: 11px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
    <strong style="display: block; margin-bottom: 4px;">🕐 Orari:</strong>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px;">
      ${lines.join("")}
    </div>
  </div>`;
}

// Get today's opening hours
export function getTodayHours(hours: OpeningHours | null): { open: string; close: string; closed: boolean } | null {
  if (!hours) return null;
  
  const dayOfWeek = new Date().getDay();
  const dayMap: Record<number, keyof OpeningHours> = {
    0: "sunday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
  };
  
  const today = dayMap[dayOfWeek];
  return hours[today] || null;
}
