import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Euro, Calendar, TrendingUp, Eye, Send, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CornerLayout } from '@/layouts/CornerLayout';
import { PageTransition } from '@/components/PageTransition';
import { toast } from 'sonner';

interface CampaignCorner {
  id: string;
  corner_revenue: number;
  impressions_count: number;
  payment_status: string | null;
  payment_requested_at: string | null;
  payment_paid_at: string | null;
  campaign: {
    id: string;
    ad_title: string;
    ad_description: string | null;
    ad_type: string;
    ad_gradient: string;
    ad_image_url: string | null;
    advertiser_name: string;
    advertiser_company: string | null;
    start_date: string;
    end_date: string;
    status: string;
  };
}

export default function CornerPubblicita() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignCorner[]>([]);
  const [loading, setLoading] = useState(true);
  const [cornerId, setCornerId] = useState<string | null>(null);
  const [requestingPayment, setRequestingPayment] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCornerAndCampaigns();
    }
  }, [user]);

  const loadCornerAndCampaigns = async () => {
    try {
      const { data: corner } = await supabase
        .from('corners')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (!corner) return;
      setCornerId(corner.id);

      const { data, error } = await supabase
        .from('display_ad_campaign_corners')
        .select(`
          id,
          corner_revenue,
          impressions_count,
          payment_status,
          payment_requested_at,
          payment_paid_at,
          campaign:display_ad_campaigns(
            id,
            ad_title,
            ad_description,
            ad_type,
            ad_gradient,
            ad_image_url,
            advertiser_name,
            advertiser_company,
            start_date,
            end_date,
            status
          )
        `)
        .eq('corner_id', corner.id);

      if (error) throw error;
      setCampaigns((data as any[]) || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayment = async (campaignCorner: CampaignCorner) => {
    setRequestingPayment(campaignCorner.id);
    try {
      const { error } = await supabase.functions.invoke('request-corner-ad-payment', {
        body: {
          campaign_corner_id: campaignCorner.id,
          corner_id: cornerId,
          campaign_id: campaignCorner.campaign?.id
        }
      });

      if (error) throw error;
      
      toast.success('Richiesta pagamento inviata!', {
        description: 'L\'admin riceverà una notifica'
      });
      
      loadCornerAndCampaigns();
    } catch (error) {
      console.error('Error requesting payment:', error);
      toast.error('Errore invio richiesta');
    } finally {
      setRequestingPayment(null);
    }
  };

  const activeCampaigns = campaigns.filter(c => c.campaign?.status === 'active');
  const completedCampaigns = campaigns.filter(c => c.campaign?.status === 'completed');
  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.corner_revenue || 0), 0);
  const pendingRevenue = campaigns
    .filter(c => c.payment_status !== 'paid' && c.campaign?.status === 'active')
    .reduce((sum, c) => sum + (c.corner_revenue || 0), 0);
  const paidRevenue = campaigns
    .filter(c => c.payment_status === 'paid')
    .reduce((sum, c) => sum + (c.corner_revenue || 0), 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions_count || 0), 0);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      active: { variant: 'default', label: 'Attiva' },
      completed: { variant: 'secondary', label: 'Completata' },
      pending_approval: { variant: 'outline', label: 'In Approvazione' }
    };
    const { variant, label } = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getPaymentBadge = (status: string | null) => {
    if (status === 'paid') {
      return <Badge className="bg-green-500">Pagato</Badge>;
    }
    if (status === 'requested') {
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Richiesto</Badge>;
    }
    return <Badge variant="outline" className="border-gray-300">Da Richiedere</Badge>;
  };

  const canRequestPayment = (item: CampaignCorner) => {
    return item.campaign?.status === 'active' && 
           item.payment_status !== 'paid' && 
           item.payment_status !== 'requested' &&
           item.corner_revenue > 0;
  };

  if (loading) {
    return (
      <CornerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </CornerLayout>
    );
  }

  return (
    <CornerLayout>
      <PageTransition>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="h-6 w-6" />
              Pubblicità Display
            </h1>
            <p className="text-muted-foreground">
              Guadagna ospitando pubblicità sul tuo display
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Euro className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">€{totalRevenue.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Totale</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-200 rounded-lg">
                    <Clock className="h-5 w-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-700">€{pendingRevenue.toFixed(2)}</p>
                    <p className="text-sm text-amber-600/80">Da Incassare</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-700">€{paidRevenue.toFixed(2)}</p>
                    <p className="text-sm text-green-600/80">Incassato</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Megaphone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activeCampaigns.length}</p>
                    <p className="text-sm text-muted-foreground">Attive</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Eye className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalImpressions}</p>
                    <p className="text-sm text-muted-foreground">Impressions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle>Campagne sul tuo Display</CardTitle>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna campagna pubblicitaria ancora</p>
                  <p className="text-sm mt-1">
                    Gli inserzionisti possono acquistare spazi pubblicitari sul tuo display
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-4 p-4 border rounded-lg"
                    >
                      {/* Preview */}
                      <div className="w-32 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                        {item.campaign?.ad_type === 'image' && item.campaign?.ad_image_url ? (
                          <img src={item.campaign.ad_image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${item.campaign?.ad_gradient} flex items-center justify-center p-2`}>
                            <p className="text-white text-xs font-medium text-center line-clamp-2">
                              {item.campaign?.ad_title}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <h3 className="font-medium">{item.campaign?.ad_title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {item.campaign?.advertiser_name}
                              {item.campaign?.advertiser_company && ` · ${item.campaign.advertiser_company}`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {item.campaign?.status && getStatusBadge(item.campaign.status)}
                            {getPaymentBadge(item.payment_status)}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {item.campaign?.start_date && format(new Date(item.campaign.start_date), 'dd/MM', { locale: it })} - 
                            {item.campaign?.end_date && format(new Date(item.campaign.end_date), 'dd/MM', { locale: it })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            {item.impressions_count} impressions
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <span className="text-lg font-bold text-green-600">
                            +€{item.corner_revenue?.toFixed(2)}
                          </span>
                          
                          {canRequestPayment(item) && (
                            <Button
                              size="sm"
                              onClick={() => handleRequestPayment(item)}
                              disabled={requestingPayment === item.id}
                              className="gap-2"
                            >
                              {requestingPayment === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              Richiedi Pagamento
                            </Button>
                          )}
                          
                          {item.payment_status === 'requested' && (
                            <span className="text-sm text-amber-600 flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              In attesa di pagamento
                            </span>
                          )}
                          
                          {item.payment_status === 'paid' && item.payment_paid_at && (
                            <span className="text-sm text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              Pagato il {format(new Date(item.payment_paid_at), 'dd/MM/yyyy', { locale: it })}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </CornerLayout>
  );
}
