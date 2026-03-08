import { useNavigate, useParams } from "react-router-dom";
import { useCustomer, useCustomerAddresses, useCustomerContacts } from "../hooks/useCustomers";
import { AddressSection } from "../components/AddressSection";
import { ContactSection } from "../components/ContactSection";
import { CustomerTimeline } from "../components/CustomerTimeline";
import CustomerWarrantyHistory from "@/modules/repair/components/CustomerWarrantyHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Pencil, Building2, User, Phone, Mail, MessageCircle, Loader2 } from "lucide-react";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id);
  const { data: addresses = [] } = useCustomerAddresses(id);
  const { data: contacts = [] } = useCustomerContacts(id);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!customer) {
    return <p className="text-center text-muted-foreground py-12">Cliente não encontrado.</p>;
  }

  const whatsappUrl = customer.whatsapp
    ? `https://wa.me/${customer.whatsapp.replace(/\D/g, "")}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/customers")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{customer.full_name}</h1>
              <Badge variant={customer.is_active ? "default" : "secondary"}>
                {customer.is_active ? "Ativo" : "Inativo"}
              </Badge>
              <Badge variant="outline" className="gap-1">
                {customer.type === "business" ? <><Building2 className="h-3 w-3" /> PJ</> : <><User className="h-3 w-3" /> PF</>}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Cadastrado em {new Date(customer.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate(`/customers/${id}/edit`)}>
          <Pencil className="mr-2 h-4 w-4" /> Editar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoItem label={customer.type === "business" ? "CNPJ" : "CPF"} value={customer.document} />
                <InfoItem label="Email" value={customer.email} icon={<Mail className="h-3.5 w-3.5" />} />
                <InfoItem label="Telefone" value={customer.phone} icon={<Phone className="h-3.5 w-3.5" />} />
                <div className="flex items-center gap-2">
                  <InfoItem label="WhatsApp" value={customer.whatsapp} icon={<MessageCircle className="h-3.5 w-3.5" />} />
                  {whatsappUrl && (
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-4">
                      Abrir
                    </a>
                  )}
                </div>
              </div>
              {customer.notes && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm font-medium mb-1">Observações</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{customer.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <AddressSection customerId={customer.id} addresses={addresses} />
          <ContactSection customerId={customer.id} contacts={contacts} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <CustomerTimeline customerId={customer.id} />
          <CustomerWarrantyHistory customerId={customer.id} />
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, icon }: { label: string; value: string | null; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-sm flex items-center gap-1.5 mt-0.5">
        {icon}
        {value || "—"}
      </p>
    </div>
  );
}
