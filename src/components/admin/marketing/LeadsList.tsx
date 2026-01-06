import { MarketingLead } from "@/pages/admin/AdminMarketing";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Building2, 
  Store, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  ChevronRight,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";

interface LeadsListProps {
  leads: MarketingLead[];
  isLoading: boolean;
  statusFilter: string;
  typeFilter: string;
  onStatusFilterChange: (status: string) => void;
  onTypeFilterChange: (type: string) => void;
  onSelectLead: (lead: MarketingLead) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  new: { label: "Nuovo", color: "bg-blue-500" },
  contacted: { label: "Contattato", color: "bg-amber-500" },
  interested: { label: "Interessato", color: "bg-green-500" },
  demo_scheduled: { label: "Demo", color: "bg-purple-500" },
  converted: { label: "Convertito", color: "bg-primary" },
  rejected: { label: "Rifiutato", color: "bg-destructive" },
};

const typeLabels: Record<string, { label: string; icon: typeof Building2 }> = {
  centro: { label: "Centro", icon: Building2 },
  corner: { label: "Corner", icon: Store },
  telefonia: { label: "Telefonia", icon: Phone },
  elettronica: { label: "Elettronica", icon: Store },
  computer: { label: "Computer", icon: Store },
  altro: { label: "Altro", icon: Store },
};

export function LeadsList({
  leads,
  isLoading,
  statusFilter,
  typeFilter,
  onStatusFilterChange,
  onTypeFilterChange,
  onSelectLead,
  onUpdateStatus,
}: LeadsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtra:</span>
        </div>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="new">Nuovi</SelectItem>
            <SelectItem value="contacted">Contattati</SelectItem>
            <SelectItem value="interested">Interessati</SelectItem>
            <SelectItem value="demo_scheduled">Demo</SelectItem>
            <SelectItem value="converted">Convertiti</SelectItem>
            <SelectItem value="rejected">Rifiutati</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={onTypeFilterChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i tipi</SelectItem>
            <SelectItem value="centro">Centri</SelectItem>
            <SelectItem value="corner">Corner</SelectItem>
            <SelectItem value="telefonia">Telefonia</SelectItem>
            <SelectItem value="elettronica">Elettronica</SelectItem>
            <SelectItem value="computer">Computer</SelectItem>
            <SelectItem value="altro">Altro</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {leads.length} lead
        </span>
      </div>

      {/* Lead cards */}
      {leads.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nessun lead trovato</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead, index) => {
            const status = statusLabels[lead.status] || statusLabels.new;
            const type = typeLabels[lead.business_type] || typeLabels.altro;
            const TypeIcon = type.icon;

            return (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card 
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onSelectLead(lead)}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="h-6 w-6 text-primary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold truncate">{lead.business_name}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {type.label}
                            </Badge>
                            <Badge className={`${status.color} text-white text-xs`}>
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>

                      {/* Details */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                        {lead.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {lead.address.substring(0, 40)}...
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </span>
                        )}
                        {lead.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </span>
                        )}
                      </div>

                      {/* Next followup */}
                      {lead.next_followup_at && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-warning">
                          <Calendar className="h-3 w-3" />
                          Follow-up: {format(new Date(lead.next_followup_at), "d MMM", { locale: it })}
                        </div>
                      )}
                    </div>

                    {/* Quick actions */}
                    <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                      {lead.status === "new" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => onUpdateStatus(lead.id, "contacted")}
                        >
                          Contattato
                        </Button>
                      )}
                      {lead.status === "contacted" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => onUpdateStatus(lead.id, "interested")}
                        >
                          Interessato
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
