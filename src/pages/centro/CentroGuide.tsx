import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Search,
  Filter,
  Smartphone,
  Laptop,
  Tablet,
  Watch,
  Headphones,
  Gamepad2,
  Clock,
  Wrench,
  TrendingUp,
  Trash2,
  Eye,
  Package,
  CheckCircle2,
  RefreshCw,
  Pencil
} from "lucide-react";
import EditGuideDialog from "@/components/repair/EditGuideDialog";
import CreateGuideDialog from "@/components/repair/CreateGuideDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RepairGuide {
  id: string;
  device_type: string;
  device_brand: string;
  device_model: string;
  issue_category: string;
  guide_data: {
    diagnosis?: { problem: string; severity?: string; cause?: string };
    overview?: { difficulty: string; estimatedTime: string; partsNeeded?: string[]; toolsNeeded?: string[] };
    steps?: Array<{ title: string; imageUrl?: string }>;
  };
  usage_count: number;
  created_at: string;
}

const deviceTypeIcons: Record<string, React.ReactNode> = {
  smartphone: <Smartphone className="h-5 w-5" />,
  tablet: <Tablet className="h-5 w-5" />,
  laptop: <Laptop className="h-5 w-5" />,
  smartwatch: <Watch className="h-5 w-5" />,
  cuffie: <Headphones className="h-5 w-5" />,
  console: <Gamepad2 className="h-5 w-5" />,
};

const issueCategoryLabels: Record<string, string> = {
  screen_display: "Schermo/Display",
  battery: "Batteria",
  charging_port: "Porta Ricarica",
  camera: "Fotocamera",
  audio: "Audio/Speaker",
  touch: "Touch/Digitizer",
  back_cover: "Cover Posteriore",
  buttons: "Pulsanti",
  software: "Software",
  water_damage: "Danni da Acqua",
  general_repair: "Riparazione Generica",
};

const difficultyColors: Record<string, string> = {
  "Facile": "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  "Medio": "bg-amber-500/10 text-amber-600 border-amber-500/30",
  "Difficile": "bg-orange-500/10 text-orange-600 border-orange-500/30",
  "Esperto": "bg-red-500/10 text-red-600 border-red-500/30",
};

export default function CentroGuide() {
  const [guides, setGuides] = useState<RepairGuide[]>([]);
  const [filteredGuides, setFilteredGuides] = useState<RepairGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedGuide, setSelectedGuide] = useState<RepairGuide | null>(null);
  const [editingGuide, setEditingGuide] = useState<RepairGuide | null>(null);

  const uniqueBrands = [...new Set(guides.map(g => g.device_brand))].sort();
  const uniqueCategories = [...new Set(guides.map(g => g.issue_category))].sort();

  useEffect(() => {
    loadGuides();
  }, []);

  useEffect(() => {
    filterGuides();
  }, [guides, searchTerm, brandFilter, categoryFilter]);

  const loadGuides = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("repair_guides")
        .select("*")
        .order("usage_count", { ascending: false });

      if (error) throw error;
      
      const parsedGuides = (data || []).map(guide => ({
        ...guide,
        guide_data: typeof guide.guide_data === 'string' 
          ? JSON.parse(guide.guide_data) 
          : guide.guide_data
      }));
      
      setGuides(parsedGuides);
    } catch (error) {
      console.error("Error loading guides:", error);
      toast.error("Errore nel caricamento guide");
    } finally {
      setLoading(false);
    }
  };

  const filterGuides = () => {
    let filtered = [...guides];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(g =>
        g.device_brand.toLowerCase().includes(term) ||
        g.device_model.toLowerCase().includes(term)
      );
    }
    if (brandFilter !== "all") filtered = filtered.filter(g => g.device_brand === brandFilter);
    if (categoryFilter !== "all") filtered = filtered.filter(g => g.issue_category === categoryFilter);
    setFilteredGuides(filtered);
  };

  const deleteGuide = async (guideId: string) => {
    try {
      const { error } = await supabase.from("repair_guides").delete().eq("id", guideId);
      if (error) throw error;
      setGuides(guides.filter(g => g.id !== guideId));
      toast.success("Guida eliminata");
    } catch (error) {
      toast.error("Errore eliminazione guida");
    }
  };

  const totalUsage = guides.reduce((sum, g) => sum + g.usage_count, 0);

  return (
    <CentroLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Libreria Guide</h1>
              <p className="text-muted-foreground text-sm">
                {guides.length} guide • {totalUsage} utilizzi
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <CreateGuideDialog onCreated={loadGuides} />
            <Button onClick={loadGuides} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4 text-center">
            <BookOpen className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{guides.length}</p>
            <p className="text-xs text-muted-foreground">Guide</p>
          </Card>
          <Card className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
            <p className="text-2xl font-bold">{totalUsage}</p>
            <p className="text-xs text-muted-foreground">Utilizzi</p>
          </Card>
          <Card className="p-4 text-center">
            <Smartphone className="h-5 w-5 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{uniqueBrands.length}</p>
            <p className="text-xs text-muted-foreground">Brand</p>
          </Card>
          <Card className="p-4 text-center">
            <Wrench className="h-5 w-5 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">{uniqueCategories.length}</p>
            <p className="text-xs text-muted-foreground">Tipi</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtri</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i Brand</SelectItem>
                {uniqueBrands.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                {uniqueCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{issueCategoryLabels[cat] || cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Guides Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Caricamento...</p>
          </div>
        ) : filteredGuides.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessuna guida</h3>
            <p className="text-muted-foreground text-sm">Le guide verranno salvate automaticamente.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredGuides.map((guide, index) => {
                const difficulty = guide.guide_data?.overview?.difficulty || "Medio";
                const stepsCount = guide.guide_data?.steps?.length || 0;
                
                return (
                  <motion.div
                    key={guide.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-all">
                      <div className="relative h-28 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        {deviceTypeIcons[guide.device_type.toLowerCase()] || <Smartphone className="h-10 w-10 text-primary/30" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="text-white font-bold truncate">{guide.device_brand} {guide.device_model}</p>
                          <p className="text-white/80 text-xs">{guide.device_type}</p>
                        </div>
                        <Badge className={`absolute top-3 right-3 ${difficultyColors[difficulty]}`}>{difficulty}</Badge>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="gap-1">
                            <Wrench className="h-3 w-3" />
                            {issueCategoryLabels[guide.issue_category] || guide.issue_category}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <TrendingUp className="h-3 w-3" />{guide.usage_count}x
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{stepsCount} step</span>
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{guide.guide_data?.overview?.estimatedTime || "N/A"}</span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedGuide(guide)}>
                            <Eye className="h-3.5 w-3.5 mr-1" />Dettagli
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingGuide(guide)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Elimina guida?</AlertDialogTitle>
                                <AlertDialogDescription>Questa azione non può essere annullata.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteGuide(guide.id)}>Elimina</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {editingGuide && (
          <EditGuideDialog
            guide={editingGuide}
            open={!!editingGuide}
            onOpenChange={() => setEditingGuide(null)}
            onSaved={(updated) => {
              setGuides(guides.map(g => g.id === updated.id ? updated : g));
              setEditingGuide(null);
            }}
          />
        )}
      </div>
    </CentroLayout>
  );
}
