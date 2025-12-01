import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Circle, FabricText, PencilBrush, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Circle as CircleIcon, Type, Eraser, Download, Undo, ZoomIn, ZoomOut, MousePointer } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

interface PhotoEditorProps {
  imageUrl: string;
  onSave: (annotatedImage: Blob) => void;
  onCancel: () => void;
}

export const PhotoEditor = ({ imageUrl, onSave, onCancel }: PhotoEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<"select" | "circle" | "text" | "draw" | "eraser">("select");
  const [circleSize, setCircleSize] = useState(50);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#f5f5f5",
    });

    // Load the image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const fabricImg = new FabricImage(img);
      
      // Scale image to fit canvas
      const scale = Math.min(
        canvas.width! / fabricImg.width!,
        canvas.height! / fabricImg.height!
      );
      
      fabricImg.set({
        scaleX: scale,
        scaleY: scale,
        left: (canvas.width! - fabricImg.width! * scale) / 2,
        top: (canvas.height! - fabricImg.height! * scale) / 2,
        selectable: false,
        evented: false,
      });
      
      canvas.add(fabricImg);
      canvas.renderAll();
    };
    img.src = imageUrl;

    // Initialize drawing brush
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = "#ef4444";
    canvas.freeDrawingBrush.width = strokeWidth;

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [imageUrl]);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "draw";
    
    if (fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = "#ef4444";
      fabricCanvas.freeDrawingBrush.width = strokeWidth;
    }

    if (activeTool === "select") {
      fabricCanvas.selection = true;
      fabricCanvas.forEachObject((obj) => {
        if (obj.selectable !== false) {
          obj.selectable = true;
        }
      });
    } else {
      fabricCanvas.selection = false;
    }
  }, [activeTool, strokeWidth, fabricCanvas]);

  const handleAddCircle = () => {
    if (!fabricCanvas) return;

    const circle = new Circle({
      left: fabricCanvas.width! / 2 - circleSize / 2,
      top: fabricCanvas.height! / 2 - circleSize / 2,
      radius: circleSize,
      stroke: "#ef4444",
      strokeWidth: strokeWidth,
      fill: "transparent",
      selectable: true,
    });

    fabricCanvas.add(circle);
    fabricCanvas.setActiveObject(circle);
    fabricCanvas.renderAll();
    toast.success("Cerchio aggiunto! Trascinalo sul punto da evidenziare");
  };

  const handleAddText = () => {
    if (!fabricCanvas) return;

    const text = new FabricText("Danno", {
      left: fabricCanvas.width! / 2 - 50,
      top: fabricCanvas.height! / 2,
      fontSize: 24,
      fill: "#ef4444",
      fontWeight: "bold",
      selectable: true,
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
    toast.success("Testo aggiunto! Modificalo con doppio click");
  };

  const handleUndo = () => {
    if (!fabricCanvas) return;
    
    const objects = fabricCanvas.getObjects();
    if (objects.length > 1) {
      fabricCanvas.remove(objects[objects.length - 1]);
      fabricCanvas.renderAll();
    }
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    
    const objects = fabricCanvas.getObjects();
    objects.forEach((obj, index) => {
      if (index > 0) {
        fabricCanvas.remove(obj);
      }
    });
    fabricCanvas.renderAll();
    toast.success("Annotazioni cancellate!");
  };

  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.min(zoom + 0.1, 3);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(zoom - 0.1, 0.5);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  const handleSave = () => {
    if (!fabricCanvas) return;

    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();

    fabricCanvas.getElement().toBlob((blob) => {
      if (blob) {
        onSave(blob);
        toast.success("Foto annotata salvata!");
      }
    }, "image/jpeg", 0.9);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Editor Foto Dispositivo</h3>
          <p className="text-sm text-muted-foreground">
            Evidenzia i punti dove verranno effettuati gli interventi
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Annulla
          </Button>
          <Button onClick={handleSave} className="bg-accent hover:bg-accent-glow">
            <Download className="mr-2 h-4 w-4" />
            Salva Annotazioni
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
        <Button
          variant={activeTool === "select" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTool("select")}
        >
          <MousePointer className="mr-2 h-4 w-4" />
          Seleziona
        </Button>
        
        <Button
          variant={activeTool === "circle" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setActiveTool("circle");
            handleAddCircle();
          }}
        >
          <CircleIcon className="mr-2 h-4 w-4" />
          Cerchio
        </Button>

        <Button
          variant={activeTool === "text" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setActiveTool("text");
            handleAddText();
          }}
        >
          <Type className="mr-2 h-4 w-4" />
          Testo
        </Button>

        <Button
          variant={activeTool === "draw" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTool("draw")}
        >
          <Eraser className="mr-2 h-4 w-4" />
          Disegna
        </Button>

        <div className="h-8 w-px bg-border" />

        <Button variant="outline" size="sm" onClick={handleUndo}>
          <Undo className="mr-2 h-4 w-4" />
          Annulla
        </Button>

        <Button variant="outline" size="sm" onClick={handleClear}>
          <Eraser className="mr-2 h-4 w-4" />
          Cancella Tutto
        </Button>

        <div className="h-8 w-px bg-border" />

        <Button variant="outline" size="sm" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="sm" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Dimensione Cerchio: {circleSize}px</Label>
          <Slider
            value={[circleSize]}
            onValueChange={(v) => setCircleSize(v[0])}
            min={20}
            max={150}
            step={5}
          />
        </div>

        <div className="space-y-2">
          <Label>Spessore Linea: {strokeWidth}px</Label>
          <Slider
            value={[strokeWidth]}
            onValueChange={(v) => setStrokeWidth(v[0])}
            min={1}
            max={10}
            step={1}
          />
        </div>
      </div>

      {/* Canvas */}
      <div className="flex justify-center border border-border rounded-lg overflow-hidden bg-background">
        <canvas ref={canvasRef} />
      </div>

      <div className="text-sm text-muted-foreground space-y-1">
        <p>💡 <strong>Suggerimenti:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Usa i cerchi per evidenziare i punti danneggiati</li>
          <li>Aggiungi testo per descrivere il tipo di intervento</li>
          <li>Clicca e trascina per spostare gli elementi</li>
          <li>Usa Disegna per annotazioni a mano libera</li>
        </ul>
      </div>
    </Card>
  );
};
