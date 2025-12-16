import { useState, useEffect, useCallback } from "react";

export interface CustomerAnalytics {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  created_at: string;
  repairCount: number;
  totalSpent: number;
  lastVisit: string | null;
  avgInterval: number | null;
  predictedReturn: string | null;
  daysOverdue: number | null;
  score: number;
  scoreBreakdown: {
    lifetimeValue: number;
    frequency: number;
    recency: number;
    loyalty: number;
    engagement: number;
  };
}

interface UseCustomerAnalyticsResult {
  analytics: CustomerAnalytics[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCustomerAnalytics(centroId: string | null): UseCustomerAnalyticsResult {
  const [analytics, setAnalytics] = useState<CustomerAnalytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!centroId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-analytics-agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "getAnalytics",
            centroId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      setAnalytics(data.customers || []);
    } catch (err) {
      console.error("Error fetching customer analytics:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [centroId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refresh: fetchAnalytics,
  };
}

// Calculate score locally for quick display without API call
export function calculateLocalScore(
  totalSpent: number,
  repairCount: number,
  lastVisitDate: Date | null,
  maxSpent: number
): number {
  // NEW CUSTOMERS: If no history, assign neutral score (50)
  const isNewCustomer = repairCount === 0 && totalSpent === 0;
  if (isNewCustomer) {
    return 50;
  }

  const lifetimeValue = maxSpent > 0 ? Math.min((totalSpent / maxSpent) * 100, 100) : 0;
  const frequency = Math.min((repairCount / 12) * 100, 100);
  
  let recency = 100;
  if (lastVisitDate) {
    const daysSince = Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 365) recency = 0;
    else if (daysSince > 180) recency = 20;
    else if (daysSince > 90) recency = 50;
    else if (daysSince > 30) recency = 80;
  }

  const score = Math.round(
    lifetimeValue * 0.3 +
    frequency * 0.25 +
    recency * 0.2 +
    100 * 0.15 + // loyalty
    30 * 0.1 // engagement
  );

  return Math.min(Math.max(score, 0), 100);
}

// Calculate return prediction locally
export function calculateLocalReturnPrediction(visitDates: Date[]): {
  avgInterval: number | null;
  predictedReturn: Date | null;
  daysOverdue: number | null;
} {
  if (visitDates.length < 2) {
    return { avgInterval: null, predictedReturn: null, daysOverdue: null };
  }

  const sorted = [...visitDates].sort((a, b) => b.getTime() - a.getTime());
  const intervals: number[] = [];
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = (sorted[i].getTime() - sorted[i + 1].getTime()) / (1000 * 60 * 60 * 24);
    intervals.push(diff);
  }

  const avgInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
  const lastVisit = sorted[0];
  const predictedReturn = new Date(lastVisit.getTime() + avgInterval * 24 * 60 * 60 * 1000);
  
  let daysOverdue: number | null = null;
  const diff = Date.now() - predictedReturn.getTime();
  if (diff > 0) {
    daysOverdue = Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  return { avgInterval, predictedReturn, daysOverdue };
}
