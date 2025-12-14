import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, RefreshCw, Check, Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Variant {
  title: string;
  description: string;
}

interface AITextGeneratorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (title: string, description: string) => void;
  companyName?: string;
}

const businessTypes = [
  { id: 'bar', label: '☕ Bar/Caffetteria', emoji: '☕' },
  { id: 'ristorante', label: '🍕 Ristorante/Pizzeria', emoji: '🍕' },
  { id: 'negozio', label: '🛍️ Negozio/Retail', emoji: '🛍️' },
  { id: 'parrucchiere', label: '💇 Parrucchiere/Estetista', emoji: '💇' },
  { id: 'palestra', label: '💪 Palestra/Fitness', emoji: '💪' },
  { id: 'farmacia', label: '💊 Farmacia/Salute', emoji: '💊' },
  { id: 'auto', label: '🚗 Auto/Officina', emoji: '🚗' },
  { id: 'immobiliare', label: '🏠 Immobiliare', emoji: '🏠' },
  { id: 'tech', label: '📱 Tecnologia/Elettronica', emoji: '📱' },
  { id: 'altro', label: '✨ Altro', emoji: '✨' },
];

const promotionTypes = [
  { id: 'sconto', label: '💰 Sconto %', emoji: '💰' },
  { id: 'offerta', label: '🎁 Offerta Speciale', emoji: '🎁' },
  { id: 'apertura', label: '🆕 Nuova Apertura', emoji: '🆕' },
  { id: 'evento', label: '🎉 Evento', emoji: '🎉' },
  { id: 'stagionale', label: '🌸 Promozione Stagionale', emoji: '🌸' },
  { id: 'fedelta', label: '❤️ Fedeltà Clienti', emoji: '❤️' },
  { id: 'lancio', label: '🚀 Lancio Prodotto', emoji: '🚀' },
  { id: 'flash', label: '⚡ Vendita Flash', emoji: '⚡' },
];

export function AITextGeneratorDialog({ open, onClose, onSelect, companyName }: AITextGeneratorDialogProps) {
  const [step, setStep] = useState<'select' | 'loading' | 'results'>('select');
  const [businessType, setBusinessType] = useState('');
  const [promotionType, setPromotionType] = useState('');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);

  const resetDialog = () => {
    setStep('select');
    setBusinessType('');
    setPromotionType('');
    setVariants([]);
    setSelectedVariant(null);
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  const generateTexts = async () => {
    if (!businessType || !promotionType) {
      toast.error('Seleziona tipo attività e promozione');
      return;
    }

    setStep('loading');

    try {
      const { data, error } = await supabase.functions.invoke('generate-ad-text', {
        body: { businessType, promotionType, companyName }
      });

      if (error) throw error;

      if (data?.variants && Array.isArray(data.variants)) {
        setVariants(data.variants);
        setStep('results');
      } else {
        throw new Error('Formato risposta non valido');
      }
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast.error('Errore nella generazione. Riprova! 😕');
      setStep('select');
    }
  };

  const handleApply = () => {
    if (selectedVariant !== null && variants[selectedVariant]) {
      onSelect(variants[selectedVariant].title, variants[selectedVariant].description);
      toast.success('✨ Testo applicato!');
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Wand2 className="h-5 w-5 text-white" />
            </div>
            <span>✨ Genera con AI</span>
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* Business Type */}
              <div className="space-y-2">
                <Label className="text-base">🏪 Tipo di Attività</Label>
                <div className="grid grid-cols-2 gap-2">
                  {businessTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setBusinessType(type.id)}
                      className={`p-3 rounded-xl text-left text-sm font-medium transition-all border-2 ${
                        businessType === type.id
                          ? 'border-primary bg-primary/10 shadow-md'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Promotion Type */}
              <div className="space-y-2">
                <Label className="text-base">🎯 Tipo di Promozione</Label>
                <div className="grid grid-cols-2 gap-2">
                  {promotionTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setPromotionType(type.id)}
                      className={`p-3 rounded-xl text-left text-sm font-medium transition-all border-2 ${
                        promotionType === type.id
                          ? 'border-primary bg-primary/10 shadow-md'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={generateTexts} 
                className="w-full h-12 text-base bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                disabled={!businessType || !promotionType}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Genera Testi Magici ✨
              </Button>
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center space-y-4"
            >
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" />
                <div className="absolute inset-2 bg-background rounded-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-lg">🪄 Magia in corso...</p>
                <p className="text-sm text-muted-foreground">L'AI sta creando testi perfetti per te</p>
              </div>
            </motion.div>
          )}

          {step === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground text-center">
                🎉 Ecco 3 varianti! Scegli quella che preferisci:
              </p>

              <div className="space-y-3">
                {variants.map((variant, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => setSelectedVariant(idx)}
                    className={`w-full p-4 rounded-xl text-left transition-all border-2 ${
                      selectedVariant === idx
                        ? 'border-primary bg-primary/10 shadow-lg ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base truncate">{variant.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{variant.description}</p>
                      </div>
                      {selectedVariant === idx && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="p-1 bg-primary rounded-full"
                        >
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={generateTexts}
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rigenera
                </Button>
                <Button 
                  onClick={handleApply}
                  disabled={selectedVariant === null}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Usa Questo ✨
                </Button>
              </div>

              <Button 
                variant="ghost" 
                onClick={() => setStep('select')}
                className="w-full text-muted-foreground"
              >
                ← Cambia selezione
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
