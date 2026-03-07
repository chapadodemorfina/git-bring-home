import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Trash2, ImageIcon } from "lucide-react";
import { useDevicePhotos, useUploadDevicePhoto, useDeleteDevicePhoto } from "../hooks/useDevices";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface Props {
  deviceId: string;
}

function PhotoCard({ photo, deviceId }: { photo: any; deviceId: string }) {
  const url = useSignedUrl("device-photos", photo.storage_path);
  const deletePhoto = useDeleteDevicePhoto();

  return (
    <div className="group relative rounded-lg overflow-hidden border">
      <AspectRatio ratio={4 / 3}>
        {url ? (
          <img
            src={url}
            alt={photo.caption || "Foto do dispositivo"}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full bg-muted animate-pulse" />
        )}
      </AspectRatio>
      <Button
        size="icon"
        variant="destructive"
        className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => deletePhoto.mutate({ id: photo.id, deviceId, storagePath: photo.storage_path })}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function DevicePhotos({ deviceId }: Props) {
  const { data: photos = [], isLoading } = useDevicePhotos(deviceId);
  const upload = useUploadDevicePhoto();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      upload.mutate({ deviceId, file });
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Camera className="h-4 w-4" /> Fotos do Dispositivo
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
          <Camera className="h-4 w-4 mr-2" /> Adicionar
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <ImageIcon className="h-10 w-10" />
            <p className="text-sm">Nenhuma foto registrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} deviceId={deviceId} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
