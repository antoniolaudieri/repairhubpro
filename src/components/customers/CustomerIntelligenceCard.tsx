import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { 
  Gift, TrendingUp, Clock, AlertTriangle, 
  Cake, CreditCard, CheckCircle, XCircle, ChevronDown, ChevronUp,
  Sparkles, Target, CalendarDays
} from "lucide-react";
import { format, differenceInDays, addDays, parseISO } from "date-fns";
import { it } from "date-fns/locale";

interface CustomerIntelligenceCardProps {
  customerId: string;
  centroId: string;
  totalSpent: number;
  repairCount: number;
  lastVisitDate: string | null;
  hasLoyaltyCard: boolean;
}

interface CustomerProfile {
  birth_date: string | null;
  marketing_consent: boolean;
  acquisition_source: string | null;
  behavioral_tags: string[];
}

interface VisitStats {
  avgInterval: number | null;
  predictedReturn: string | null;
  daysOverdue: number;
}

export function CustomerIntelligenceCard({
  customerId,
  centroId,
  totalSpent,
  repairCount,
  lastVisitDate,
  hasLoyaltyCard,
}: CustomerIntelligenceCardProps) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [visitStats, setVisitStats] = useState<VisitStats>({ avgInterval: null, predictedReturn: null, daysOverdue: 0 });
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [customerId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch customer profile
      const { data: profileData } = await supabase
        .from("customer_profiles")
        .select("birth_date, marketing_consent, acquisition_source, behavioral_tags")
        .eq("customer_id", customerId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch customer visits for prediction
      const { data: visits } = await supabase
        .from("customer_visits")
        .select("check_in_at")
        .eq("customer_id", customerId)
        .order("check_in_at", { ascending: true });

      if (visits && visits.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < visits.length; i++) {
          const diff = differenceInDays(
            parseISO(visits[i].check_in_at),
            parseISO(visits[i - 1].check_in_at)
          );
          if (diff > 0) intervals.push(diff);
        }

        if (intervals.length > 0) {
          const avgInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
          const lastVisit = parseISO(visits[visits.length - 1].check_in_at);
          const predictedReturn = addDays(lastVisit, avgInterval);
          const daysOverdue = Math.max(0, differenceInDays(new Date(), predictedReturn));

          setVisitStats({
            avgInterval,
            predictedReturn: format(predictedReturn, "dd MMM yyyy", { locale: it }),
            daysOverdue,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching intelligence data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate LTV tier
  const getLTVTier = () => {
    if (totalSpent >= 1000) return { tier: "Platinum", color: "bg-purple-500", percentage: 100 };
    if (totalSpent >= 500) return { tier: "Gold", color: "bg-amber-500", percentage: 75 };
    if (totalSpent >= 200) return { tier: "Silver", color: "bg-gray-400", percentage: 50 };
    return { tier: "Bronze", color: "bg-orange-600", percentage: 25 };
  };

  // Calculate days until birthday
  const getDaysUntilBirthday = () => {
    if (!profile?.birth_date) return null;
    
    const today = new Date();
    const birthDate = parseISO(profile.birth_date);
    const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    
    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(today.getFullYear() + 1);
    }
    
    return differenceInDays(thisYearBirthday, today);
  };

  const ltv = getLTVTier();
  const daysUntilBirthday = getDaysUntilBirthday();

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-8 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Customer Intelligence
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 w-7 p-0"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {/* LTV Tier */}
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <div className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${ltv.color} text-white text-xs font-bold mb-1`}>
              {ltv.tier[0]}
            </div>
            <p className="text-[10px] text-muted-foreground">LTV</p>
            <p className="text-xs font-medium">{ltv.tier}</p>
          </div>

          {/* Loyalty Card Status */}
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <div className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${hasLoyaltyCard ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'} mb-1`}>
              <CreditCard className="h-4 w-4" />
            </div>
            <p className="text-[10px] text-muted-foreground">Tessera</p>
            <p className="text-xs font-medium">{hasLoyaltyCard ? "Attiva" : "No"}</p>
          </div>

          {/* Birthday Countdown */}
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <div className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${daysUntilBirthday !== null && daysUntilBirthday <= 30 ? 'bg-pink-500 text-white' : 'bg-muted text-muted-foreground'} mb-1`}>
              <Cake className="h-4 w-4" />
            </div>
            <p className="text-[10px] text-muted-foreground">Compleanno</p>
            <p className="text-xs font-medium">
              {daysUntilBirthday !== null 
                ? daysUntilBirthday === 0 
                  ? "Oggi!" 
                  : `${daysUntilBirthday}g`
                : "N/D"}
            </p>
          </div>
        </div>

        {/* Birthday Alert */}
        {daysUntilBirthday !== null && daysUntilBirthday <= 30 && daysUntilBirthday > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-pink-500/10 border border-pink-500/20">
            <Gift className="h-4 w-4 text-pink-500" />
            <div className="flex-1">
              <p className="text-xs font-medium text-pink-600">Compleanno tra {daysUntilBirthday} giorni!</p>
              <p className="text-[10px] text-pink-500/80">Invia un'offerta speciale</p>
            </div>
          </div>
        )}

        {/* Return Prediction */}
        {visitStats.predictedReturn && (
          <div className={`flex items-center gap-2 p-2.5 rounded-lg ${
            visitStats.daysOverdue > 0 
              ? 'bg-warning/10 border border-warning/20' 
              : 'bg-accent/10 border border-accent/20'
          }`}>
            {visitStats.daysOverdue > 0 ? (
              <AlertTriangle className="h-4 w-4 text-warning" />
            ) : (
              <CalendarDays className="h-4 w-4 text-accent" />
            )}
            <div className="flex-1">
              <p className="text-xs font-medium">
                {visitStats.daysOverdue > 0 
                  ? `In ritardo di ${visitStats.daysOverdue} giorni`
                  : `Ritorno previsto: ${visitStats.predictedReturn}`}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Media visite ogni {visitStats.avgInterval} giorni
              </p>
            </div>
          </div>
        )}

        {/* Expanded Section */}
        {expanded && (
          <div className="overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <Separator className="my-3" />
            
            <div className="space-y-4">
              {/* LTV Progress */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Lifetime Value</span>
                  <span className="text-xs font-medium">€{totalSpent.toFixed(2)}</span>
                </div>
                <Progress value={ltv.percentage} className="h-2" />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">Bronze</span>
                  <span className="text-[10px] text-muted-foreground">Platinum</span>
                </div>
              </div>

              {/* Acquisition Source */}
              {profile?.acquisition_source && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Fonte Acquisizione</span>
                  <Badge variant="outline" className="text-xs">
                    {profile.acquisition_source.replace(/_/g, " ")}
                  </Badge>
                </div>
              )}

              {/* Marketing Consent */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Consenso Marketing</span>
                {profile?.marketing_consent ? (
                  <Badge className="bg-accent/10 text-accent border-accent/20 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Attivo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    <XCircle className="h-3 w-3 mr-1" />
                    Non attivo
                  </Badge>
                )}
              </div>

              {/* Behavioral Tags */}
              {profile?.behavioral_tags && profile.behavioral_tags.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-2">Tag</span>
                  <div className="flex flex-wrap gap-1">
                    {profile.behavioral_tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">
                        {tag.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Repair Stats */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="text-center p-2 rounded-lg bg-muted/30">
                  <Target className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">{repairCount}</p>
                  <p className="text-[10px] text-muted-foreground">Riparazioni</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/30">
                  <TrendingUp className="h-4 w-4 mx-auto mb-1 text-accent" />
                  <p className="text-lg font-bold">€{repairCount > 0 ? Math.round(totalSpent / repairCount) : 0}</p>
                  <p className="text-[10px] text-muted-foreground">Scontrino Medio</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}