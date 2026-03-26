import { useSignedUrl } from "@/hooks/useSignedUrl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Paperclip, Download, ImageIcon } from "lucide-react";

function AttachmentItem({ att }: { att: any }) {
  const url = useSignedUrl("service-order-attachments", att.storage_path);
  const isImage = att.file_type?.startsWith("image/");

  if (isImage) {
    return (
      <a href={url || "#"} target="_blank" rel="noopener noreferrer" className="block">
        <div className="relative group rounded-lg overflow-hidden border aspect-square bg-muted">
          {url ? (
            <img src={url} alt={att.file_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground animate-pulse" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <Download className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {att.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
              <p className="text-[10px] text-white truncate">{att.caption}</p>
            </div>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate mt-1">{att.file_name}</p>
      </a>
    );
  }

  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm text-primary hover:underline p-2 border rounded-lg"
    >
      <Download className="h-4 w-4 shrink-0" />
      <span className="truncate">{att.file_name}</span>
    </a>
  );
}

interface Props {
  attachments: any[] | undefined;
}

export default function PortalAttachmentGallery({ attachments }: Props) {
  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter((a: any) => a.file_type?.startsWith("image/"));
  const files = attachments.filter((a: any) => !a.file_type?.startsWith("image/"));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Paperclip className="h-4 w-4" /> Anexos ({attachments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {images.map((att: any) => (
              <AttachmentItem key={att.id} att={att} />
            ))}
          </div>
        )}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((att: any) => (
              <AttachmentItem key={att.id} att={att} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
