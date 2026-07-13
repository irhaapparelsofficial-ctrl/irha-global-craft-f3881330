import ProductionQualityPanel from "@/components/admin/ProductionQualityPanel";
import ProductionShippingPanel from "@/components/admin/ProductionShippingPanel";
import ProductionCloseoutPanel from "@/components/admin/ProductionCloseoutPanel";
import ProductionFactoryWorkflowPanel from "@/components/admin/ProductionFactoryWorkflowPanel";

export default function ProductionWorkflowPanel() {
  return (
    <div className="space-y-6">
      <ProductionQualityPanel />
      <ProductionShippingPanel />
      <ProductionCloseoutPanel />
      <ProductionFactoryWorkflowPanel />
    </div>
  );
}
