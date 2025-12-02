import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BookOpen, 
  Search, 
  Clock, 
  Wrench,
  CheckCircle2,
  Loader2,
  Smartphone,
  Laptop,
  Tablet,
  Watch,
  Gamepad2,
  Headphones
} from "lucide-react";

interface SavedGuide {
  id: string;
  device_type: string;
  device_brand: string;
  device_model: string;
  issue_category: string;
  usage_count: number;
  created_at: string;
  guide_data: {
    diagnosis?: {
      problem?: string;
      severity?: string;
    };
    overview?: {
      difficulty?: string;
      estimatedTime?: string;
    };
    steps?: Array<{
      stepNumber: number;
      title: string;
      imageUrl?: string;
    }>;
  };
}

interface SelectSavedGuideDialogProps {
  deviceType?: string;
  deviceBrand?: string;
  onSelectGuide: (guide: SavedGuide) => void;
}

const deviceTypeIcons: Record<string, typeof Smartphone> = {
  smartphone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  smartwatch: Watch,
  console: Gamepad2,
  accessory: Headphones,
};

const issueCategoryLabels: Record<string, string> = {
  screen_display: "Schermo/Display",
  battery: "Batteria",
  charging: "Ricarica",
  audio: "Audio",
  camera: "Fotocamera",
  connectivity: "Connettività",
  software: "Software",
  physical: "Danno Fisico",
  other: "Altro",
};

export default function SelectSavedGuideDialog({
  deviceType,
  deviceBrand,
  onSelectGuide,
}: SelectSavedGuideDialogProps) {
  const [open, setOpen] = useState(false);
  const [guides, setGuides] = useState<SavedGuide[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      loadGuides();
    }
  }, [open]);

  const loadGuides = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("repair_guides")
        .select("*")
        .order("usage_count", { ascending: false });

      if (error) throw error;

      const typedGuides = (data || []).map((guide) => ({
        ...guide,
        guide_data: guide.guide_data as SavedGuide["guide_data"],
      }));

      setGuides(typedGuides);

      // Extract unique brands and categories
      const uniqueBrands = [...new Set(typedGuides.map((g) => g.device_brand))];
      const uniqueCategories = [...new Set(typedGuides.map((g) => g.issue_category))];
      setBrands(uniqueBrands);
      setCategories(uniqueCategories);

      // Pre-filter by device brand if provided
      if (deviceBrand) {
        setFilterBrand(deviceBrand.toLowerCase());
      }
    } catch (error) {
      console.error("Error loading guides:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGuides = guides.filter((guide) => {
    const matchesSearch =
      search === "" ||
      guide.device_brand.toLowerCase().includes(search.toLowerCase()) ||
      guide.device_model.toLowerCase().includes(search.toLowerCase()) ||
      guide.issue_category.toLowerCase().includes(search.toLowerCase());

    const matchesBrand =
      filterBrand === "all" ||
      guide.device_brand.toLowerCase() === filterBrand.toLowerCase();

    const matchesCategory =
      filterCategory === "all" || guide.issue_category === filterCategory;

    return matchesSearch && matchesBrand && matchesCategory;
  });

  const handleSelect = (guide: SavedGuide) => {
    onSelectGuide(guide);
    setOpen(false);
  };

  const DeviceIcon = deviceTypeIcons[deviceType || "smartphone"] || Smartphone;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Usa Guida Salvata</span>
          <span className="sm:hidden">Guide</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Seleziona Guida Salvata
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 pb-4 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per brand, modello..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterBrand} onValueChange={setFilterBrand}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i brand</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand} value={brand.toLowerCase()}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le categorie</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {issueCategoryLabels[cat] || cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Guide List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredGuides.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">Nessuna guida trovata</p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {filteredGuides.map((guide) => {
                const GuideIcon = deviceTypeIcons[guide.device_type] || Smartphone;
                return (
                  <div
                    key={guide.id}
                    onClick={() => handleSelect(guide)}
                    className="p-4 rounded-xl border bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon/Preview */}
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
                        {guide.guide_data?.steps?.[0]?.imageUrl ? (
                          <img
                            src={guide.guide_data.steps[0].imageUrl}
                            alt=""
                            className="h-full w-full object-cover rounded-xl"
                          />
                        ) : (
                          <GuideIcon className="h-6 w-6 text-primary" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">
                            {guide.device_brand} {guide.device_model}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {issueCategoryLabels[guide.issue_category] || guide.issue_category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                          {guide.guide_data?.diagnosis?.problem || "Guida di riparazione"}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            {guide.guide_data?.steps?.length || 0} step
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {guide.guide_data?.overview?.estimatedTime || "N/A"}
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            Usata {guide.usage_count}x
                          </span>
                        </div>
                      </div>

                      {/* Select indicator */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Badge className="bg-primary">Seleziona</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="pt-4 border-t text-sm text-muted-foreground text-center">
          {filteredGuides.length} guide disponibili
        </div>
      </DialogContent>
    </Dialog>
  );
}
