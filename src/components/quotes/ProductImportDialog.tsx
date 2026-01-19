import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Link2, 
  Loader2, 
  Package, 
  Euro, 
  Check, 
  AlertCircle,
  ExternalLink,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { productScraperApi, ScrapedProduct } from "@/lib/api/product-scraper";

interface ProductImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductImport: (product: {
    description: string;
    quantity: number;
    unitPrice: number;
    imageUrl?: string;
    sourceUrl?: string;
  }) => void;
}

export function ProductImportDialog({
  open,
  onOpenChange,
  onProductImport,
}: ProductImportDialogProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [product, setProduct] = useState<ScrapedProduct | null>(null);
  const [editedPrice, setEditedPrice] = useState<string>("");
  const [editedDescription, setEditedDescription] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  const handleScrape = async () => {
    if (!url.trim()) {
      toast.error("Inserisci un URL valido");
      return;
    }

    setIsLoading(true);
    setError(null);
    setProduct(null);

    try {
      const response = await productScraperApi.scrapeProduct(url);

      if (response.success && response.product) {
        setProduct(response.product);
        setEditedPrice(response.product.price.toFixed(2));
        setEditedDescription(response.product.title);
        toast.success("Prodotto importato con successo");
      } else {
        setError(response.error || "Impossibile estrarre i dati del prodotto");
        toast.error(response.error || "Errore nell'importazione");
      }
    } catch (err: any) {
      console.error("Scrape error:", err);
      setError(err.message || "Errore di connessione");
      toast.error("Errore di connessione. Verifica che il connettore Firecrawl sia attivo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToQuote = () => {
    const price = parseFloat(editedPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Inserisci un prezzo valido");
      return;
    }

    if (!editedDescription.trim()) {
      toast.error("La descrizione è obbligatoria");
      return;
    }

    onProductImport({
      description: editedDescription.trim(),
      quantity,
      unitPrice: price,
      imageUrl: product?.imageUrl,
      sourceUrl: product?.sourceUrl,
    });

    // Reset and close
    setUrl("");
    setProduct(null);
    setEditedPrice("");
    setEditedDescription("");
    setQuantity(1);
    setError(null);
    onOpenChange(false);
    toast.success("Prodotto aggiunto al preventivo");
  };

  const handleReset = () => {
    setProduct(null);
    setEditedPrice("");
    setEditedDescription("");
    setQuantity(1);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[100]" style={{ position: 'fixed' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Importa Prodotto da Link
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL Input */}
          <div className="space-y-2">
            <Label>URL del prodotto</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://www.amazon.it/dp/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                className="text-sm"
              />
              <Button 
                onClick={handleScrape} 
                disabled={isLoading || !url.trim()}
                size="sm"
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Importa"
                )}
              </Button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="p-3 rounded-lg border border-destructive/50 bg-destructive/5">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* Product Preview - Compact */}
          {product && (
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
              {/* Product Info Row */}
              <div className="flex gap-3">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-14 h-14 object-contain rounded bg-white border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded bg-muted flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{product.title}</p>
                  {product.price > 0 && (
                    <p className="text-sm font-bold text-primary mt-0.5">
                      €{product.price.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              {/* Editable Fields - Compact Grid */}
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Descrizione</Label>
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Descrizione..."
                    rows={2}
                    className="text-sm mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Prezzo (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editedPrice}
                      onChange={(e) => setEditedPrice(e.target.value)}
                      className="text-sm mt-1"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Quantità</Label>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="text-sm mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={handleReset} className="flex-1">
                  Cerca altro
                </Button>
                <Button size="sm" onClick={handleAddToQuote} className="flex-1">
                  <Check className="h-4 w-4 mr-1" />
                  Aggiungi
                </Button>
              </div>
            </div>
          )}

          {/* Help Text - Compact */}
          {!product && !error && !isLoading && (
            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <p className="font-medium mb-1">Incolla un link da Amazon, eBay o altri siti.</p>
              <p>I dati verranno estratti automaticamente.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
