import { useState } from "react";
import { Bell, Check, Trash2, Wrench, Package, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTechnicianNotifications, TechNotification } from "@/hooks/useTechnicianNotifications";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

const notificationIcons: Record<TechNotification["type"], typeof Wrench> = {
  new_repair: Wrench,
  new_order: Package,
  order_received: Package,
  appointment: Calendar,
};

const notificationColors: Record<TechNotification["type"], { bg: string; text: string }> = {
  new_repair: { bg: "bg-blue-500/20", text: "text-blue-600" },
  new_order: { bg: "bg-orange-500/20", text: "text-orange-600" },
  order_received: { bg: "bg-emerald-500/20", text: "text-emerald-600" },
  appointment: { bg: "bg-violet-500/20", text: "text-violet-600" },
};

export function TechnicianNotificationCenter() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, clearAll } = useTechnicianNotifications();
  const [open, setOpen] = useState(false);

  const handleNotificationClick = (notification: TechNotification) => {
    markAsRead(notification.id);
    if (notification.linkTo) {
      navigate(notification.linkTo);
      setOpen(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Badge
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-primary text-primary-foreground text-xs"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifiche
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount} nuove</Badge>
              )}
            </SheetTitle>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Pulisci
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Nessuna notifica</p>
              <p className="text-xs text-muted-foreground mt-1">
                Le notifiche appariranno qui
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {notifications.map((notification, index) => {
                  const Icon = notificationIcons[notification.type];
                  const colors = notificationColors[notification.type];

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-3 rounded-xl cursor-pointer transition-all hover:bg-muted/50 group ${
                        !notification.read ? "bg-primary/5 border border-primary/20" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-10 w-10 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}
                        >
                          <Icon className={`h-5 w-5 ${colors.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground text-sm truncate">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {formatDistanceToNow(notification.timestamp, {
                              addSuffix: true,
                              locale: it,
                            })}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
