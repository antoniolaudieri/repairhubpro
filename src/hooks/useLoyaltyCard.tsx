import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LoyaltyCard {
  id: string;
  customer_id: string;
  centro_id: string;
  status: string;
  activated_at: string | null;
  expires_at: string | null;
  payment_method: string;
  card_number: string | null;
  devices_used: number;
  max_devices: number;
  amount_paid: number;
  centro?: {
    business_name: string;
    logo_url: string | null;
    phone: string;
    email: string;
  };
}

interface LoyaltyCardUsage {
  id: string;
  discount_type: string;
  original_amount: number;
  discounted_amount: number;
  savings: number;
  created_at: string;
}

interface LoyaltyBenefits {
  hasActiveCard: boolean;
  diagnosticFee: number;
  repairDiscountPercent: number;
  canUseRepairDiscount: boolean;
  devicesUsed: number;
  maxDevices: number;
  card: LoyaltyCard | null;
}

export function useLoyaltyCard(customerId: string | null, centroId: string | null) {
  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [usages, setUsages] = useState<LoyaltyCardUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [benefits, setBenefits] = useState<LoyaltyBenefits>({
    hasActiveCard: false,
    diagnosticFee: 15,
    repairDiscountPercent: 0,
    canUseRepairDiscount: false,
    devicesUsed: 0,
    maxDevices: 3,
    card: null,
  });

  const fetchLoyaltyCard = useCallback(async () => {
    if (!customerId || !centroId) {
      setLoading(false);
      return;
    }

    try {
      const { data: loyaltyCard, error } = await supabase
        .from('loyalty_cards')
        .select(`
          *,
          centro:centri_assistenza(business_name, logo_url, phone, email)
        `)
        .eq('customer_id', customerId)
        .eq('centro_id', centroId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;

      if (loyaltyCard) {
        // Check if card is expired
        const isExpired = loyaltyCard.expires_at && new Date(loyaltyCard.expires_at) < new Date();
        
        if (isExpired) {
          // Mark as expired
          await supabase
            .from('loyalty_cards')
            .update({ status: 'expired' })
            .eq('id', loyaltyCard.id);
          
          setCard(null);
          setBenefits({
            hasActiveCard: false,
            diagnosticFee: 15,
            repairDiscountPercent: 0,
            canUseRepairDiscount: false,
            devicesUsed: 0,
            maxDevices: 3,
            card: null,
          });
        } else {
          setCard(loyaltyCard);
          setBenefits({
            hasActiveCard: true,
            diagnosticFee: 10, // Reduced fee
            repairDiscountPercent: 10,
            canUseRepairDiscount: loyaltyCard.devices_used < loyaltyCard.max_devices,
            devicesUsed: loyaltyCard.devices_used,
            maxDevices: loyaltyCard.max_devices,
            card: loyaltyCard,
          });

          // Fetch usages
          const { data: usageData } = await supabase
            .from('loyalty_card_usages')
            .select('*')
            .eq('loyalty_card_id', loyaltyCard.id)
            .order('created_at', { ascending: false });

          setUsages(usageData || []);
        }
      } else {
        setCard(null);
        setBenefits({
          hasActiveCard: false,
          diagnosticFee: 15,
          repairDiscountPercent: 0,
          canUseRepairDiscount: false,
          devicesUsed: 0,
          maxDevices: 3,
          card: null,
        });
      }
    } catch (error) {
      console.error('Error fetching loyalty card:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId, centroId]);

  useEffect(() => {
    fetchLoyaltyCard();
  }, [fetchLoyaltyCard]);

  const recordUsage = async (
    repairId: string | null,
    deviceId: string | null,
    discountType: 'diagnostic_fee' | 'repair_discount',
    originalAmount: number,
    discountedAmount: number
  ) => {
    if (!card) return false;

    try {
      const savings = originalAmount - discountedAmount;
      
      const { error } = await supabase
        .from('loyalty_card_usages')
        .insert({
          loyalty_card_id: card.id,
          repair_id: repairId,
          device_id: deviceId,
          discount_type: discountType,
          original_amount: originalAmount,
          discounted_amount: discountedAmount,
          savings,
        });

      if (error) throw error;

      // If repair discount, increment devices_used
      if (discountType === 'repair_discount') {
        await supabase
          .from('loyalty_cards')
          .update({ devices_used: card.devices_used + 1 })
          .eq('id', card.id);
      }

      await fetchLoyaltyCard();
      return true;
    } catch (error) {
      console.error('Error recording loyalty usage:', error);
      return false;
    }
  };

  const createCheckout = async (customerEmail?: string) => {
    if (!customerId || !centroId) return null;

    try {
      const { data, error } = await supabase.functions.invoke('create-loyalty-checkout', {
        body: { customer_id: customerId, centro_id: centroId, customer_email: customerEmail },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating loyalty checkout:', error);
      return null;
    }
  };

  const activateWithBonifico = async () => {
    if (!customerId || !centroId) return false;

    try {
      // Create and immediately activate card for bonifico payment
      const { data: newCard, error } = await supabase
        .from('loyalty_cards')
        .insert({
          customer_id: customerId,
          centro_id: centroId,
          status: 'active',
          payment_method: 'bonifico',
          bonifico_confirmed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Deduct 5% platform commission from Centro's credit balance
      const platformCommission = 1.50;
      
      const { data: centro } = await supabase
        .from('centri_assistenza')
        .select('credit_balance, credit_warning_threshold')
        .eq('id', centroId)
        .single();

      if (centro) {
        const newBalance = (centro.credit_balance || 0) - platformCommission;
        
        await supabase
          .from('centri_assistenza')
          .update({
            credit_balance: newBalance,
            last_credit_update: new Date().toISOString(),
            payment_status: newBalance <= 0 ? 'suspended' : 
                           newBalance < (centro.credit_warning_threshold || 50) ? 'warning' : 'good_standing'
          })
          .eq('id', centroId);

        await supabase
          .from('credit_transactions')
          .insert({
            entity_type: 'centro',
            entity_id: centroId,
            transaction_type: 'loyalty_commission',
            amount: -platformCommission,
            balance_after: newBalance,
            description: 'Commissione 5% tessera fedeltà #' + newCard.id.substring(0, 8),
          });
      }

      await fetchLoyaltyCard();
      return true;
    } catch (error) {
      console.error('Error activating loyalty card with bonifico:', error);
      return false;
    }
  };

  return {
    card,
    usages,
    loading,
    benefits,
    recordUsage,
    createCheckout,
    activateWithBonifico,
    refresh: fetchLoyaltyCard,
  };
}

// Hook for customer dashboard - fetch all customer's loyalty cards
export function useCustomerLoyaltyCards(customerEmail: string | null) {
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      if (!customerEmail) {
        setLoading(false);
        return;
      }

      try {
        // First get customer ID from email
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', customerEmail)
          .maybeSingle();

        if (!customer) {
          setCards([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('loyalty_cards')
          .select(`
            *,
            centro:centri_assistenza(business_name, logo_url, phone, email)
          `)
          .eq('customer_id', customer.id)
          .eq('status', 'active')
          .order('activated_at', { ascending: false });

        if (error) throw error;
        setCards(data || []);
      } catch (error) {
        console.error('Error fetching customer loyalty cards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [customerEmail]);

  return { cards, loading };
}
