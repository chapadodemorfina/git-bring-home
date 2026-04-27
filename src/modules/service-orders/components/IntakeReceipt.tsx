import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ServiceOrder, statusLabels, priorityLabels, channelLabels } from "../types";
import { deviceTypeLabels } from "@/modules/devices/types";
import { useActiveTerms, useOrderSignatures } from "../hooks/useServiceOrders";
import { useCompanyName } from "@/hooks/useCompanyName";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ReceiptItem = {
  description: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string | null;
};

type ReceiptFinancialEntry = {
  description: string;
  entry_type: string;
  status: string;
  amount: number;
  paid_amount: number;
  due_date?: string | null;
  notes?: string | null;
};

type ReceiptPayment = {
  amount: number;
  payment_method: string;
  payment_date: string;
  reference?: string | null;
  notes?: string | null;
};

const CHECKLIST_NAME_MAP: Record<string, string> = {
  screen: "Tela/Display", body: "Carcaça/Estrutura", buttons: "Botões",
  charging: "Porta de Carga", battery: "Bateria", speakers: "Alto-falante/Mic",
  camera: "Câmera", connectivity: "Wi-Fi/Bluetooth", biometrics: "Biometria/Face ID",
};
const CHECKLIST_STATUS_MAP: Record<string, string> = {
  ok: "OK", damaged: "Danificado", scratched: "Arranhado", cracked: "Trincado",
  missing: "Ausente", na: "N/A",
};

function formatPhysicalCondition(raw: string | null | undefined): string {
  if (!raw) return "—";
  try {
    const items = JSON.parse(raw);
    if (Array.isArray(items)) {
      return items
        .map((item: any) => {
          const label = CHECKLIST_NAME_MAP[item.id] || item.id || "";
          const status = CHECKLIST_STATUS_MAP[item.status] || item.status || "";
          const notes = item.notes ? ` (${item.notes})` : "";
          return `${label}: ${status}${notes}`;
        })
        .join(" · ");
    }
  } catch { /* not JSON */ }
  return raw;
}

interface Props {
  order: ServiceOrder;
  trackingUrl?: string | null;
  items?: ReceiptItem[];
  financialEntries?: ReceiptFinancialEntry[];
  payments?: ReceiptPayment[];
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const itemTypeLabels: Record<string, string> = {
  service: "Serviço",
  product: "Produto/Peça",
  part: "Peça",
  labor: "Mão de Obra",
};

const paymentMethodLabels: Record<string, string> = {
  cash: "Dinheiro",
  credit_card: "Cartão Crédito",
  debit_card: "Cartão Débito",
  pix: "PIX",
  bank_transfer: "Transferência",
  boleto: "Boleto",
  check: "Cheque",
  other: "Outro",
};

const financialStatusLabels: Record<string, string> = {
  pending: "Pendente",
  partial: "Parcial",
  paid: "Pago",
  overdue: "Vencido",
  cancelled: "Cancelado",
};

const IntakeReceipt = forwardRef<HTMLDivElement, Props>(({ order, trackingUrl, items = [], financialEntries = [], payments = [] }, ref) => {
  const { data: terms } = useActiveTerms();
  const { data: signatures } = useOrderSignatures(order.id);
  const companyName = useCompanyName("Assistência Técnica");
  const activeTerm = terms?.[0];
  const activeEntries = financialEntries.filter((entry) => entry.status !== "cancelled");
  const totalItems = items.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
  const totalRevenue = activeEntries
    .filter((entry) => entry.entry_type === "revenue")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const pendingAmount = Math.max(0, (totalRevenue || Number(order.total_amount || totalItems || 0)) - totalPaid);
  const pixQrPayload = payments.find((payment) => payment.payment_method === "pix" && (payment.reference || payment.notes))?.reference
    || payments.find((payment) => payment.payment_method === "pix" && payment.notes)?.notes
    || null;

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
          <p>{formatPhysicalCondition(order.physical_condition)}</p>
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

      <div className="border rounded p-3 mb-4">
        <p className="font-bold mb-2">Serviços, Peças e Valores</p>
        {items.length > 0 ? (
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Descrição</th>
                <th className="text-left py-1">Tipo</th>
                <th className="text-right py-1">Qtd</th>
                <th className="text-right py-1">Unit.</th>
                <th className="text-right py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.description}-${index}`} className="border-b last:border-b-0">
                  <td className="py-1 pr-2">{item.description}{item.notes ? <span className="block text-[10px]">Obs.: {item.notes}</span> : null}</td>
                  <td className="py-1 pr-2">{itemTypeLabels[item.item_type] || item.item_type}</td>
                  <td className="py-1 text-right">{Number(item.quantity).toLocaleString("pt-BR")}</td>
                  <td className="py-1 text-right">{formatCurrency(Number(item.unit_price || 0))}</td>
                  <td className="py-1 text-right font-bold">{formatCurrency(Number(item.total_price || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs">Nenhum item lançado.</p>
        )}
        <div className="mt-2 text-right font-bold">Total da OS: {formatCurrency(Number(order.total_amount || totalItems || 0))}</div>
      </div>

      <div className="border rounded p-3 mb-4">
        <p className="font-bold mb-2">Financeiro e Pagamentos</p>
        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
          <div><span className="block font-medium">Valor</span>{formatCurrency(totalRevenue || Number(order.total_amount || 0))}</div>
          <div><span className="block font-medium">Pago</span>{formatCurrency(totalPaid)}</div>
          <div><span className="block font-medium">Pendente</span>{formatCurrency(pendingAmount)}</div>
        </div>
        {activeEntries.length > 0 && (
          <table className="text-xs w-full border-collapse mb-3">
            <tbody>
              {activeEntries.map((entry, index) => (
                <tr key={`${entry.description}-${index}`} className="border-b last:border-b-0">
                  <td className="py-1 pr-2">{entry.description}</td>
                  <td className="py-1 pr-2">{financialStatusLabels[entry.status] || entry.status}</td>
                  <td className="py-1 text-right font-bold">{formatCurrency(Number(entry.amount || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {payments.length > 0 ? (
          <table className="text-xs w-full border-collapse">
            <thead><tr className="border-b"><th className="text-left py-1">Forma</th><th className="text-left py-1">Data</th><th className="text-left py-1">Referência</th><th className="text-right py-1">Valor</th></tr></thead>
            <tbody>
              {payments.map((payment, index) => (
                <tr key={`${payment.payment_method}-${index}`} className="border-b last:border-b-0">
                  <td className="py-1 pr-2">{paymentMethodLabels[payment.payment_method] || payment.payment_method}</td>
                  <td className="py-1 pr-2">{format(new Date(payment.payment_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</td>
                  <td className="py-1 pr-2 break-all">{payment.reference || payment.notes || "—"}</td>
                  <td className="py-1 text-right font-bold">{formatCurrency(Number(payment.amount || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs">Nenhum pagamento registrado.</p>
        )}
        {pixQrPayload && (
          <div className="mt-4 flex flex-col items-center border-t pt-3">
            <QRCodeSVG value={pixQrPayload} size={120} level="M" />
            <p className="text-xs mt-2 font-medium">QR Code PIX</p>
            <p className="text-[10px] break-all mt-1">{pixQrPayload}</p>
          </div>
        )}
      </div>

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
