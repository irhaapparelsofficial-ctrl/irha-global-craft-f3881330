import ProductionQualityPanel from "@/components/admin/ProductionQualityPanel";
import ProductionFactoryWorkflowPanel from "@/components/admin/ProductionFactoryWorkflowPanel";

export default function ProductionWorkflowPanel() {
  return (
    <div className="space-y-6">
      <ProductionQualityPanel />
      <ProductionFactoryWorkflowPanel />
    </div>
  );
}
