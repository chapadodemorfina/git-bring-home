import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  orderNumber: string;
  deviceDescription: string;
  reportedIssue: string | null;
  customerName: string;
  intakeDate: string;
  trackingUrl: string | null;
  collectionPointName?: string | null;
  companyName?: string;
}

const DeviceIntakeLabel = forwardRef<HTMLDivElement, Props>(
  ({ orderNumber, deviceDescription, reportedIssue, customerName, intakeDate, trackingUrl, collectionPointName, companyName = "Assistência Técnica" }, ref) => {
    const truncate = (text: string | null, max: number) => {
      if (!text) return "—";
      return text.length > max ? text.slice(0, max) + "…" : text;
    };

    return (
      <div
        ref={ref}
        className="bg-white text-black"
        style={{
          width: "80mm",
          height: "50mm",
          padding: "3mm",
          fontFamily: "Arial, Helvetica, sans-serif",
          boxSizing: "border-box",
          display: "flex",
          gap: "3mm",
        }}
      >
        {/* Left: QR Code */}
        <div
          style={{
            flexShrink: 0,
            width: "28mm",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {trackingUrl ? (
            <QRCodeSVG value={trackingUrl} size={100} level="M" />
          ) : (
            <div
              style={{
                width: "100px",
                height: "100px",
                border: "1px dashed #999",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "8px",
                color: "#999",
                textAlign: "center",
              }}
            >
              Sem link
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {/* Company + Order */}
          <div>
            <div style={{ fontSize: "7px", fontWeight: "bold", letterSpacing: "0.5px", marginBottom: "1px" }}>
              {companyName}
              {collectionPointName && (
                <span style={{ fontWeight: "normal", marginLeft: "4px" }}>
                  · {truncate(collectionPointName, 20)}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                fontFamily: "monospace",
                lineHeight: 1.1,
                borderBottom: "1.5px solid black",
                paddingBottom: "2px",
                marginBottom: "2px",
              }}
            >
              {orderNumber}
            </div>
          </div>

          {/* Device */}
          <div style={{ fontSize: "8px", lineHeight: 1.3 }}>
            <div style={{ fontWeight: "bold" }}>{truncate(deviceDescription, 40) || "Dispositivo"}</div>
            <div style={{ color: "#444" }}>{truncate(reportedIssue, 50)}</div>
          </div>

          {/* Customer + Date */}
          <div style={{ fontSize: "7px", color: "#555", lineHeight: 1.3 }}>
            <div>{truncate(customerName, 35)}</div>
            <div>{format(new Date(intakeDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
          </div>
        </div>
      </div>
    );
  }
);

DeviceIntakeLabel.displayName = "DeviceIntakeLabel";
export default DeviceIntakeLabel;
