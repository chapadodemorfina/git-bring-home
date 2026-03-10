import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Monitor, Eye } from "lucide-react";
import { useDevices } from "../hooks/useDevices";
import { deviceTypeLabels, DeviceType } from "../types";

export default function DevicesListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const { data: devices = [], isLoading } = useDevices(search, filterType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dispositivos</h1>
          <p className="text-muted-foreground">Gerenciamento de equipamentos</p>
        </div>
        <Button onClick={() => navigate("/devices/new")}>
          <Plus className="h-4 w-4 mr-2" /> Novo Dispositivo
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por marca, modelo, serial, IMEI, cor, problema..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType || "all"} onValueChange={(v) => setFilterType(v === "all" ? null : v)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {(Object.entries(deviceTypeLabels) as [DeviceType, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Carregando...</p>
          ) : devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Monitor className="h-12 w-12" />
              <p>Nenhum dispositivo encontrado</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Marca / Modelo</TableHead>
                    <TableHead className="hidden md:table-cell">Serial</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow
                      key={device.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/devices/${device.id}`)}
                    >
                      <TableCell>
                        <Badge variant="outline">{deviceTypeLabels[device.device_type]}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {[device.brand, device.model].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {device.serial_number || "—"}
                      </TableCell>
                      <TableCell>{device.customer_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={device.is_active ? "default" : "secondary"}>
                          {device.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
