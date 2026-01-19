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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Importa Prodotto da Link
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL Input */}
          <div className="space-y-2">
            <Label>URL del prodotto (Amazon, eBay, ecc.)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://www.amazon.it/dp/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
              />
              <Button 
                onClick={handleScrape} 
                disabled={isLoading || !url.trim()}
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
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Errore</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Product Preview */}
          {product && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-4">
                {/* Product Header */}
                <div className="flex gap-4">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-20 h-20 object-contain rounded-lg bg-white border shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-clamp-2">{product.title}</h3>
                    {product.brand && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {product.brand}
                      </Badge>
                    )}
                    {product.price > 0 && (
                      <p className="text-lg font-bold text-primary mt-1">
                        {product.currency}{product.price.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Source Link */}
                <a
                  href={product.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Vedi prodotto originale
                </a>

                {/* Editable Fields */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="space-y-2">
                    <Label>Descrizione nel preventivo</Label>
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      placeholder="Descrizione del prodotto..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Prezzo (€)</Label>
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editedPrice}
                          onChange={(e) => setEditedPrice(e.target.value)}
                          className="pl-9"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Quantità</Label>
                      <Input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="flex-1"
                  >
                    Cerca altro
                  </Button>
                  <Button
                    onClick={handleAddToQuote}
                    className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aggiungi
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Text */}
          {!product && !error && !isLoading && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">Come funziona:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Incolla il link del prodotto da un sito e-commerce</li>
                      <li>I dati verranno estratti automaticamente</li>
                      <li>Modifica il prezzo se necessario</li>
                      <li>Aggiungi il prodotto al preventivo</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
