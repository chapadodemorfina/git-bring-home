import { useState } from "react";
import { useSendCustomerMessage, previewMessage } from "../hooks/useCustomerMessaging";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Copy, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCompanyName } from "@/hooks/useCompanyName";

interface Props {
  customerId?: string | null;
  customerPhone?: string | null;
  customerName?: string;
  eventType: string;
  referenceType: string;
  referenceId: string;
  templateKey: string;
  variables: Record<string, string>;
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon";
  className?: string;
}

export default function WhatsAppSendButton({
  customerId, customerPhone, customerName, eventType, referenceType,
  referenceId, templateKey, variables, label = "Enviar WhatsApp",
  variant = "outline", size = "sm", className,
}: Props) {
  const { toast } = useToast();
  const companyName = useCompanyName();
  const sendMessage = useSendCustomerMessage();
  const [showPreview, setShowPreview] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [loading, setLoading] = useState(false);

  const allVars = { ...variables, customer_name: customerName || "Cliente", company_name: companyName };

  const handlePreview = async () => {
    setLoading(true);
    const text = await previewMessage(templateKey, allVars);
    setLoading(false);
    if (text) {
      setPreviewText(text);
      setShowPreview(true);
    } else {
      toast({ title: "Template não encontrado", description: `Template "${templateKey}" está inativo ou não existe.`, variant: "destructive" });
    }
  };

  const handleSend = () => {
    if (!customerPhone) {
      toast({ title: "Sem telefone", description: "Cliente não possui telefone cadastrado.", variant: "destructive" });
      return;
    }
    sendMessage.mutate({
      customerId,
      phone: customerPhone,
      eventType,
      referenceType,
      referenceId,
      templateKey,
      variables: allVars,
    }, {
      onSuccess: () => setShowPreview(false),
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(previewText);
    toast({ title: "Copiado!" });
  };

  if (!customerPhone) return null;

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={handlePreview} disabled={loading}>
        <MessageSquare className="mr-2 h-4 w-4" />
        {label}
      </Button>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" /> Preview da Mensagem
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Para: <span className="font-medium">{customerPhone}</span>
              {customerName && <> · <span className="font-medium">{customerName}</span></>}
            </div>
            <Textarea value={previewText} onChange={(e) => setPreviewText(e.target.value)} rows={10} className="font-mono text-sm" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" /> Copiar
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(false)}>Cancelar</Button>
            <Button onClick={handleSend} disabled={sendMessage.isPending}>
              <Send className="mr-2 h-4 w-4" />
              {sendMessage.isPending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
