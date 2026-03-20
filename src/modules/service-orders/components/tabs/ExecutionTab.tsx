import RepairTestWarrantyPanel from "@/modules/repair/components/RepairTestWarrantyPanel";
import AttachmentUpload from "../AttachmentUpload";
import SignatureCapture from "../SignatureCapture";

interface Props {
  serviceOrderId: string;
  orderStatus: string;
}

export default function ExecutionTab({ serviceOrderId, orderStatus }: Props) {
  return (
    <div className="space-y-6">
      <RepairTestWarrantyPanel serviceOrderId={serviceOrderId} orderStatus={orderStatus} />
      <AttachmentUpload orderId={serviceOrderId} />
      <SignatureCapture orderId={serviceOrderId} />
    </div>
  );
}
