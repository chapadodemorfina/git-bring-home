import StockMovementsTable from "../components/StockMovementsTable";

export default function StockMovementsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Movimentações de Estoque</h1>
      <StockMovementsTable />
    </div>
  );
}
