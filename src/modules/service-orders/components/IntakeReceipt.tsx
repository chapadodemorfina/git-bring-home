import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ServiceOrder, statusLabels, priorityLabels, channelLabels } from "../types";
import { deviceTypeLabels } from "@/modules/devices/types";
import { useActiveTerms, useOrderSignatures } from "../hooks/useServiceOrders";
import { useCompanyName } from "@/hooks/useCompanyName";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  order: ServiceOrder;
  trackingUrl?: string | null;
}

const IntakeReceipt = forwardRef<HTMLDivElement, Props>(({ order, trackingUrl }, ref) => {
  const { data: terms } = useActiveTerms();
  const { data: signatures } = useOrderSignatures(order.id);
  const companyName = useCompanyName("Assistência Técnica");
  const activeTerm = terms?.[0];

  return (
    <div ref={ref} className="bg-white text-black p-8 max-w-[800px] mx-auto text-sm print:p-4" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-4 mb-4">
        <h1 className="text-xl font-bold">{companyName}</h1>
        <p className="text-xs">Assistência Técnica Especializada</p>
      </div>

      {/* Order Info */}
      <div className="flex justify-between mb-4">
        <div>
          <p className="font-bold text-lg">{order.order_number}</p>
          <p>Data: {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
        </div>
        <div className="text-right">
          <p>Status: <strong>{statusLabels[order.status]}</strong></p>
          <p>Prioridade: <strong>{priorityLabels[order.priority]}</strong></p>
          <p>Canal: {channelLabels[order.intake_channel]}</p>
        </div>
      </div>

      {/* Customer */}
      <div className="border rounded p-3 mb-4">
        <p className="font-bold mb-1">Cliente</p>
        <p>{order.customer_name}</p>
        {order.customer_phone && <p className="text-xs">Telefone: {order.customer_phone}</p>}
        {order.customer_document && <p className="text-xs">Documento: {order.customer_document}</p>}
      </div>

      {/* Device */}
      {(order.device_label || order.device_type) && (
        <div className="border rounded p-3 mb-4">
          <p className="font-bold mb-1">Dispositivo</p>
          <table className="text-xs w-full">
            <tbody>
              {order.device_type && (
                <tr><td className="pr-2 font-medium">Tipo:</td><td>{deviceTypeLabels[order.device_type as keyof typeof deviceTypeLabels] || order.device_type}</td></tr>
              )}
              {order.device_brand && <tr><td className="pr-2 font-medium">Marca:</td><td>{order.device_brand}</td></tr>}
              {order.device_model && <tr><td className="pr-2 font-medium">Modelo:</td><td>{order.device_model}</td></tr>}
              {order.device_serial && <tr><td className="pr-2 font-medium">Nº Série:</td><td>{order.device_serial}</td></tr>}
              {order.device_imei && <tr><td className="pr-2 font-medium">IMEI:</td><td>{order.device_imei}</td></tr>}
              {order.device_color && <tr><td className="pr-2 font-medium">Cor:</td><td>{order.device_color}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Issue */}
      <div className="border rounded p-3 mb-4">
        <p className="font-bold mb-1">Problema Relatado</p>
        <p>{order.reported_issue || "—"}</p>
      </div>

      {order.physical_condition && (
        <div className="border rounded p-3 mb-4">
          <p className="font-bold mb-1">Condição Física</p>
          <p>{order.physical_condition}</p>
        </div>
      )}

      {order.accessories_received && (
        <div className="border rounded p-3 mb-4">
          <p className="font-bold mb-1">Acessórios Recebidos</p>
          <p>{order.accessories_received}</p>
        </div>
      )}

      {order.expected_deadline && (
        <div className="border rounded p-3 mb-4">
          <p className="font-bold mb-1">Prazo Estimado</p>
          <p>{format(new Date(order.expected_deadline), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
        </div>
      )}

      {/* Collection Point */}
      {order.collection_point_name && (
        <div className="border rounded p-3 mb-4">
          <p className="font-bold mb-1">Ponto de Coleta</p>
          <p>{order.collection_point_name}</p>
        </div>
      )}

      {/* Terms */}
      {activeTerm && (
        <div className="border rounded p-3 mb-4">
          <p className="font-bold mb-1">{activeTerm.title}</p>
          <p className="whitespace-pre-line text-xs">{activeTerm.content}</p>
        </div>
      )}

      {/* Signatures */}
      <div className="mt-8 grid grid-cols-2 gap-8">
        {signatures?.map((sig) => (
          <div key={sig.id} className="text-center">
            <img src={sig.signature_data} alt="Assinatura" className="mx-auto h-16 mb-2" />
            <div className="border-t border-black pt-1">
              <p className="font-bold text-xs">{sig.signer_name}</p>
              <p className="text-xs">{sig.signer_role === "customer" ? "Cliente" : "Técnico"}</p>
            </div>
          </div>
        ))}
        {(!signatures || signatures.length < 2) && (
          <div className="text-center">
            <div className="h-16 mb-2" />
            <div className="border-t border-black pt-1">
              <p className="font-bold text-xs">____________________________</p>
              <p className="text-xs">{signatures?.length === 0 ? "Cliente" : "Responsável"}</p>
            </div>
          </div>
        )}
      </div>

      {/* QR Code + Tracking */}
      {trackingUrl && (
        <div className="mt-6 flex flex-col items-center">
          <QRCodeSVG value={trackingUrl} size={120} level="M" />
          <p className="text-xs mt-2 font-medium">Acompanhe seu reparo escaneando o QR Code</p>
          <p className="text-xs text-gray-500 break-all mt-1">{trackingUrl}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-xs border-t pt-2">
        <p>Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
      </div>
    </div>
  );
});

IntakeReceipt.displayName = "IntakeReceipt";
export default IntakeReceipt;
