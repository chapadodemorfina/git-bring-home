import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useServiceOrderPublicLinks, useGeneratePublicLink, useRevokePublicLink } from "../hooks/usePublicTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link2, RefreshCw, Copy, XCircle, QrCode, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  serviceOrderId: string;
  orderNumber: string;
}

export default function PublicLinkManager({ serviceOrderId, orderNumber }: Props) {
  const { data: links, isLoading } = useServiceOrderPublicLinks(serviceOrderId);
  const generateLink = useGeneratePublicLink();
  const revokeLink = useRevokePublicLink();
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);

  const activeLink = links?.find((l: any) => l.status === "active");
  const trackingUrl = activeLink
    ? `${window.location.origin}/track/${activeLink.public_token}`
    : null;

  const handleCopy = () => {
    if (trackingUrl) {
      navigator.clipboard.writeText(trackingUrl);
      toast({ title: "Link copiado!" });
    }
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 512, 512);
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `qr-${orderNumber}.png`;
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4" /> Link de Acompanhamento Público
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeLink ? (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="default">Ativo</Badge>
              {activeLink.access_count > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Eye className="h-3 w-3" /> {activeLink.access_count} acessos
                </span>
              )}
              {activeLink.last_access_at && (
                <span className="text-xs text-muted-foreground">
                  Último: {format(new Date(activeLink.last_access_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              )}
            </div>

            <div className="bg-muted rounded p-2 text-xs font-mono break-all select-all">
              {trackingUrl}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="mr-1 h-3 w-3" /> Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadQR}>
                <Download className="mr-1 h-3 w-3" /> QR Code
              </Button>
              <Button variant="outline" size="sm" onClick={() => generateLink.mutate(serviceOrderId)} disabled={generateLink.isPending}>
                <RefreshCw className="mr-1 h-3 w-3" /> Regenerar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => revokeLink.mutate({ linkId: activeLink.id, serviceOrderId })} disabled={revokeLink.isPending}>
                <XCircle className="mr-1 h-3 w-3" /> Revogar
              </Button>
            </div>

            {/* QR Code */}
            <div ref={qrRef} className="flex justify-center py-2">
              <QRCodeSVG value={trackingUrl} size={160} level="M" />
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Nenhum link ativo. Gere um para o cliente acompanhar.
            </p>
            <Button onClick={() => generateLink.mutate(serviceOrderId)} disabled={generateLink.isPending}>
              <QrCode className="mr-2 h-4 w-4" />
              {generateLink.isPending ? "Gerando..." : "Gerar Link de Acompanhamento"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
