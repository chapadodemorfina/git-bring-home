import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Trash2, ImageIcon, RefreshCw } from "lucide-react";

interface LogoUploadProps {
  currentUrl: string;
  onUrlChange: (url: string) => void;
}

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED = ".png,.jpg,.jpeg,.svg";
const BUCKET = "company-assets";
const PATH = "logo";

export function LogoUpload({ currentUrl, onUrlChange }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (file.size > MAX_SIZE) {
      toast({ title: "Arquivo muito grande", description: "O tamanho máximo é 2MB.", variant: "destructive" });
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["png", "jpg", "jpeg", "svg"].includes(ext)) {
      toast({ title: "Formato inválido", description: "Aceito: PNG, JPG ou SVG.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileName = `${PATH}/logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(fileName);

      onUrlChange(urlData.publicUrl);
      toast({ title: "Logo enviada com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onUrlChange("");
  };

  return (
    <div className="space-y-3">
      <Label>Logo da Empresa</Label>

      {currentUrl ? (
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-lg border border-border bg-muted/50 flex items-center justify-center overflow-hidden">
            <img
              src={currentUrl}
              alt="Logo da empresa"
              className="h-full w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
              Alterar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex h-24 w-full max-w-xs cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Enviando…
            </>
          ) : (
            <>
              <ImageIcon className="h-5 w-5" />
              Enviar logo (PNG, JPG, SVG)
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <p className="text-xs text-muted-foreground">Tamanho máximo: 2MB</p>
    </div>
  );
}
