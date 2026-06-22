export interface ApparelProduct {
  id: string;
  name: string;
  category: 'Leather & Bavarian' | 'Textile, Active & Leisure';
  base_material_cost: number;
  hardware_overhead: number;
  labor_packaging_base: number;
  sku: string;
}

export interface CalculationResult {
  baseProductionCost: number;
  finalFOB: number;
  currencySymbol: string;
  formattedPrice: string;
}
