import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  MapPin, 
  Phone, 
  Mail, 
  ExternalLink,
  MessageCircle,
  Star,
  Check,
  X,
  Loader2,
  Globe,
  StickyNote,
  Save,
  Edit3
} from "lucide-react";
import { toast } from "sonner";

interface SavedShop {
  id: string;
  external_id: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  latitude: number;
  longitude: number;
  contact_status: string;
  last_contacted_at: string | null;
  notes: string | null;
  created_at: string;
}

interface SavedShopsListProps {
  centroId: string;
  savedShops: Map<string, { id: string; contactStatus: string }>;
  onRemove: (externalId: string) => void;
  onStatusUpdate: (externalId: string, status: string) => void;
}

export function SavedShopsList({ centroId, savedShops, onRemove, onStatusUpdate }: SavedShopsListProps) {
  const [shops, setShops] = useState<SavedShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSavedShops();
  }, [centroId, savedShops.size]);

  const loadSavedShops = async () => {
    try {
      const { data, error } = await supabase
        .from("saved_external_shops")
        .select("*")
        .eq("centro_id", centroId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setShops(data || []);
    } catch (error) {
      console.error("Error loading saved shops:", error);
      toast.error("Errore nel caricamento dei negozi salvati");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (shop: SavedShop) => {
    setActionLoading(shop.id);
    try {
      const { error } = await supabase
        .from("saved_external_shops")
        .delete()
        .eq("id", shop.id);

      if (error) throw error;
      
      setShops(prev => prev.filter(s => s.id !== shop.id));
      onRemove(shop.external_id);
      toast.success("Negozio rimosso dalla lista");
    } catch (error) {
      console.error("Error removing shop:", error);
      toast.error("Errore nella rimozione");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (shop: SavedShop, status: string) => {
    setActionLoading(shop.id);
    try {
      const { error } = await supabase
        .from("saved_external_shops")
        .update({ 
          contact_status: status,
          last_contacted_at: status === 'contacted' ? new Date().toISOString() : null
        })
        .eq("id", shop.id);

      if (error) throw error;
      
      setShops(prev => prev.map(s => 
        s.id === shop.id ? { ...s, contact_status: status, last_contacted_at: status === 'contacted' ? new Date().toISOString() : null } : s
      ));
      onStatusUpdate(shop.external_id, status);
      toast.success("Stato aggiornato");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Errore nell'aggiornamento");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateNotes = async (shop: SavedShop, notes: string) => {
    try {
      const { error } = await supabase
        .from("saved_external_shops")
        .update({ notes })
        .eq("id", shop.id);

      if (error) throw error;
      
      setShops(prev => prev.map(s => 
        s.id === shop.id ? { ...s, notes } : s
      ));
      toast.success("Note salvate");
    } catch (error) {
      console.error("Error updating notes:", error);
      toast.error("Errore nel salvataggio delle note");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const pendingShops = shops.filter(s => s.contact_status === 'pending');
  const contactedShops = shops.filter(s => s.contact_status === 'contacted');

  return (
    <div className="space-y-6">
      {/* Pending */}
      {pendingShops.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            Da contattare ({pendingShops.length})
          </h3>
          <div className="grid gap-3">
            {pendingShops.map(shop => (
              <ShopCard 
                key={shop.id} 
                shop={shop} 
                actionLoading={actionLoading}
                onRemove={handleRemove}
                onUpdateStatus={handleUpdateStatus}
                onUpdateNotes={handleUpdateNotes}
              />
            ))}
          </div>
        </div>
      )}

      {/* Contacted */}
      {contactedShops.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            Contattati ({contactedShops.length})
          </h3>
          <div className="grid gap-3">
            {contactedShops.map(shop => (
              <ShopCard 
                key={shop.id} 
                shop={shop} 
                actionLoading={actionLoading}
                onRemove={handleRemove}
                onUpdateStatus={handleUpdateStatus}
                onUpdateNotes={handleUpdateNotes}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ShopCard({ 
  shop, 
  actionLoading, 
  onRemove, 
  onUpdateStatus,
  onUpdateNotes
}: { 
  shop: SavedShop; 
  actionLoading: string | null;
  onRemove: (shop: SavedShop) => void;
  onUpdateStatus: (shop: SavedShop, status: string) => void;
  onUpdateNotes: (shop: SavedShop, notes: string) => void;
}) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(shop.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const isContacted = shop.contact_status === 'contacted';

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await onUpdateNotes(shop, notes);
    setSavingNotes(false);
    setIsEditingNotes(false);
  };

  return (
    <Card className={`transition-all hover:shadow-md ${isContacted ? 'border-green-500/20 bg-green-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg ${isContacted ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
              {isContacted ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <Star className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{shop.name}</h3>
                <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-600">
                  <Globe className="h-3 w-3 mr-1" />
                  OSM
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-1 mt-1">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {shop.address}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {shop.phone && (
                    <a href={`tel:${shop.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                      <Phone className="h-3 w-3" />
                      {shop.phone}
                    </a>
                  )}
                  {shop.email && (
                    <a href={`mailto:${shop.email}`} className="flex items-center gap-1 text-primary hover:underline">
                      <Mail className="h-3 w-3" />
                      {shop.email}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {!isContacted && (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => onUpdateStatus(shop, 'contacted')}
                disabled={actionLoading === shop.id}
                className="border-green-500/50 text-green-600 hover:bg-green-500/10"
              >
                <Check className="h-4 w-4 mr-1" />
                Contattato
              </Button>
            )}
            
            {shop.phone && (
              <Button 
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                asChild
              >
                <a 
                  href={`https://wa.me/${shop.phone.replace(/[^0-9]/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  WhatsApp
                </a>
              </Button>
            )}
            
            {shop.email && (
              <Button 
                variant="outline"
                size="sm"
                asChild
              >
                <a href={`mailto:${shop.email}?subject=Proposta di Partnership RepairHubPro&body=Buongiorno,%0A%0ASiamo un Centro di Assistenza e vorremmo proporvi una collaborazione sulla piattaforma RepairHubPro.%0A%0ACordiali saluti`}>
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </a>
              </Button>
            )}
            
            <Button 
              variant="outline"
              size="sm"
              onClick={() => onRemove(shop)}
              disabled={actionLoading === shop.id}
              className="border-red-500/50 text-red-600 hover:bg-red-500/10"
            >
              {actionLoading === shop.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Notes Section */}
        <div className="mt-4 pt-3 border-t border-border/50">
          {isEditingNotes ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <StickyNote className="h-4 w-4" />
                <span>Note</span>
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Aggiungi note sulla conversazione..."
                className="min-h-[80px] text-sm"
              />
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setNotes(shop.notes || "");
                    setIsEditingNotes(false);
                  }}
                >
                  Annulla
                </Button>
                <Button 
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                >
                  {savingNotes ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Salva
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="flex items-start gap-2 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
              onClick={() => setIsEditingNotes(true)}
            >
              <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5" />
              {shop.notes ? (
                <p className="text-sm text-foreground flex-1">{shop.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic flex-1">
                  Clicca per aggiungere note...
                </p>
              )}
              <Edit3 className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}