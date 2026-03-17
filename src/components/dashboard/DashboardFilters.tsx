import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Download, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange, DashboardSummary } from "@/hooks/useDashboardData";
import { generateDashboardReportPdf } from "@/lib/pdf-generators/dashboard-report-pdf";

interface Props {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  preset: string;
  onPresetChange: (preset: string) => void;
  summary?: DashboardSummary;
  companyName?: string;
}

export function DashboardFilters({ dateRange, onDateRangeChange, preset, onPresetChange, summary, companyName }: Props) {
  const handlePreset = (value: string) => {
    onPresetChange(value);
    const now = new Date();
    let from: Date;
    switch (value) {
      case "7d": from = new Date(now.getTime() - 7 * 86400000); break;
      case "30d": from = new Date(now.getTime() - 30 * 86400000); break;
      case "90d": from = new Date(now.getTime() - 90 * 86400000); break;
      case "12m": from = new Date(now.getTime() - 365 * 86400000); break;
      default: from = new Date(now.getTime() - 30 * 86400000);
    }
    onDateRangeChange({ from, to: now });
  };

  const handleExport = () => {
    if (!summary) return;
    const dateLabel = `Período: ${format(dateRange.from, "dd/MM/yyyy")} a ${format(dateRange.to, "dd/MM/yyyy")}`;
    generateDashboardReportPdf(summary, companyName || "i9 Solutions", dateLabel);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={preset} onValueChange={handlePreset}>
        <SelectTrigger className="w-[160px]">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Últimos 7 dias</SelectItem>
          <SelectItem value="30d">Últimos 30 dias</SelectItem>
          <SelectItem value="90d">Últimos 90 dias</SelectItem>
          <SelectItem value="12m">Últimos 12 meses</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("justify-start text-left font-normal")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(dateRange.from, "dd/MM/yy")} – {format(dateRange.to, "dd/MM/yy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onDateRangeChange({ from: range.from, to: range.to });
                onPresetChange("custom");
              }
            }}
            numberOfMonths={2}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <Button variant="outline" size="sm" onClick={handleExport} disabled={!summary}>
        <Download className="h-4 w-4 mr-2" />
        Exportar
      </Button>
    </div>
  );
}
