import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Upload, Loader2, ImageIcon, Trash2 } from "lucide-react";
import { useUploadAttachment, useOrderAttachments, useDeleteAttachment } from "@/modules/service-orders/hooks/useServiceOrders";
import { useSignedUrl } from "@/hooks/useSignedUrl";

function AttachmentThumb({ att, orderId }: { att: any; orderId: string }) {
  const url = useSignedUrl("service-order-attachments", att.storage_path);
  const del = useDeleteAttachment();
  const isImage = att.file_type?.startsWith("image/");

  return (
    <div className="relative group rounded-lg overflow-hidden border aspect-square">
      {isImage && url ? (
        <img src={url} alt={att.caption || att.file_name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <Button
        size="icon"
        variant="destructive"
        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => del.mutate({ id: att.id, orderId, storagePath: att.storage_path })}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
      {att.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
          <p className="text-[10px] text-white truncate">{att.caption}</p>
        </div>
      )}
    </div>
  );
}

interface Props {
  orderId: string;
}

export default function RepairPhotoUpload({ orderId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAttachment();
  const { data: attachments = [] } = useOrderAttachments(orderId);
  const [caption, setCaption] = useState("");

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      upload.mutate({ orderId, file, caption: caption || undefined });
    });
    setCaption("");
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Camera className="h-4 w-4" /> Fotos do Reparo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Legenda (opcional)"
            className="text-xs h-9"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
            className="shrink-0"
          >
            {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const input = inputRef.current;
              if (input) {
                input.setAttribute("capture", "environment");
                input.click();
                input.removeAttribute("capture");
              }
            }}
            disabled={upload.isPending}
            className="shrink-0"
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {attachments.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {attachments
              .filter((a: any) => a.file_type?.startsWith("image/"))
              .map((att: any) => (
                <AttachmentThumb key={att.id} att={att} orderId={orderId} />
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
