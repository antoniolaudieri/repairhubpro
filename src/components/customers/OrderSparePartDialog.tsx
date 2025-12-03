import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShoppingCart, Search, Plus, Minus, Package, ExternalLink, Loader2, Globe } from "lucide-react";

interface SparePart {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  model_compatibility: string | null;
  stock_quantity: number;
  selling_price: number | null;
  cost: number | null;
  image_url: string | null;
  supplier_code: string | null;
}

interface UtopyaProduct {
  name: string;
  sku: string;
  price: string | null;
  priceNumeric: number;
  image: string;
  url: string;
  inStock: boolean;
}

interface OrderItem {
  spare_part_id: string | null;
  product_name: string;
  quantity: number;
  unit_cost: number;
  isUtopya?: boolean;
  utopyaUrl?: string;
}

interface Props {
  customerId: string;
  customerName: string;
  trigger?: React.ReactNode;
  onOrderCreated?: () => void;
}

export function OrderSparePartDialog({ customerId, customerName, trigger, onOrderCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [filteredParts, setFilteredParts] = useState<SparePart[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [utopyaQuery, setUtopyaQuery] = useState("");
  const [utopyaResults, setUtopyaResults] = useState<UtopyaProduct[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchingUtopya, setSearchingUtopya] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      loadSpareParts();
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredParts(
        spareParts.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query) ||
            p.brand?.toLowerCase().includes(query) ||
            p.model_compatibility?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredParts(spareParts);
    }
  }, [searchQuery, spareParts]);

  const loadSpareParts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("spare_parts")
        .select("*")
        .order("name");

      if (error) throw error;
      setSpareParts(data || []);
      setFilteredParts(data || []);
    } catch (error: any) {
      toast.error("Errore nel caricamento ricambi");
    } finally {
      setLoading(false);
    }
  };

  const searchUtopya = async () => {
    if (!utopyaQuery.trim()) return;
    
    setSearchingUtopya(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-utopya", {
        body: { searchQuery: utopyaQuery },
      });

      if (error) throw error;
      setUtopyaResults(data?.products || []);
      
      if (!data?.products?.length) {
        toast.info("Nessun prodotto trovato su Utopya");
      }
    } catch (error: any) {
      console.error("Utopya search error:", error);
      toast.error("Errore nella ricerca Utopya");
    } finally {
      setSearchingUtopya(false);
    }
  };

  const addToCart = (part: SparePart) => {
    const existing = cart.find((item) => item.spare_part_id === part.id && !item.isUtopya);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.spare_part_id === part.id && !item.isUtopya
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          spare_part_id: part.id,
          product_name: part.name,
          quantity: 1,
          unit_cost: part.selling_price || part.cost || 0,
        },
      ]);
    }
  };

  const addUtopyaToCart = (product: UtopyaProduct) => {
    const key = `utopya-${product.sku}`;
    const existing = cart.find((item) => item.spare_part_id === key);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.spare_part_id === key
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          spare_part_id: key,
          product_name: product.name,
          quantity: 1,
          unit_cost: product.priceNumeric || 0,
          isUtopya: true,
          utopyaUrl: product.url || undefined,
        },
      ]);
    }
  };

  const removeFromCart = (partId: string) => {
    const existing = cart.find((item) => item.spare_part_id === partId);
    if (existing && existing.quantity > 1) {
      setCart(
        cart.map((item) =>
          item.spare_part_id === partId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      );
    } else {
      setCart(cart.filter((item) => item.spare_part_id !== partId));
    }
  };

  const getCartQuantity = (partId: string) => {
    return cart.find((item) => item.spare_part_id === partId)?.quantity || 0;
  };

  const getUtopyaCartQuantity = (sku: string) => {
    return cart.find((item) => item.spare_part_id === `utopya-${sku}`)?.quantity || 0;
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.unit_cost * item.quantity, 0);

  const createOrder = async () => {
    if (cart.length === 0) {
      toast.error("Aggiungi almeno un prodotto");
      return;
    }

    setCreating(true);
    try {
      // Generate order number
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          supplier: "interno",
          status: "pending",
          total_amount: totalAmount,
          customer_id: customerId,
          notes: `Ordine per cliente: ${customerName}`,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        spare_part_id: item.isUtopya ? null : item.spare_part_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        product_code: item.isUtopya ? item.spare_part_id?.replace("utopya-", "") : null,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success("Ordine creato con successo");
      setCart([]);
      setOpen(false);
      onOrderCreated?.();
    } catch (error: any) {
      toast.error(error.message || "Errore nella creazione ordine");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm">
            <ShoppingCart className="h-3.5 w-3.5 mr-1" />
            Ordina Ricambi
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4" />
            Ordina Ricambi per {customerName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="inventory" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-3 mt-3 grid grid-cols-2">
            <TabsTrigger value="inventory" className="text-xs">
              <Package className="h-3.5 w-3.5 mr-1.5" />
              Inventario
            </TabsTrigger>
            <TabsTrigger value="utopya" className="text-xs">
              <Globe className="h-3.5 w-3.5 mr-1.5" />
              Utopya
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="flex-1 flex flex-col overflow-hidden m-0">
            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca ricambi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Parts List */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredParts.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nessun ricambio trovato</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredParts.map((part) => {
                    const inCart = getCartQuantity(part.id);
                    return (
                      <div
                        key={part.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                          inCart > 0 ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
                        }`}
                      >
                        {/* Image */}
                        {part.image_url ? (
                          <img
                            src={part.image_url}
                            alt={part.name}
                            className="h-12 w-12 object-contain rounded-md border bg-background"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-md border bg-muted/50 flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{part.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {part.category}
                            </Badge>
                            {part.brand && (
                              <span className="text-[10px] text-muted-foreground">{part.brand}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-semibold text-accent">
                              €{(part.selling_price || part.cost || 0).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Stock: {part.stock_quantity}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                          {inCart > 0 ? (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => removeFromCart(part.id)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-sm font-medium">{inCart}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => addToCart(part)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => addToCart(part)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Aggiungi
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="utopya" className="flex-1 flex flex-col overflow-hidden m-0">
            {/* Utopya Search */}
            <div className="p-3 border-b">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca su Utopya..."
                    value={utopyaQuery}
                    onChange={(e) => setUtopyaQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchUtopya()}
                    className="pl-9 h-9"
                  />
                </div>
                <Button 
                  onClick={searchUtopya} 
                  disabled={searchingUtopya || !utopyaQuery.trim()}
                  size="sm"
                  className="h-9"
                >
                  {searchingUtopya ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Utopya Results */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
              {searchingUtopya ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : utopyaResults.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Cerca prodotti su Utopya
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {utopyaResults.map((product) => {
                    const inCart = getUtopyaCartQuantity(product.sku);
                    return (
                      <div
                        key={product.sku}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                          inCart > 0 ? "bg-orange-500/5 border-orange-500/20" : "hover:bg-muted/50"
                        }`}
                      >
                        {/* Image */}
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-12 w-12 object-contain rounded-md border bg-background"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-md border bg-muted/50 flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge className="text-[10px] px-1.5 py-0 bg-orange-500/10 text-orange-600 border-orange-500/20">
                              Utopya
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{product.sku}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {product.priceNumeric > 0 ? (
                              <span className="text-sm font-semibold text-accent">
                                €{product.priceNumeric.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Prezzo N/D</span>
                            )}
                            {product.url && (
                              <a
                                href={product.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="h-2.5 w-2.5" />
                                Vedi
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                          {inCart > 0 ? (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => removeFromCart(`utopya-${product.sku}`)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-sm font-medium">{inCart}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => addUtopyaToCart(product)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => addUtopyaToCart(product)}
                              disabled={false}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Aggiungi
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="border-t p-3 bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {cart.length} prodott{cart.length === 1 ? "o" : "i"} nel carrello
              </span>
              <span className="text-lg font-bold text-accent">€{totalAmount.toFixed(2)}</span>
            </div>
            <Button 
              onClick={createOrder} 
              disabled={creating} 
              className="w-full h-9"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creazione...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Crea Ordine
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
