import { useState, useMemo } from "react";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isToday,
  parseISO
} from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  User,
  Smartphone,
  LayoutGrid,
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Appointment {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  issue_description: string;
  preferred_date: string;
  preferred_time: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface AppointmentCalendarProps {
  appointments: Appointment[];
  onSelectAppointment?: (appointment: Appointment) => void;
}

type ViewMode = "week" | "month";

export function AppointmentCalendar({ appointments, onSelectAppointment }: AppointmentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");

  const days = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const monthDays = eachDayOfInterval({ start, end });
      
      // Add days from previous month to fill the first week
      const firstDayOfMonth = startOfMonth(currentDate);
      const startOfFirstWeek = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 });
      const prefixDays = eachDayOfInterval({ start: startOfFirstWeek, end: firstDayOfMonth }).slice(0, -1);
      
      // Add days from next month to fill the last week
      const lastDayOfMonth = endOfMonth(currentDate);
      const endOfLastWeek = endOfWeek(lastDayOfMonth, { weekStartsOn: 1 });
      const suffixDays = eachDayOfInterval({ start: lastDayOfMonth, end: endOfLastWeek }).slice(1);
      
      return [...prefixDays, ...monthDays, ...suffixDays];
    }
  }, [currentDate, viewMode]);

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(apt => 
      isSameDay(parseISO(apt.preferred_date), day)
    );
  };

  const navigatePrevious = () => {
    if (viewMode === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "confirmed":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      case "completed":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "In Attesa";
      case "confirmed": return "Confermata";
      case "cancelled": return "Annullata";
      case "completed": return "Completata";
      default: return status;
    }
  };

  const headerTitle = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, "d MMM", { locale: it })} - ${format(end, "d MMM yyyy", { locale: it })}`;
    }
    return format(currentDate, "MMMM yyyy", { locale: it });
  }, [currentDate, viewMode]);

  return (
    <Card className="overflow-hidden">
      {/* Calendar Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg capitalize">{headerTitle}</h3>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* View Toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("week")}
                className="rounded-none"
              >
                <List className="h-4 w-4 mr-1" />
                Settimana
              </Button>
              <Button
                variant={viewMode === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("month")}
                className="rounded-none"
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Mese
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={navigatePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Oggi
              </Button>
              <Button variant="outline" size="icon" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <CardContent className="p-0">
        {/* Day Headers */}
        <div className={cn(
          "grid border-b bg-muted/20",
          viewMode === "week" ? "grid-cols-7" : "grid-cols-7"
        )}>
          {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${viewMode}-${currentDate.toISOString()}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "grid",
              viewMode === "week" ? "grid-cols-7" : "grid-cols-7"
            )}
          >
            {days.map((day, index) => {
              const dayAppointments = getAppointmentsForDay(day);
              const isCurrentMonth = viewMode === "month" ? isSameMonth(day, currentDate) : true;
              
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-r border-b last:border-r-0 min-h-[100px] p-1 transition-colors",
                    viewMode === "month" && "min-h-[80px]",
                    !isCurrentMonth && "bg-muted/30",
                    isToday(day) && "bg-primary/5"
                  )}
                >
                  {/* Day Number */}
                  <div className={cn(
                    "text-sm font-medium mb-1 flex items-center justify-center w-7 h-7 rounded-full",
                    isToday(day) && "bg-primary text-primary-foreground",
                    !isCurrentMonth && "text-muted-foreground"
                  )}>
                    {format(day, "d")}
                  </div>

                  {/* Appointments */}
                  <div className="space-y-1">
                    <TooltipProvider>
                      {dayAppointments.slice(0, viewMode === "month" ? 2 : 4).map((apt) => (
                        <Tooltip key={apt.id}>
                          <TooltipTrigger asChild>
                            <motion.div
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className={cn(
                                "text-xs p-1 rounded cursor-pointer truncate flex items-center gap-1",
                                "hover:ring-2 hover:ring-primary/50 transition-all",
                                getStatusColor(apt.status),
                                "text-white"
                              )}
                              onClick={() => onSelectAppointment?.(apt)}
                            >
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{apt.preferred_time}</span>
                            </motion.div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[250px]">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span className="font-medium">{apt.customer_name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Smartphone className="h-3 w-3" />
                                <span>{apt.device_type} {apt.device_brand && `- ${apt.device_brand}`}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-3 w-3" />
                                <span>{apt.preferred_time}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {getStatusLabel(apt.status)}
                              </Badge>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {apt.issue_description}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </TooltipProvider>

                    {/* Show more indicator */}
                    {dayAppointments.length > (viewMode === "month" ? 2 : 4) && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayAppointments.length - (viewMode === "month" ? 2 : 4)} altri
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        <div className="p-3 border-t bg-muted/20 flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>In Attesa</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Confermata</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>Completata</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>Annullata</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
