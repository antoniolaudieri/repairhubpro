import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Megaphone, Check, X, Eye, Calendar, MapPin, Euro, 
  Clock, Building2, Mail, TrendingUp, Settings, TestTube,
  Percent, Timer, Play, Pause, Trash2, Video, Image, Palette,
  CreditCard, CheckCircle, AlertCircle, Store
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { PlatformAdminLayout } from '@/layouts/PlatformAdminLayout';

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
  corners?: { 
    id: string;
    corner_id: string; 
    corner_revenue: number; 
    payment_status: string | null;
    payment_requested_at: string | null;
    payment_paid_at: string | null;
    corner?: { business_name: string; email: string; phone: string; address: string } 
  }[];
}

interface PricingSettings {
  ad_price_per_corner_per_week: number;
  ad_corner_revenue_percentage: number;
  ad_duration_discount_1month: number;
  ad_duration_discount_3months: number;
  ad_duration_discount_1year: number;
  ad_volume_discount_3corners: number;
  ad_volume_discount_5corners: number;
  ad_volume_discount_10corners: number;
  ad_display_seconds_extra_rate: number;
}

const defaultPricing: PricingSettings = {
  ad_price_per_corner_per_week: 5,
  ad_corner_revenue_percentage: 50,
  ad_duration_discount_1month: 10,
  ad_duration_discount_3months: 20,
  ad_duration_discount_1year: 35,
  ad_volume_discount_3corners: 10,
  ad_volume_discount_5corners: 15,
  ad_volume_discount_10corners: 25,
  ad_display_seconds_extra_rate: 10
};

export default function AdminPubblicita() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showTestModeDialog, setShowTestModeDialog] = useState(false);
  const [testModeEnabled, setTestModeEnabled] = useState(false);
  const [pricing, setPricing] = useState<PricingSettings>(defaultPricing);
  const [savingPricing, setSavingPricing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'requested' | 'pending' | 'paid'>('all');
  const [paymentMonth, setPaymentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: campaignsData, error } = await supabase
        .from('display_ad_campaigns')
        .select(`
          *,
          corners:display_ad_campaign_corners(
            id,
            corner_id,
            corner_revenue,
            payment_status,
            payment_requested_at,
            payment_paid_at,
            corner:corners(business_name, email, phone, address)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(campaignsData || []);

      // Load pricing settings
      const { data: settings } = await supabase
        .from('platform_settings')
        .select('key, value');

      if (settings) {
        const newPricing = { ...defaultPricing };
        settings.forEach(s => {
          if (s.key in newPricing) {
            (newPricing as any)[s.key] = s.value;
          }
        });
        setPricing(newPricing);
      }

      // Check test mode
      const testModeSetting = settings?.find(s => s.key === 'ad_test_mode_enabled');
      setTestModeEnabled(testModeSetting?.value === 1);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Errore caricamento dati');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (campaign: Campaign, skipPayment = false) => {
    try {
      const updateData: any = {
        status: 'active',
        approved_at: new Date().toISOString()
      };
      
      if (skipPayment) {
        updateData.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('display_ad_campaigns')
        .update(updateData)
        .eq('id', campaign.id);

      if (error) throw error;
      toast.success(skipPayment ? 'Campagna approvata (modalità test)' : 'Campagna approvata');
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

  const handleDelete = async (campaign: Campaign) => {
    if (!confirm('Sei sicuro di voler eliminare questa campagna?')) return;
    
    try {
      // Delete corner assignments first
      await supabase
        .from('display_ad_campaign_corners')
        .delete()
        .eq('campaign_id', campaign.id);

      const { error } = await supabase
        .from('display_ad_campaigns')
        .delete()
        .eq('id', campaign.id);

      if (error) throw error;
      toast.success('Campagna eliminata');
      loadData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Errore eliminazione');
    }
  };

  const handleToggleStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    try {
      const { error } = await supabase
        .from('display_ad_campaigns')
        .update({ status: newStatus })
        .eq('id', campaign.id);

      if (error) throw error;
      toast.success(newStatus === 'active' ? 'Campagna riattivata' : 'Campagna in pausa');
      loadData();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Errore aggiornamento');
    }
  };

  const handleSavePricing = async () => {
    setSavingPricing(true);
    try {
      const updates = Object.entries(pricing).map(([key, value]) => ({
        key,
        value,
        label: key.replace(/_/g, ' ').replace('ad ', ''),
        description: ''
      }));

      for (const update of updates) {
        await supabase
          .from('platform_settings')
          .upsert({ 
            key: update.key, 
            value: update.value,
            label: update.label,
            description: update.description
          }, { onConflict: 'key' });
      }

      toast.success('Tariffe aggiornate');
    } catch (error) {
      console.error('Error saving pricing:', error);
      toast.error('Errore salvataggio');
    } finally {
      setSavingPricing(false);
    }
  };

  const handleToggleTestMode = async () => {
    try {
      await supabase
        .from('platform_settings')
        .upsert({ 
          key: 'ad_test_mode_enabled', 
          value: testModeEnabled ? 0 : 1,
          label: 'Test Mode Pubblicità',
          description: 'Abilita approvazione manuale senza pagamento'
        }, { onConflict: 'key' });

      setTestModeEnabled(!testModeEnabled);
      toast.success(testModeEnabled ? 'Modalità test disabilitata' : 'Modalità test abilitata');
    } catch (error) {
      console.error('Error toggling test mode:', error);
      toast.error('Errore');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; className?: string }> = {
      pending_payment: { variant: 'outline', label: 'Attesa Pagamento', className: 'border-yellow-500 text-yellow-600' },
      pending_approval: { variant: 'secondary', label: 'Da Approvare', className: 'bg-amber-100 text-amber-800' },
      active: { variant: 'default', label: 'Attiva', className: 'bg-green-500' },
      paused: { variant: 'outline', label: 'In Pausa', className: 'border-blue-500 text-blue-600' },
      completed: { variant: 'outline', label: 'Completata' },
      rejected: { variant: 'destructive', label: 'Rifiutata' }
    };
    const { variant, label, className } = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={variant} className={className}>{label}</Badge>;
  };

  const getAdTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-3.5 w-3.5" />;
      case 'image': return <Image className="h-3.5 w-3.5" />;
      default: return <Palette className="h-3.5 w-3.5" />;
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return c.status === 'pending_payment' || c.status === 'pending_approval';
    if (activeTab === 'active') return c.status === 'active';
    if (activeTab === 'completed') return c.status === 'completed' || c.status === 'rejected';
    return true;
  });

  const stats = {
    pending: campaigns.filter(c => c.status === 'pending_approval' || c.status === 'pending_payment').length,
    active: campaigns.filter(c => c.status === 'active').length,
    totalRevenue: campaigns.filter(c => c.status === 'active' || c.status === 'completed')
      .reduce((sum, c) => sum + (c.platform_revenue || 0), 0),
    cornerPayout: campaigns.filter(c => c.status === 'active' || c.status === 'completed')
      .reduce((sum, c) => sum + (c.corner_revenue_total || 0), 0)
  };

  if (loading) {
    return (
      <PlatformAdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </PlatformAdminLayout>
    );
  }

  return (
    <PlatformAdminLayout>
    <div className="space-y-6">
      {/* Header with Test Mode */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Gestione Pubblicità
          </h1>
          <p className="text-muted-foreground">Gestisci campagne, tariffe e sconti</p>
        </div>
        
        <div className="flex items-center gap-3">
          {testModeEnabled && (
            <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700 gap-1">
              <TestTube className="h-3 w-3" />
              Modalità Test Attiva
            </Badge>
          )}
          <Button 
            variant={testModeEnabled ? "default" : "outline"}
            size="sm"
            onClick={handleToggleTestMode}
            className={testModeEnabled ? "bg-amber-500 hover:bg-amber-600" : ""}
          >
            <TestTube className="h-4 w-4 mr-1" />
            {testModeEnabled ? 'Disabilita Test' : 'Abilita Test'}
          </Button>
        </div>
      </div>

      {/* Stats Cards - Mobile optimized */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-amber-500/20 rounded-lg sm:rounded-xl w-fit">
                  <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-3xl font-bold text-amber-700">{stats.pending}</p>
                  <p className="text-xs sm:text-sm text-amber-600/80">In Attesa</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-green-500/20 rounded-lg sm:rounded-xl w-fit">
                  <Megaphone className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-3xl font-bold text-green-700">{stats.active}</p>
                  <p className="text-xs sm:text-sm text-green-600/80">Attive</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-blue-500/20 rounded-lg sm:rounded-xl w-fit">
                  <Euro className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-3xl font-bold text-blue-700">€{stats.totalRevenue.toFixed(2)}</p>
                  <p className="text-xs sm:text-sm text-blue-600/80">Ricavi</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-purple-500/20 rounded-lg sm:rounded-xl w-fit">
                  <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-3xl font-bold text-purple-700">€{stats.cornerPayout.toFixed(2)}</p>
                  <p className="text-xs sm:text-sm text-purple-600/80">Payout</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-background flex-1 sm:flex-none text-xs sm:text-sm">
            <Megaphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Campagne</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-background relative flex-1 sm:flex-none text-xs sm:text-sm">
            <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Pagamenti</span>
            {campaigns.flatMap(c => c.corners || []).filter(cc => cc.payment_status === 'requested').length > 0 && (
              <Badge className="ml-1 sm:ml-2 bg-amber-500 text-xs px-1.5" variant="default">
                {campaigns.flatMap(c => c.corners || []).filter(cc => cc.payment_status === 'requested').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pricing" className="data-[state=active]:bg-background flex-1 sm:flex-none text-xs sm:text-sm">
            <Euro className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Tariffe</span>
          </TabsTrigger>
          <TabsTrigger value="discounts" className="data-[state=active]:bg-background flex-1 sm:flex-none text-xs sm:text-sm">
            <Percent className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sconti</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'all', label: 'Tutte', count: campaigns.length },
              { id: 'pending', label: 'In Attesa', count: stats.pending },
              { id: 'active', label: 'Attive', count: stats.active },
              { id: 'completed', label: 'Completate', count: campaigns.filter(c => c.status === 'completed' || c.status === 'rejected').length }
            ].map(tab => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className="gap-2"
              >
                {tab.label}
                <Badge variant="secondary" className="ml-1">{tab.count}</Badge>
              </Button>
            ))}
          </div>

          {filteredCampaigns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Nessuna campagna in questa categoria</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredCampaigns.map((campaign, index) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`overflow-hidden transition-all hover:shadow-md ${
                    campaign.status === 'pending_approval' ? 'border-l-4 border-l-amber-500' :
                    campaign.status === 'pending_payment' ? 'border-l-4 border-l-yellow-400' :
                    campaign.status === 'active' ? 'border-l-4 border-l-green-500' : ''
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Preview */}
                        <div className="w-full md:w-40 aspect-video rounded-lg overflow-hidden flex-shrink-0 relative group">
                          {campaign.ad_type === 'video' && campaign.ad_image_url ? (
                            <video src={campaign.ad_image_url} className="w-full h-full object-cover" muted loop />
                          ) : campaign.ad_type === 'image' && campaign.ad_image_url ? (
                            <img src={campaign.ad_image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${campaign.ad_gradient} flex items-center justify-center p-2`}>
                              <p className="text-white text-xs font-medium text-center line-clamp-2">{campaign.ad_title}</p>
                            </div>
                          )}
                          <div className="absolute top-1 left-1">
                            <Badge variant="secondary" className="text-xs gap-1 bg-black/50 text-white border-0">
                              {getAdTypeIcon(campaign.ad_type)}
                              {campaign.ad_type}
                            </Badge>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{campaign.ad_title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {campaign.advertiser_name} 
                                {campaign.advertiser_company && ` · ${campaign.advertiser_company}`}
                              </p>
                            </div>
                            {getStatusBadge(campaign.status)}
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm mb-3">
                            <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                              <Calendar className="h-3.5 w-3.5" />
                              {format(new Date(campaign.start_date), 'dd MMM', { locale: it })} - {format(new Date(campaign.end_date), 'dd MMM', { locale: it })}
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                              <MapPin className="h-3.5 w-3.5" />
                              {campaign.corners?.length || 0} Corner
                            </div>
                            <div className="flex items-center gap-1.5 font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                              <Euro className="h-3.5 w-3.5" />
                              €{campaign.total_price?.toFixed(2)}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            {(campaign.status === 'pending_approval' || (testModeEnabled && campaign.status === 'pending_payment')) && (
                              <>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleApprove(campaign, testModeEnabled && campaign.status === 'pending_payment')}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-4 w-4 mr-1" /> 
                                  {testModeEnabled && campaign.status === 'pending_payment' ? 'Approva (Test)' : 'Approva'}
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
                              </>
                            )}
                            
                            {campaign.status === 'active' && (
                              <Button size="sm" variant="outline" onClick={() => handleToggleStatus(campaign)}>
                                <Pause className="h-4 w-4 mr-1" /> Pausa
                              </Button>
                            )}
                            
                            {campaign.status === 'paused' && (
                              <Button size="sm" variant="outline" onClick={() => handleToggleStatus(campaign)}>
                                <Play className="h-4 w-4 mr-1" /> Riattiva
                              </Button>
                            )}
                            
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(campaign)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {campaign.rejected_reason && (
                            <p className="text-sm text-red-600 mt-2 bg-red-50 px-2 py-1 rounded">
                              Motivo rifiuto: {campaign.rejected_reason}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Pagamenti ai Corner
                  </CardTitle>
                  <CardDescription>Gestisci le richieste di pagamento dai Corner per le pubblicità</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Mese:</Label>
                  <Input
                    type="month"
                    value={paymentMonth}
                    onChange={(e) => setPaymentMonth(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const [filterYear, filterMonth] = paymentMonth.split('-').map(Number);
                
                const allCornerPayments = campaigns
                  .filter(c => c.status === 'active' || c.status === 'completed')
                  .flatMap(c => (c.corners || []).map(cc => ({
                    ...cc,
                    campaign: c
                  })))
                  .filter(p => {
                    // Filter by month based on payment_requested_at or campaign start_date
                    const dateStr = p.payment_requested_at || p.payment_paid_at || p.campaign.start_date;
                    if (!dateStr) return true;
                    const date = new Date(dateStr);
                    return date.getFullYear() === filterYear && date.getMonth() + 1 === filterMonth;
                  });
                
                const pendingPayments = allCornerPayments.filter(p => p.payment_status === 'requested');
                const paidPayments = allCornerPayments.filter(p => p.payment_status === 'paid');
                const unpaidPayments = allCornerPayments.filter(p => !p.payment_status || p.payment_status === 'pending');

                const handleMarkAsPaid = async (cornerCampaignId: string) => {
                  try {
                    const { error } = await supabase
                      .from('display_ad_campaign_corners')
                      .update({
                        payment_status: 'paid',
                        payment_paid_at: new Date().toISOString()
                      })
                      .eq('id', cornerCampaignId);

                    if (error) throw error;
                    toast.success('Pagamento confermato');
                    loadData();
                  } catch (error) {
                    console.error('Error marking as paid:', error);
                    toast.error('Errore aggiornamento');
                  }
                };

                const getFilteredPayments = () => {
                  switch (paymentFilter) {
                    case 'requested': return pendingPayments;
                    case 'pending': return unpaidPayments;
                    case 'paid': return paidPayments;
                    default: return allCornerPayments;
                  }
                };

                const filteredPayments = getFilteredPayments();

                return (
                  <div className="space-y-6">
                    {/* Stats - Clickable filters */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      <button 
                        onClick={() => setPaymentFilter(paymentFilter === 'requested' ? 'all' : 'requested')}
                        className={`p-2 sm:p-4 border rounded-lg text-center transition-all ${
                          paymentFilter === 'requested' 
                            ? 'bg-amber-200 border-amber-400 ring-2 ring-amber-500' 
                            : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        <AlertCircle className="h-4 w-4 sm:h-6 sm:w-6 text-amber-600 mx-auto mb-1 sm:mb-2" />
                        <p className="text-lg sm:text-2xl font-bold text-amber-700">{pendingPayments.length}</p>
                        <p className="text-xs sm:text-sm text-amber-600">Da Pagare</p>
                        <p className="text-sm sm:text-lg font-semibold text-amber-800 mt-1">
                          €{pendingPayments.reduce((sum, p) => sum + (p.corner_revenue || 0), 0).toFixed(2)}
                        </p>
                      </button>
                      <button 
                        onClick={() => setPaymentFilter(paymentFilter === 'pending' ? 'all' : 'pending')}
                        className={`p-2 sm:p-4 border rounded-lg text-center transition-all ${
                          paymentFilter === 'pending' 
                            ? 'bg-gray-200 border-gray-400 ring-2 ring-gray-500' 
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-gray-500 mx-auto mb-1 sm:mb-2" />
                        <p className="text-lg sm:text-2xl font-bold">{unpaidPayments.length}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">Non Rich.</p>
                        <p className="text-sm sm:text-lg font-semibold text-muted-foreground mt-1">
                          €{unpaidPayments.reduce((sum, p) => sum + (p.corner_revenue || 0), 0).toFixed(2)}
                        </p>
                      </button>
                      <button 
                        onClick={() => setPaymentFilter(paymentFilter === 'paid' ? 'all' : 'paid')}
                        className={`p-2 sm:p-4 border rounded-lg text-center transition-all ${
                          paymentFilter === 'paid' 
                            ? 'bg-green-200 border-green-400 ring-2 ring-green-500' 
                            : 'bg-green-50 border-green-200 hover:bg-green-100'
                        }`}
                      >
                        <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 text-green-600 mx-auto mb-1 sm:mb-2" />
                        <p className="text-lg sm:text-2xl font-bold text-green-700">{paidPayments.length}</p>
                        <p className="text-xs sm:text-sm text-green-600">Pagati</p>
                        <p className="text-sm sm:text-lg font-semibold text-green-800 mt-1">
                          €{paidPayments.reduce((sum, p) => sum + (p.corner_revenue || 0), 0).toFixed(2)}
                        </p>
                      </button>
                    </div>

                    {paymentFilter !== 'all' && (
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="gap-1">
                          Filtro: {paymentFilter === 'requested' ? 'Da Pagare' : paymentFilter === 'pending' ? 'Non Richiesti' : 'Pagati'}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => setPaymentFilter('all')}>
                          <X className="h-4 w-4 mr-1" /> Rimuovi filtro
                        </Button>
                      </div>
                    )}

                    {/* Filtered Payments List */}
                    {filteredPayments.length > 0 ? (
                      <div className="space-y-3">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Store className="h-4 w-4" />
                          Corner ({filteredPayments.length})
                        </h3>
                        {filteredPayments.map((payment) => (
                          <motion.div
                            key={payment.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`p-3 sm:p-4 border rounded-lg space-y-3 ${
                              payment.payment_status === 'paid' 
                                ? 'bg-green-50 border-green-200' 
                                : payment.payment_status === 'requested'
                                  ? 'bg-amber-50 border-amber-200'
                                  : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-full flex-shrink-0 mt-1 ${
                                  payment.payment_status === 'paid' 
                                    ? 'bg-green-200' 
                                    : payment.payment_status === 'requested'
                                      ? 'bg-amber-200'
                                      : 'bg-gray-200'
                                }`}>
                                  <Store className="h-4 w-4 sm:h-5 sm:w-5" />
                                </div>
                                <div className="min-w-0 space-y-1">
                                  <p className="font-semibold text-sm sm:text-base">{payment.corner?.business_name}</p>
                                  <p className="text-xs sm:text-sm text-muted-foreground">
                                    Campagna: {payment.campaign.ad_title}
                                  </p>
                                  {/* Billing info */}
                                  <div className="text-xs space-y-0.5 text-muted-foreground bg-white/50 p-2 rounded border">
                                    <p className="flex items-center gap-1.5">
                                      <Mail className="h-3 w-3" />
                                      <span className="font-medium">{payment.corner?.email}</span>
                                    </p>
                                    {payment.corner?.phone && (
                                      <p>Tel: {payment.corner.phone}</p>
                                    )}
                                    {payment.corner?.address && (
                                      <p className="truncate">Ind: {payment.corner.address}</p>
                                    )}
                                  </div>
                                  {payment.payment_status === 'requested' && payment.payment_requested_at && (
                                    <p className="text-xs text-amber-600">
                                      Richiesto il {format(new Date(payment.payment_requested_at), 'dd/MM/yy HH:mm', { locale: it })}
                                    </p>
                                  )}
                                  {payment.payment_status === 'paid' && payment.payment_paid_at && (
                                    <p className="text-xs text-green-600">
                                      Pagato il {format(new Date(payment.payment_paid_at), 'dd/MM/yy HH:mm', { locale: it })}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                                <span className={`text-lg sm:text-xl font-bold ${
                                  payment.payment_status === 'paid' ? 'text-green-700' : 
                                  payment.payment_status === 'requested' ? 'text-amber-700' : 'text-gray-700'
                                }`}>€{payment.corner_revenue?.toFixed(2)}</span>
                                {payment.payment_status === 'requested' && (
                                  <Button 
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleMarkAsPaid(payment.id)}
                                  >
                                    <CheckCircle className="h-4 w-4 sm:mr-1" />
                                    <span className="hidden sm:inline">Segna Pagato</span>
                                  </Button>
                                )}
                                {payment.payment_status === 'paid' && (
                                  <Badge className="bg-green-500">Pagato</Badge>
                                )}
                                {(!payment.payment_status || payment.payment_status === 'pending') && (
                                  <Badge variant="outline">Non richiesto</Badge>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Nessun pagamento in questo mese</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5 text-primary" />
                  Tariffe Base
                </CardTitle>
                <CardDescription>Configura i prezzi base per le campagne pubblicitarie</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base">Prezzo per Corner/Settimana</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={1}
                        value={pricing.ad_price_per_corner_per_week}
                        onChange={(e) => setPricing(prev => ({ ...prev, ad_price_per_corner_per_week: Number(e.target.value) }))}
                        className="w-32"
                      />
                      <span className="text-2xl font-bold text-primary">€{pricing.ad_price_per_corner_per_week}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Prezzo base per mostrare una pubblicità su un Corner per 7 giorni (5 secondi)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base">Quota Corner</Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[pricing.ad_corner_revenue_percentage]}
                        onValueChange={(v) => setPricing(prev => ({ ...prev, ad_corner_revenue_percentage: v[0] }))}
                        min={0}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-2xl font-bold text-primary w-16">{pricing.ad_corner_revenue_percentage}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Percentuale del ricavo riconosciuta al Corner ospitante
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base">Costo Extra per Secondo</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        value={pricing.ad_display_seconds_extra_rate}
                        onChange={(e) => setPricing(prev => ({ ...prev, ad_display_seconds_extra_rate: Number(e.target.value) }))}
                        className="w-32"
                      />
                      <span className="text-lg font-bold text-primary">+{pricing.ad_display_seconds_extra_rate}% /sec</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ogni secondo oltre i 5 base aumenta il prezzo di questa percentuale
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Simulatore Prezzi
                </CardTitle>
                <CardDescription>Calcola il prezzo di una campagna esempio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 p-4 bg-gradient-to-br from-muted/50 to-muted rounded-xl">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">Esempio: 5 Corner × 4 settimane × 10 secondi</p>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Base (5s)</span>
                      <span>5 × 4 × €{pricing.ad_price_per_corner_per_week} = €{(5 * 4 * pricing.ad_price_per_corner_per_week).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>Extra secondi (+5s × {pricing.ad_display_seconds_extra_rate}%)</span>
                      <span>+€{((5 * 4 * pricing.ad_price_per_corner_per_week) * (5 * pricing.ad_display_seconds_extra_rate / 100)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Sconto volume (5+ corner: -{pricing.ad_volume_discount_5corners}%)</span>
                      <span>-€{(((5 * 4 * pricing.ad_price_per_corner_per_week) * 1.5) * pricing.ad_volume_discount_5corners / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Sconto durata (1 mese: -{pricing.ad_duration_discount_1month}%)</span>
                      <span>-€{(((5 * 4 * pricing.ad_price_per_corner_per_week) * 1.5 * 0.85) * pricing.ad_duration_discount_1month / 100).toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span>Totale Cliente</span>
                      <span className="text-primary">
                        €{(
                          (5 * 4 * pricing.ad_price_per_corner_per_week) * 
                          (1 + (5 * pricing.ad_display_seconds_extra_rate / 100)) * 
                          (1 - pricing.ad_volume_discount_5corners / 100) * 
                          (1 - pricing.ad_duration_discount_1month / 100)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t">
                    <div className="text-center p-2 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground">Piattaforma</p>
                      <p className="font-bold text-blue-600">
                        €{(
                          ((5 * 4 * pricing.ad_price_per_corner_per_week) * 
                          (1 + (5 * pricing.ad_display_seconds_extra_rate / 100)) * 
                          (1 - pricing.ad_volume_discount_5corners / 100) * 
                          (1 - pricing.ad_duration_discount_1month / 100)) *
                          (100 - pricing.ad_corner_revenue_percentage) / 100
                        ).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground">Corner (totale)</p>
                      <p className="font-bold text-purple-600">
                        €{(
                          ((5 * 4 * pricing.ad_price_per_corner_per_week) * 
                          (1 + (5 * pricing.ad_display_seconds_extra_rate / 100)) * 
                          (1 - pricing.ad_volume_discount_5corners / 100) * 
                          (1 - pricing.ad_duration_discount_1month / 100)) *
                          pricing.ad_corner_revenue_percentage / 100
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4">
            <Button onClick={handleSavePricing} disabled={savingPricing} size="lg">
              {savingPricing ? 'Salvataggio...' : 'Salva Tariffe'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="discounts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Sconti Durata
                </CardTitle>
                <CardDescription>Sconti applicati in base alla durata della campagna</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">1 Mese (30 giorni)</p>
                      <p className="text-xs text-muted-foreground">Campagne mensili</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={pricing.ad_duration_discount_1month}
                        onChange={(e) => setPricing(prev => ({ ...prev, ad_duration_discount_1month: Number(e.target.value) }))}
                        className="w-20 text-center"
                      />
                      <span className="text-lg font-bold text-green-600">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">3 Mesi (90 giorni)</p>
                      <p className="text-xs text-muted-foreground">Campagne trimestrali</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={pricing.ad_duration_discount_3months}
                        onChange={(e) => setPricing(prev => ({ ...prev, ad_duration_discount_3months: Number(e.target.value) }))}
                        className="w-20 text-center"
                      />
                      <span className="text-lg font-bold text-green-600">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        1 Anno (365 giorni)
                        <Badge className="bg-amber-500">Best Value</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">Campagne annuali</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={pricing.ad_duration_discount_1year}
                        onChange={(e) => setPricing(prev => ({ ...prev, ad_duration_discount_1year: Number(e.target.value) }))}
                        className="w-20 text-center"
                      />
                      <span className="text-lg font-bold text-green-600">%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Sconti Volume
                </CardTitle>
                <CardDescription>Sconti applicati in base al numero di Corner selezionati</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">3+ Corner</p>
                      <p className="text-xs text-muted-foreground">Campagne multi-location</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={pricing.ad_volume_discount_3corners}
                        onChange={(e) => setPricing(prev => ({ ...prev, ad_volume_discount_3corners: Number(e.target.value) }))}
                        className="w-20 text-center"
                      />
                      <span className="text-lg font-bold text-green-600">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">5+ Corner</p>
                      <p className="text-xs text-muted-foreground">Campagne regionali</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={pricing.ad_volume_discount_5corners}
                        onChange={(e) => setPricing(prev => ({ ...prev, ad_volume_discount_5corners: Number(e.target.value) }))}
                        className="w-20 text-center"
                      />
                      <span className="text-lg font-bold text-green-600">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        10+ Corner
                        <Badge className="bg-purple-500">Network</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">Campagne nazionali</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={pricing.ad_volume_discount_10corners}
                        onChange={(e) => setPricing(prev => ({ ...prev, ad_volume_discount_10corners: Number(e.target.value) }))}
                        className="w-20 text-center"
                      />
                      <span className="text-lg font-bold text-green-600">%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4">
            <Button onClick={handleSavePricing} disabled={savingPricing} size="lg">
              {savingPricing ? 'Salvataggio...' : 'Salva Sconti'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiuta Campagna</DialogTitle>
            <DialogDescription>
              Specifica il motivo del rifiuto. L'inserzionista riceverà questa comunicazione.
            </DialogDescription>
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
    </PlatformAdminLayout>
  );
}
