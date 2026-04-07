import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTechniciansList } from "@/modules/users/hooks/useUsers";
import { useAllCollectionPoints } from "@/modules/collection-points/hooks/useCollectionPoints";
import {
  statusLabels, statusColors, ServiceOrderStatus,
  priorityLabels, priorityColors, ServiceOrderPriority,
  channelLabels, IntakeChannel,
} from "../types";
import { Filter, X, CalendarIcon, MapPin, Store } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface ServiceOrderFilterValues {
  status: string | null;
  priority: string | null;
  origin: string | null; // 'counter' | 'partner' | null
  collectionPointId: string | null;
  technicianId: string | null;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  intakeChannel: string | null;
}

const defaultFilters: ServiceOrderFilterValues = {
  status: null,
  priority: null,
  origin: null,
  collectionPointId: null,
  technicianId: null,
  dateFrom: undefined,
  dateTo: undefined,
  intakeChannel: null,
};

interface Props {
  filters: ServiceOrderFilterValues;
  onChange: (filters: ServiceOrderFilterValues) => void;
}

export { defaultFilters };

export default function ServiceOrderFilters({ filters, onChange }: Props) {
  const isMobile = useIsMobile();
  const { data: technicians } = useTechniciansList();
  const { data: collectionPoints } = useAllCollectionPoints();

  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (v === null || v === undefined) return false;
    return true;
  }).length;

  const update = (partial: Partial<ServiceOrderFilterValues>) => {
    const next = { ...filters, ...partial };
    // If origin changes to 'counter', clear collection point
    if (partial.origin === "counter") next.collectionPointId = null;
    onChange(next);
  };

  const clear = () => onChange({ ...defaultFilters });

  const content = (
    <div className="space-y-4">
      {/* Status */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Status</label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(statusLabels) as [ServiceOrderStatus, string][]).map(([k, v]) => (
            <Badge
              key={k}
              className={cn(
                "cursor-pointer transition-all text-xs",
                filters.status === k
                  ? statusColors[k]
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              onClick={() => update({ status: filters.status === k ? null : k })}
            >
              {v}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Priority */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Prioridade</label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(priorityLabels) as [ServiceOrderPriority, string][]).map(([k, v]) => (
            <Badge
              key={k}
              className={cn(
                "cursor-pointer transition-all text-xs",
                filters.priority === k
                  ? priorityColors[k]
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              onClick={() => update({ priority: filters.priority === k ? null : k })}
            >
              {v}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Origin */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Origem</label>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            className={cn(
              "cursor-pointer transition-all text-xs gap-1",
              filters.origin === "counter"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
            onClick={() => update({ origin: filters.origin === "counter" ? null : "counter" })}
          >
            <Store className="h-3 w-3" /> Balcão
          </Badge>
          <Badge
            className={cn(
              "cursor-pointer transition-all text-xs gap-1",
              filters.origin === "partner"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
            onClick={() => update({ origin: filters.origin === "partner" ? null : "partner" })}
          >
            <MapPin className="h-3 w-3" /> Parceiro
          </Badge>
        </div>
      </div>

      {/* Collection Point Selector — only when origin is 'partner' or null */}
      {filters.origin !== "counter" && collectionPoints && collectionPoints.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Ponto de Coleta</label>
          <Select
            value={filters.collectionPointId || "all"}
            onValueChange={(v) => update({ collectionPointId: v === "all" ? null : v, origin: v !== "all" ? "partner" : filters.origin })}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os pontos</SelectItem>
              {collectionPoints.map((cp: any) => (
                <SelectItem key={cp.id} value={cp.id}>{cp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Separator />

      {/* Technician */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Técnico Responsável</label>
        <Select
          value={filters.technicianId || "all"}
          onValueChange={(v) => update({ technicianId: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-full"><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os técnicos</SelectItem>
            {(technicians || []).map((t: any) => (
              <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Channel */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Canal de Entrada</label>
        <Select
          value={filters.intakeChannel || "all"}
          onValueChange={(v) => update({ intakeChannel: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-full"><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os canais</SelectItem>
            {(Object.entries(channelLabels) as [IntakeChannel, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Date range */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Período</label>
        <div className="grid grid-cols-2 gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal text-xs h-9", !filters.dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yy") : "De"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(d) => update({ dateFrom: d })}
                locale={ptBR}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal text-xs h-9", !filters.dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                {filters.dateTo ? format(filters.dateTo, "dd/MM/yy") : "Até"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo}
                onSelect={(d) => update({ dateTo: d })}
                locale={ptBR}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {activeCount > 0 && (
        <>
          <Separator />
          <Button variant="ghost" size="sm" onClick={clear} className="w-full text-destructive hover:text-destructive">
            <X className="mr-1 h-4 w-4" /> Limpar todos os filtros
          </Button>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Filter className="mr-1 h-4 w-4" /> Filtros
            {activeCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filtros Avançados
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="mr-1 h-4 w-4" /> Filtros
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] max-h-[80vh] overflow-y-auto" align="start">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Filter className="h-4 w-4" /> Filtros Avançados
        </h3>
        {content}
      </PopoverContent>
    </Popover>
  );
}
