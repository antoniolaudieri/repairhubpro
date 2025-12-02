import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "@/components/ui/use-toast";
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
  Sparkles,
  Package,
  AlertCircle,
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
    diagnosis?: {
      problem: string;
      severity: string;
    };
    overview?: {
      difficulty: string;
      estimatedTime: string;
      partsNeeded?: string[];
      toolsNeeded?: string[];
    };
    steps?: Array<{
      title: string;
      imageUrl?: string;
    }>;
  };
  usage_count: number;
  created_at: string;
  updated_at: string;
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
  sim_slot: "Slot SIM",
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

export default function RepairGuides() {
  const navigate = useNavigate();
  const [guides, setGuides] = useState<RepairGuide[]>([]);
  const [filteredGuides, setFilteredGuides] = useState<RepairGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>("all");
  const [selectedGuide, setSelectedGuide] = useState<RepairGuide | null>(null);
  const [editingGuide, setEditingGuide] = useState<RepairGuide | null>(null);

  // Get unique values for filters
  const uniqueBrands = [...new Set(guides.map(g => g.device_brand))].sort();
  const uniqueCategories = [...new Set(guides.map(g => g.issue_category))].sort();
  const uniqueDeviceTypes = [...new Set(guides.map(g => g.device_type))].sort();

  useEffect(() => {
    loadGuides();
  }, []);

  useEffect(() => {
    filterGuides();
  }, [guides, searchTerm, brandFilter, categoryFilter, deviceTypeFilter]);

  const loadGuides = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("repair_guides")
        .select("*")
        .order("usage_count", { ascending: false });

      if (error) throw error;
      
      // Parse guide_data from JSON if needed
      const parsedGuides = (data || []).map(guide => ({
        ...guide,
        guide_data: typeof guide.guide_data === 'string' 
          ? JSON.parse(guide.guide_data) 
          : guide.guide_data
      }));
      
      setGuides(parsedGuides);
    } catch (error) {
      console.error("Error loading guides:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le guide",
        variant: "destructive",
      });
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
        g.device_model.toLowerCase().includes(term) ||
        g.guide_data?.diagnosis?.problem?.toLowerCase().includes(term)
      );
    }

    if (brandFilter !== "all") {
      filtered = filtered.filter(g => g.device_brand === brandFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(g => g.issue_category === categoryFilter);
    }

    if (deviceTypeFilter !== "all") {
      filtered = filtered.filter(g => g.device_type === deviceTypeFilter);
    }

    setFilteredGuides(filtered);
  };

  const deleteGuide = async (guideId: string) => {
    try {
      const { error } = await supabase
        .from("repair_guides")
        .delete()
        .eq("id", guideId);

      if (error) throw error;

      setGuides(guides.filter(g => g.id !== guideId));
      toast({
        title: "Guida Eliminata",
        description: "La guida è stata eliminata con successo",
      });
    } catch (error) {
      console.error("Error deleting guide:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la guida",
        variant: "destructive",
      });
    }
  };

  const handleGuideSaved = (updatedGuide: RepairGuide) => {
    setGuides(guides.map(g => g.id === updatedGuide.id ? updatedGuide : g));
    if (selectedGuide?.id === updatedGuide.id) {
      setSelectedGuide(updatedGuide);
    }
  };

  const totalUsage = guides.reduce((sum, g) => sum + g.usage_count, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <div className="bg-gradient-to-r from-card via-card to-primary/5 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <BookOpen className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Libreria Guide</h1>
                <p className="text-muted-foreground text-sm">
                  {guides.length} guide salvate • {totalUsage} utilizzi totali
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <CreateGuideDialog onCreated={loadGuides} />
              <Button onClick={loadGuides} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Aggiorna
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4 text-center">
            <BookOpen className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{guides.length}</p>
            <p className="text-xs text-muted-foreground">Guide Totali</p>
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
            <p className="text-xs text-muted-foreground">Tipi Riparazione</p>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtri</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca brand, modello, problema..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i Brand</SelectItem>
                {uniqueBrands.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo Riparazione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le Riparazioni</SelectItem>
                {uniqueCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {issueCategoryLabels[cat] || cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={deviceTypeFilter} onValueChange={setDeviceTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo Dispositivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i Dispositivi</SelectItem>
                {uniqueDeviceTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>

      {/* Guides Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 pb-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Caricamento guide...</p>
          </div>
        ) : filteredGuides.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nessuna guida trovata</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {guides.length === 0 
                ? "Le guide verranno salvate automaticamente quando generi suggerimenti IA per le riparazioni."
                : "Prova a modificare i filtri di ricerca."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredGuides.map((guide, index) => {
                const difficulty = guide.guide_data?.overview?.difficulty || "Medio";
                const stepsCount = guide.guide_data?.steps?.length || 0;
                const firstStepImage = guide.guide_data?.steps?.[0]?.imageUrl;
                
                return (
                  <motion.div
                    key={guide.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-all group">
                      {/* Image/Header */}
                      <div className="relative h-32 bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden">
                        {firstStepImage && !firstStepImage.startsWith('data:') ? (
                          <img
                            src={firstStepImage}
                            alt={guide.device_model}
                            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            {deviceTypeIcons[guide.device_type.toLowerCase()] || <Smartphone className="h-12 w-12 text-primary/30" />}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="text-white font-bold text-lg truncate">
                            {guide.device_brand} {guide.device_model}
                          </p>
                          <p className="text-white/80 text-xs">
                            {guide.device_type}
                          </p>
                        </div>
                        <Badge 
                          className={`absolute top-3 right-3 ${difficultyColors[difficulty] || difficultyColors["Medio"]}`}
                        >
                          {difficulty}
                        </Badge>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="gap-1">
                            <Wrench className="h-3 w-3" />
                            {issueCategoryLabels[guide.issue_category] || guide.issue_category}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {guide.usage_count}x
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {guide.guide_data?.diagnosis?.problem || "Guida riparazione disponibile"}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {stepsCount} step
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {guide.guide_data?.overview?.estimatedTime || "N/A"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            {guide.guide_data?.overview?.partsNeeded?.length || 0} parti
                          </span>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1"
                            onClick={() => setSelectedGuide(guide)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Dettagli
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingGuide(guide)}
                          >
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
                                <AlertDialogTitle>Elimina Guida</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Sei sicuro di voler eliminare questa guida? L'azione non può essere annullata.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteGuide(guide.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Elimina
                                </AlertDialogAction>
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
      </div>

      {/* Guide Detail Modal */}
      <AnimatePresence>
        {selectedGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedGuide(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">
                      {selectedGuide.device_brand} {selectedGuide.device_model}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {issueCategoryLabels[selectedGuide.issue_category] || selectedGuide.issue_category}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setEditingGuide(selectedGuide);
                        setSelectedGuide(null);
                      }}
                      className="gap-1"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Modifica
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedGuide(null)}>
                      ✕
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Diagnosis */}
                {selectedGuide.guide_data?.diagnosis && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-primary" />
                      Diagnosi
                    </h3>
                    <Card className="p-4 bg-muted/30">
                      <p className="font-medium">{selectedGuide.guide_data.diagnosis.problem}</p>
                    </Card>
                  </div>
                )}

                {/* Overview */}
                {selectedGuide.guide_data?.overview && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Panoramica
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Difficoltà</p>
                        <p className="font-semibold">{selectedGuide.guide_data.overview.difficulty}</p>
                      </Card>
                      <Card className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Tempo</p>
                        <p className="font-semibold">{selectedGuide.guide_data.overview.estimatedTime}</p>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Parts Needed */}
                {selectedGuide.guide_data?.overview?.partsNeeded && selectedGuide.guide_data.overview.partsNeeded.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4 text-emerald-500" />
                      Ricambi Necessari
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedGuide.guide_data.overview.partsNeeded.map((part, idx) => (
                        <Badge key={idx} variant="secondary">{part}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Steps Summary */}
                {selectedGuide.guide_data?.steps && selectedGuide.guide_data.steps.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      Step ({selectedGuide.guide_data.steps.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedGuide.guide_data.steps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {idx + 1}
                          </div>
                          <span className="text-sm">{step.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Usage Stats */}
                <div className="pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Utilizzata {selectedGuide.usage_count} volte</span>
                    <span>Creata il {new Date(selectedGuide.created_at).toLocaleDateString("it-IT")}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Guide Dialog */}
      {editingGuide && (
        <EditGuideDialog
          guide={editingGuide}
          open={!!editingGuide}
          onOpenChange={(open) => !open && setEditingGuide(null)}
          onSaved={handleGuideSaved}
        />
      )}
    </div>
  );
}
