import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ExternalLink, ShoppingCart, Loader2, Package, AlertCircle, LogIn, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UtopyaProduct {
  name: string;
  price: string;
  priceNumeric: number;
  image: string;
  url: string;
  sku: string;
  brand: string;
  inStock: boolean;
  requiresLogin: boolean;
}

interface UtopyaPriceLookupProps {
  initialSearch?: string;
  trigger?: React.ReactNode;
  onSelectProduct?: (product: UtopyaProduct) => void;
}

export const UtopyaPriceLookup = ({ initialSearch = '', trigger, onSelectProduct }: UtopyaPriceLookupProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [products, setProducts] = useState<UtopyaProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchUrl, setSearchUrl] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Inserisci un termine di ricerca');
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('scrape-utopya', {
        body: { searchQuery: searchQuery.trim() }
      });

      if (error) throw error;

      setProducts(data.products || []);
      setSearchUrl(data.searchUrl || '');
      setIsAuthenticated(data.isAuthenticated || false);
      
      if (data.products?.length === 0) {
        toast.info('Nessun prodotto trovato su Utopya');
      } else {
        const authStatus = data.isAuthenticated ? '(con prezzi)' : '(senza prezzi)';
        toast.success(`Trovati ${data.products.length} prodotti ${authStatus}`);
      }
    } catch (error) {
      console.error('Error searching Utopya:', error);
      toast.error('Errore nella ricerca su Utopya');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Search className="h-4 w-4" />
            Cerca su Utopya
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span>Prezzi Utopya in Tempo Reale</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca ricambio (es. Display iPhone 15 Pro Max)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading} className="gap-2">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Cerca
            </Button>
          </div>

          {/* Status Banner */}
          {products.length > 0 && (
            <div className={`flex items-center gap-3 p-3 rounded-lg ${isAuthenticated ? 'bg-green-500/10 border border-green-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
              {isAuthenticated ? (
                <>
                  <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-700">Connesso a Utopya</p>
                    <p className="text-xs text-green-600/80">Prezzi aggiornati in tempo reale</p>
                  </div>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-700">I prezzi richiedono login su Utopya</p>
                    <p className="text-xs text-amber-600/80">Configura le credenziali per vedere i prezzi</p>
                  </div>
                </>
              )}
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-lg font-bold text-primary">{products.length}</span>
                <span className="text-xs text-muted-foreground">prodotti</span>
              </div>
            </div>
          )}

          {/* Products List */}
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Ricerca in corso su Utopya...</p>
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
                {products.map((product, index) => (
                  <Card 
                    key={index} 
                    className="p-3 hover:shadow-md transition-all hover:border-primary/30 cursor-pointer group"
                    onClick={() => onSelectProduct?.(product)}
                  >
                    <div className="flex gap-3">
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-20 h-20 object-contain rounded-lg bg-muted"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {product.brand && (
                              <Badge variant="secondary" className="text-xs mb-1">
                                {product.brand}
                              </Badge>
                            )}
                            <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                              {product.name}
                            </h4>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            {product.sku && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {product.sku}
                              </span>
                            )}
                            {!product.requiresLogin && product.priceNumeric > 0 && (
                              <span className="text-sm font-bold text-green-600">
                                {product.price}
                              </span>
                            )}
                          </div>
                          <Button 
                            size="sm" 
                            variant="default"
                            className="gap-1 bg-orange-500 hover:bg-orange-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(product.url, '_blank');
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                            {product.requiresLogin ? 'Vedi prezzo' : 'Acquista'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : hasSearched ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <AlertCircle className="h-8 w-8" />
                <p>Nessun prodotto trovato</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(searchUrl, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Apri ricerca su Utopya
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <Search className="h-8 w-8" />
                <p>Inserisci un termine di ricerca per vedere i prezzi</p>
              </div>
            )}
          </ScrollArea>

          {/* Footer Actions */}
          {searchUrl && (
            <div className="flex justify-between items-center pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                I prezzi sono aggiornati in tempo reale da utopya.it
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(searchUrl, '_blank')}
                className="gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Vai su Utopya
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
