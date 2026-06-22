import { ApparelProduct, CalculationResult } from './types';

const CURRENCY_MULTIPLIERS: Record<string, { rate: number; symbol: string }> = {
  USD: { rate: 1.0, symbol: '$' },
  EUR: { rate: 0.92, symbol: '€' },
  GBP: { rate: 0.78, symbol: '£' },
};

export const calculateMasterFOB = (
  product: ApparelProduct,
  quantity: number,
  currency: string = 'USD'
): CalculationResult => {
  // 1. Base Cost compiled directly from database fields
  const baseProductionCost =
    Number(product.base_material_cost) +
    Number(product.hardware_overhead) +
    Number(product.labor_packaging_base);

  let modifiedProductionCost = baseProductionCost;
  let marginMultiplier = 1.25; // Default batch markup (+25%)

  // 2. B2B Tier Logic Applied
  if (quantity >= 1000) {
    modifiedProductionCost = baseProductionCost * 0.85; // 15% flat volume discount
    marginMultiplier = 1.0; // Competitive bulk margin scaling
  } else if (quantity >= 300) {
    marginMultiplier = 1.12; // Mid-tier volume margin
  }

  const compiledBasePrice = modifiedProductionCost * marginMultiplier;

  // 3. Logistics & Port handling buffer (Sialkot Port clearing + regulatory compliance)
  const exportHandlingFactor = 1.1;
  const absoluteFOB_USD = compiledBasePrice * exportHandlingFactor;

  // 4. Currency Transformation
  const currencyConfig = CURRENCY_MULTIPLIERS[currency] || CURRENCY_MULTIPLIERS.USD;
  const finalFOB = absoluteFOB_USD * currencyConfig.rate;

  return {
    baseProductionCost,
    finalFOB,
    currencySymbol: currencyConfig.symbol,
    formattedPrice: `${currencyConfig.symbol}${finalFOB.toFixed(2)}`,
  };
};
