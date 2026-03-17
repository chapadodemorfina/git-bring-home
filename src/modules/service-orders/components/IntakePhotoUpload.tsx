import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, ImageIcon, Trash2 } from "lucide-react";
import { useUploadAttachment, useOrderAttachments, useDeleteAttachment } from "../hooks/useServiceOrders";
import { useSignedUrl } from "@/hooks/useSignedUrl";

const INTAKE_AREAS = [
  { id: "front", label: "Frente" },
  { id: "back", label: "Traseira" },
  { id: "sides", label: "Laterais" },
  { id: "screen", label: "Tela (detalhe)" },
  { id: "ports", label: "Portas / Conectores" },
  { id: "other", label: "Outros" },
];

function PhotoThumb({ att, orderId }: { att: any; orderId: string }) {
  const url = useSignedUrl("service-order-attachments", att.storage_path);
  const del = useDeleteAttachment();
  return (
    <div className="relative group rounded-lg overflow-hidden border aspect-square">
      {url ? (
        <img src={url} alt={att.caption || ""} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <Button
        size="icon"
        variant="destructive"
        className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => del.mutate({ id: att.id, orderId, storagePath: att.storage_path })}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
      {att.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
          <p className="text-[10px] text-white truncate">{att.caption}</p>
        </div>
      )}
    </div>
  );
}

interface Props {
  orderId: string;
}

export default function IntakePhotoUpload({ orderId }: Props) {
  const upload = useUploadAttachment();
  const { data: attachments = [] } = useOrderAttachments(orderId);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleUpload = (areaLabel: string, files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      upload.mutate({ orderId, file, caption: `Entrada: ${areaLabel}` });
    });
  };

  const handleCamera = (areaLabel: string) => {
    const input = inputRefs.current[areaLabel];
    if (input) {
      input.setAttribute("capture", "environment");
      input.click();
      input.removeAttribute("capture");
    }
  };

  const getAreaPhotos = (areaLabel: string) =>
    attachments.filter((a: any) => a.caption === `Entrada: ${areaLabel}` && a.file_type?.startsWith("image/"));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Camera className="h-4 w-4" /> Fotos de Entrada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {INTAKE_AREAS.map((area) => {
          const photos = getAreaPhotos(area.label);
          return (
            <div key={area.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{area.label}</span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] px-2"
                    onClick={() => inputRefs.current[area.label]?.click()}
                    disabled={upload.isPending}
                  >
                    <Upload className="h-3 w-3 mr-1" /> Arquivo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-[11px] px-2"
                    onClick={() => handleCamera(area.label)}
                    disabled={upload.isPending}
                  >
                    {upload.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3 mr-1" />}
                    Câmera
                  </Button>
                </div>
                <input
                  ref={(el) => { inputRefs.current[area.label] = el; }}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload(area.label, e.target.files)}
                />
              </div>
              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5">
                  {photos.map((att: any) => (
                    <PhotoThumb key={att.id} att={att} orderId={orderId} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
