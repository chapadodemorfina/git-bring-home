import DiagnosticQuotePanel from "@/modules/diagnostics/components/DiagnosticQuotePanel";

interface Props {
  serviceOrderId: string;
  deviceType?: string | null;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  reportedIssue?: string | null;
}

export default function DiagnosisQuoteTab({ serviceOrderId, deviceType, deviceBrand, deviceModel, reportedIssue }: Props) {
  return (
    <DiagnosticQuotePanel
      serviceOrderId={serviceOrderId}
      deviceType={deviceType}
      deviceBrand={deviceBrand}
      deviceModel={deviceModel}
      reportedIssue={reportedIssue}
    />
  );
}
