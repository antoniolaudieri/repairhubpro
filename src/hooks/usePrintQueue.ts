import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RepairLabelData {
  repairId: string;
  customerName: string;
  deviceBrand: string;
  deviceModel: string;
  deviceType: string;
  issue: string;
  date: string;
  storageSlot?: string;
  trackingUrl?: string;
}

interface DeviceLabelData {
  deviceId: string;
  deviceType: string;
  brand: string;
  model: string;
  condition: string;
  price: number;
}

interface ShelfLabelData {
  partName: string;
  partCode: string;
  location?: string;
  quantity?: number;
}

type LabelData = RepairLabelData | DeviceLabelData | ShelfLabelData;

export function usePrintQueue(centroId: string | null) {
  const addToPrintQueue = useCallback(async (
    labelType: 'repair' | 'device' | 'shelf',
    labelData: LabelData,
    options?: {
      copies?: number;
      priority?: number;
      labelXml?: string;
    }
  ): Promise<boolean> => {
    if (!centroId) {
      toast.error('Centro non trovato');
      return false;
    }

    try {
      const { error } = await supabase
        .from('print_queue')
        .insert([{
          centro_id: centroId,
          label_type: labelType,
          label_data: labelData as any,
          label_xml: options?.labelXml || null,
          copies: options?.copies || 1,
          priority: options?.priority || 0,
        }]);

      if (error) throw error;

      toast.success('Etichetta aggiunta alla coda di stampa');
      return true;
    } catch (error: any) {
      console.error('Error adding to print queue:', error);
      toast.error('Errore nell\'aggiunta alla coda di stampa');
      return false;
    }
  }, [centroId]);

  const addRepairLabel = useCallback((
    data: RepairLabelData,
    copies?: number
  ) => {
    return addToPrintQueue('repair', data, { copies });
  }, [addToPrintQueue]);

  const addDeviceLabel = useCallback((
    data: DeviceLabelData,
    copies?: number
  ) => {
    return addToPrintQueue('device', data, { copies });
  }, [addToPrintQueue]);

  const addShelfLabel = useCallback((
    data: ShelfLabelData,
    copies?: number
  ) => {
    return addToPrintQueue('shelf', data, { copies });
  }, [addToPrintQueue]);

  return {
    addToPrintQueue,
    addRepairLabel,
    addDeviceLabel,
    addShelfLabel,
  };
}
