import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Megaphone, Check, X, Eye, Calendar, MapPin, Euro, 
  Clock, Building2, Mail, TrendingUp, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Campaign {
  id: string;
  advertiser_name: string;
  advertiser_email: string;
  advertiser_company: string | null;
  ad_title: string;
  ad_description: string | null;
  ad_type: string;
  ad_gradient: string;
  ad_image_url: string | null;
  start_date: string;
  end_date: string;
  total_price: number;
  platform_revenue: number;
  corner_revenue_total: number;
  status: string;
  paid_at: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  corners?: { corner_id: string; corner_revenue: number; corner?: { business_name: string } }[];
}

interface PricingSettings {
  ad_price_per_corner_per_week: number;
  ad_corner_revenue_percentage: number;
}

export default function AdminPubblicita() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [pricing, setPricing] = useState<PricingSettings>({
    ad_price_per_corner_per_week: 5,
    ad_corner_revenue_percentage: 50
  });
  const [savingPricing, setSavingPricing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load campaigns with corners
      const { data: campaignsData, error } = await supabase
        .from('display_ad_campaigns')
        .select(`
          *,
          corners:display_ad_campaign_corners(
            corner_id,
            corner_revenue,
            corner:corners(business_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(campaignsData || []);

      // Load pricing settings
      const { data: settings } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['ad_price_per_corner_per_week', 'ad_corner_revenue_percentage']);

      if (settings) {
        const pricePerWeek = settings.find(s => s.key === 'ad_price_per_corner_per_week')?.value || 5;
        const cornerPercentage = settings.find(s => s.key === 'ad_corner_revenue_percentage')?.value || 50;
        setPricing({
          ad_price_per_corner_per_week: pricePerWeek,
          ad_corner_revenue_percentage: cornerPercentage
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Errore caricamento dati');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (campaign: Campaign) => {
    try {
      const { error } = await supabase
        .from('display_ad_campaigns')
        .update({
          status: 'active',
          approved_at: new Date().toISOString()
        })
        .eq('id', campaign.id);

      if (error) throw error;
      toast.success('Campagna approvata');
      loadData();
    } catch (error) {
      console.error('Error approving campaign:', error);
      toast.error('Errore approvazione');
    }
  };

  const handleReject = async () => {
    if (!selectedCampaign) return;
    
    try {
      const { error } = await supabase
        .from('display_ad_campaigns')
        .update({
          status: 'rejected',
          rejected_reason: rejectReason
        })
        .eq('id', selectedCampaign.id);

      if (error) throw error;
      toast.success('Campagna rifiutata');
      setShowRejectDialog(false);
      setRejectReason('');
      setSelectedCampaign(null);
      loadData();
    } catch (error) {
      console.error('Error rejecting campaign:', error);
      toast.error('Errore rifiuto');
    }
  };

  const handleSavePricing = async () => {
    setSavingPricing(true);
    try {
      await supabase
        .from('platform_settings')
        .update({ value: pricing.ad_price_per_corner_per_week })
        .eq('key', 'ad_price_per_corner_per_week');

      await supabase
        .from('platform_settings')
        .update({ value: pricing.ad_corner_revenue_percentage })
        .eq('key', 'ad_corner_revenue_percentage');

      toast.success('Tariffe aggiornate');
    } catch (error) {
      console.error('Error saving pricing:', error);
      toast.error('Errore salvataggio');
    } finally {
      setSavingPricing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending_payment: { variant: 'outline', label: 'Attesa Pagamento' },
      pending_approval: { variant: 'secondary', label: 'Da Approvare' },
      active: { variant: 'default', label: 'Attiva' },
      completed: { variant: 'outline', label: 'Completata' },
      rejected: { variant: 'destructive', label: 'Rifiutata' }
    };
    const { variant, label } = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const stats = {
    pending: campaigns.filter(c => c.status === 'pending_approval').length,
    active: campaigns.filter(c => c.status === 'active').length,
    totalRevenue: campaigns.filter(c => c.status === 'active' || c.status === 'completed')
      .reduce((sum, c) => sum + (c.platform_revenue || 0), 0),
    cornerPayout: campaigns.filter(c => c.status === 'active' || c.status === 'completed')
      .reduce((sum, c) => sum + (c.corner_revenue_total || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Da Approvare</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Megaphone className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Campagne Attive</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Euro className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{stats.totalRevenue.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Ricavo Piattaforma</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{stats.cornerPayout.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Payout Corner</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campagne</TabsTrigger>
          <TabsTrigger value="settings">Tariffe</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nessuna campagna pubblicitaria
              </CardContent>
            </Card>
          ) : (
            campaigns.map((campaign) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={campaign.status === 'pending_approval' ? 'border-yellow-500' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Preview */}
                      <div className="w-full md:w-48 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                        {campaign.ad_type === 'image' && campaign.ad_image_url ? (
                          <img src={campaign.ad_image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${campaign.ad_gradient} flex items-center justify-center p-2`}>
                            <p className="text-white text-xs font-medium text-center">{campaign.ad_title}</p>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-semibold">{campaign.ad_title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {campaign.advertiser_name} 
                              {campaign.advertiser_company && ` · ${campaign.advertiser_company}`}
                            </p>
                          </div>
                          {getStatusBadge(campaign.status)}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(campaign.start_date), 'dd/MM', { locale: it })} - {format(new Date(campaign.end_date), 'dd/MM', { locale: it })}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {campaign.corners?.length || 0} Corner
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Euro className="h-3.5 w-3.5" />
                            €{campaign.total_price?.toFixed(2)}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            {campaign.advertiser_email}
                          </div>
                        </div>

                        {campaign.status === 'pending_approval' && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleApprove(campaign)}>
                              <Check className="h-4 w-4 mr-1" /> Approva
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                setSelectedCampaign(campaign);
                                setShowRejectDialog(true);
                              }}
                            >
                              <X className="h-4 w-4 mr-1" /> Rifiuta
                            </Button>
                          </div>
                        )}

                        {campaign.rejected_reason && (
                          <p className="text-sm text-red-600 mt-2">
                            Motivo rifiuto: {campaign.rejected_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Tariffe Pubblicitarie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prezzo per Corner/Settimana (€)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={pricing.ad_price_per_corner_per_week}
                    onChange={(e) => setPricing(prev => ({ ...prev, ad_price_per_corner_per_week: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Prezzo base per mostrare una pubblicità su un Corner per una settimana
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Percentuale Corner (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={pricing.ad_corner_revenue_percentage}
                    onChange={(e) => setPricing(prev => ({ ...prev, ad_corner_revenue_percentage: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentuale del ricavo riconosciuta al Corner ospitante
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Esempio di calcolo</h4>
                <p className="text-sm text-muted-foreground">
                  Campagna su 3 Corner per 2 settimane = 3 × 2 × €{pricing.ad_price_per_corner_per_week} = <strong>€{(3 * 2 * pricing.ad_price_per_corner_per_week).toFixed(2)}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  • Ricavo Piattaforma: €{((3 * 2 * pricing.ad_price_per_corner_per_week) * (100 - pricing.ad_corner_revenue_percentage) / 100).toFixed(2)} ({100 - pricing.ad_corner_revenue_percentage}%)
                </p>
                <p className="text-sm text-muted-foreground">
                  • Payout Corner: €{((3 * 2 * pricing.ad_price_per_corner_per_week) * pricing.ad_corner_revenue_percentage / 100).toFixed(2)} ({pricing.ad_corner_revenue_percentage}%)
                </p>
              </div>

              <Button onClick={handleSavePricing} disabled={savingPricing}>
                {savingPricing ? 'Salvataggio...' : 'Salva Tariffe'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiuta Campagna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo del rifiuto</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Spiega perché la campagna è stata rifiutata..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Annulla
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                Conferma Rifiuto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
