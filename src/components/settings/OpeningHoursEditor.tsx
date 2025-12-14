import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Clock, Copy } from "lucide-react";
import { toast } from "sonner";

export interface DayHours {
  open_am: string;
  close_am: string;
  open_pm: string;
  close_pm: string;
  closed: boolean;
  morning_closed?: boolean;
  afternoon_closed?: boolean;
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
  open_am: "09:00",
  close_am: "13:00",
  open_pm: "15:00",
  close_pm: "19:00",
  closed: false,
  morning_closed: false,
  afternoon_closed: false,
};

const saturdayHours: DayHours = {
  open_am: "09:00",
  close_am: "13:00",
  open_pm: "15:00",
  close_pm: "19:00",
  closed: false,
  morning_closed: false,
  afternoon_closed: true,
};

const closedHours: DayHours = {
  open_am: "09:00",
  close_am: "13:00",
  open_pm: "15:00",
  close_pm: "19:00",
  closed: true,
  morning_closed: false,
  afternoon_closed: false,
};

export const defaultOpeningHours: OpeningHours = {
  monday: { ...defaultHours },
  tuesday: { ...defaultHours },
  wednesday: { ...defaultHours },
  thursday: { ...defaultHours },
  friday: { ...defaultHours },
  saturday: { ...saturdayHours },
  sunday: { ...closedHours },
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Orari di Apertura
        </CardTitle>
        <CardDescription>
          Imposta gli orari di apertura (mattina e pomeriggio) visibili ai clienti
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(Object.keys(dayNames) as (keyof OpeningHours)[]).map((day, index) => (
          <div key={day} className="space-y-2 py-3 border-b border-border/50 last:border-0">
            <div className="flex items-center justify-between">
              <Label className="font-medium text-base">{dayNames[day]}</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={!hours[day].closed}
                  onCheckedChange={(checked) => updateDay(day, "closed", !checked)}
                />
                <span className="text-sm text-muted-foreground w-16">
                  {hours[day].closed ? "Chiuso" : "Aperto"}
                </span>
                {index === 0 && (
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
                )}
              </div>
            </div>

            {!hours[day].closed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-2">
                {/* Mattina */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Mattina</Label>
                    <Switch
                      checked={!hours[day].morning_closed}
                      onCheckedChange={(checked) => updateDay(day, "morning_closed", !checked)}
                      className="scale-75"
                    />
                    {hours[day].morning_closed && (
                      <span className="text-xs text-muted-foreground">(chiuso)</span>
                    )}
                  </div>
                  {!hours[day].morning_closed && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={hours[day].open_am}
                        onChange={(e) => updateDay(day, "open_am", e.target.value)}
                        className="w-24 h-8 text-sm"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="time"
                        value={hours[day].close_am}
                        onChange={(e) => updateDay(day, "close_am", e.target.value)}
                        className="w-24 h-8 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Pomeriggio */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Pomeriggio</Label>
                    <Switch
                      checked={!hours[day].afternoon_closed}
                      onCheckedChange={(checked) => updateDay(day, "afternoon_closed", !checked)}
                      className="scale-75"
                    />
                    {hours[day].afternoon_closed && (
                      <span className="text-xs text-muted-foreground">(chiuso)</span>
                    )}
                  </div>
                  {!hours[day].afternoon_closed && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={hours[day].open_pm}
                        onChange={(e) => updateDay(day, "open_pm", e.target.value)}
                        className="w-24 h-8 text-sm"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="time"
                        value={hours[day].close_pm}
                        onChange={(e) => updateDay(day, "close_pm", e.target.value)}
                        className="w-24 h-8 text-sm"
                      />
                    </div>
                  )}
                </div>
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
    } else if (dayData.morning_closed && dayData.afternoon_closed) {
      lines.push(`${shortName}: Chiuso`);
    } else if (dayData.morning_closed) {
      lines.push(`${shortName}: ${dayData.open_pm}-${dayData.close_pm}`);
    } else if (dayData.afternoon_closed) {
      lines.push(`${shortName}: ${dayData.open_am}-${dayData.close_am}`);
    } else {
      lines.push(`${shortName}: ${dayData.open_am}-${dayData.close_am} / ${dayData.open_pm}-${dayData.close_pm}`);
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
    if (dayData.closed || (dayData.morning_closed && dayData.afternoon_closed)) {
      return `<span style="color: #9ca3af;">${shortNames[i]}: Chiuso</span>`;
    }
    if (dayData.morning_closed) {
      return `<span>${shortNames[i]}: ${dayData.open_pm}-${dayData.close_pm}</span>`;
    }
    if (dayData.afternoon_closed) {
      return `<span>${shortNames[i]}: ${dayData.open_am}-${dayData.close_am}</span>`;
    }
    return `<span>${shortNames[i]}: ${dayData.open_am}-${dayData.close_am} / ${dayData.open_pm}-${dayData.close_pm}</span>`;
  });
  
  return `<div style="font-size: 11px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
    <strong style="display: block; margin-bottom: 4px;">🕐 Orari:</strong>
    <div style="display: grid; grid-template-columns: 1fr; gap: 2px;">
      ${lines.join("")}
    </div>
  </div>`;
}

// Get today's opening hours
export function getTodayHours(hours: OpeningHours | null): { open_am: string; close_am: string; open_pm: string; close_pm: string; closed: boolean; morning_closed?: boolean; afternoon_closed?: boolean } | null {
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

// Format today's hours for display
export function formatTodayHours(hours: OpeningHours | null): string {
  const today = getTodayHours(hours);
  if (!today) return "Orari non disponibili";
  if (today.closed || (today.morning_closed && today.afternoon_closed)) return "Chiuso oggi";
  if (today.morning_closed) return `${today.open_pm}-${today.close_pm}`;
  if (today.afternoon_closed) return `${today.open_am}-${today.close_am}`;
  return `${today.open_am}-${today.close_am} / ${today.open_pm}-${today.close_pm}`;
}
