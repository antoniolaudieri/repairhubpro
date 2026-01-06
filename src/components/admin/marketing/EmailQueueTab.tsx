import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Mail, Clock, CheckCircle, XCircle, RefreshCw, 
  Loader2, Trash2, Eye, Send 
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

type QueuedEmail = {
  id: string;
  lead_id: string;
  template_id: string;
  sequence_id: string | null;
  step_number: number | null;
  scheduled_for: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  lead?: {
    business_name: string;
    email: string;
  };
  template?: {
    name: string;
    subject: string;
  };
};

export function EmailQueueTab() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");

  // Fetch queued emails
  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["marketing-email-queue", activeTab],
    queryFn: async () => {
      let query = supabase
        .from("marketing_email_queue")
        .select(`
          *,
          lead:marketing_leads(business_name, email),
          template:marketing_templates(name, subject)
        `)
        .order("scheduled_for", { ascending: activeTab === "pending" });

      if (activeTab !== "all") {
        query = query.eq("status", activeTab);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as QueuedEmail[];
    },
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["marketing-email-queue-stats-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_email_queue")
        .select("status, opened_at, clicked_at");
      if (error) throw error;
      
      return {
        pending: data.filter(e => e.status === "pending").length,
        sent: data.filter(e => e.status === "sent").length,
        failed: data.filter(e => e.status === "failed").length,
        cancelled: data.filter(e => e.status === "cancelled").length,
        opened: data.filter(e => e.opened_at).length,
        clicked: data.filter(e => e.clicked_at).length,
        total: data.length,
      };
    },
  });

  // Cancel email mutation
  const cancelEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_email_queue")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-email-queue"] });
      toast.success("Email annullata");
    },
  });

  // Retry email mutation
  const retryEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_email_queue")
        .update({ 
          status: "pending", 
          error_message: null,
          scheduled_for: new Date().toISOString()
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-email-queue"] });
      toast.success("Email riprogrammata");
    },
  });

  // Delete email mutation
  const deleteEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_email_queue")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-email-queue"] });
      toast.success("Email eliminata");
    },
  });

  const getStatusBadge = (email: QueuedEmail) => {
    switch (email.status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />In attesa</Badge>;
      case "sent":
        if (email.clicked_at) {
          return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Cliccata</Badge>;
        }
        if (email.opened_at) {
          return <Badge className="bg-blue-600"><Eye className="h-3 w-3 mr-1" />Aperta</Badge>;
        }
        return <Badge><Send className="h-3 w-3 mr-1" />Inviata</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Fallita</Badge>;
      case "cancelled":
        return <Badge variant="outline">Annullata</Badge>;
      default:
        return <Badge variant="outline">{email.status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Coda Email</h2>
        <p className="text-sm text-muted-foreground">
          Monitora e gestisci le email automatiche in coda
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.pending || 0}</div>
            <p className="text-sm text-muted-foreground">In attesa</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats?.sent || 0}</div>
            <p className="text-sm text-muted-foreground">Inviate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats?.opened || 0}</div>
            <p className="text-sm text-muted-foreground">Aperte</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">{stats?.clicked || 0}</div>
            <p className="text-sm text-muted-foreground">Cliccate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{stats?.failed || 0}</div>
            <p className="text-sm text-muted-foreground">Fallite</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {stats?.sent && stats.sent > 0 
                ? ((stats.opened / stats.sent) * 100).toFixed(0)
                : 0}%
            </div>
            <p className="text-sm text-muted-foreground">Open Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Email Queue Table */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">
                In Attesa ({stats?.pending || 0})
              </TabsTrigger>
              <TabsTrigger value="sent">
                Inviate ({stats?.sent || 0})
              </TabsTrigger>
              <TabsTrigger value="failed">
                Fallite ({stats?.failed || 0})
              </TabsTrigger>
              <TabsTrigger value="all">
                Tutte ({stats?.total || 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destinatario</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Programmata</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Inviata</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : emails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nessuna email in questa sezione
                  </TableCell>
                </TableRow>
              ) : (
                emails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{email.lead?.business_name || "N/A"}</p>
                        <p className="text-sm text-muted-foreground">{email.lead?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{email.template?.name || "N/A"}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {email.template?.subject}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(email.scheduled_for), "dd/MM/yyyy HH:mm", { locale: it })}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(email.scheduled_for), { 
                          addSuffix: true, 
                          locale: it 
                        })}
                      </p>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(email)}
                      {email.error_message && (
                        <p className="text-xs text-destructive mt-1 line-clamp-1">
                          {email.error_message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {email.sent_at 
                        ? format(new Date(email.sent_at), "dd/MM HH:mm", { locale: it })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {email.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => cancelEmailMutation.mutate(email.id)}
                            title="Annulla"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {email.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => retryEmailMutation.mutate(email.id)}
                            title="Riprova"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteEmailMutation.mutate(email.id)}
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
