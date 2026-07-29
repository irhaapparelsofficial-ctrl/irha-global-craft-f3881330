import type { LocaleCode } from "@/lib/i18nFoundation";
import type { MaterialEntry } from "@/data/buyerCapabilities";

type LocalizedTechnicalText = Readonly<Record<LocaleCode, string>>;

const TECHNICAL_TEXT: Readonly<Record<string, LocalizedTechnicalText>> = {
  "Typically 100% cotton; blends by order": { en: "Typically 100% cotton; blends by order", de: "Üblicherweise 100 % Baumwolle; Mischungen je Auftrag", fr: "Généralement 100 % coton ; mélanges selon commande", nl: "Doorgaans 100% katoen; mengsels per order" },
  "Typically 100% compact-spun cotton": { en: "Typically 100% compact-spun cotton", de: "Üblicherweise 100 % kompaktgesponnene Baumwolle", fr: "Généralement 100 % coton filé compact", nl: "Doorgaans 100% compactgesponnen katoen" },
  "Typically cotton or cotton-rich blend": { en: "Typically cotton or cotton-rich blend", de: "Üblicherweise Baumwolle oder baumwollreiche Mischung", fr: "Généralement coton ou mélange riche en coton", nl: "Doorgaans katoen of een katoenrijke mix" },
  "Typically cotton or cotton-polyester": { en: "Typically cotton or cotton-polyester", de: "Üblicherweise Baumwolle oder Baumwoll-Polyester", fr: "Généralement coton ou coton-polyester", nl: "Doorgaans katoen of katoen-polyester" },
  "Cotton, cotton-elastane or blend by use": { en: "Cotton, cotton-elastane or blend by use", de: "Baumwolle, Baumwoll-Elastan oder Mischung je Einsatz", fr: "Coton, coton-élasthanne ou mélange selon l’usage", nl: "Katoen, katoen-elastaan of mix volgens toepassing" },
  "Commonly cotton with a small elastane percentage": { en: "Commonly cotton with a small elastane percentage", de: "Häufig Baumwolle mit geringem Elastananteil", fr: "Souvent coton avec un faible pourcentage d’élasthanne", nl: "Vaak katoen met een klein percentage elastaan" },
  "Cotton, cotton-rich or cotton-polyester": { en: "Cotton, cotton-rich or cotton-polyester", de: "Baumwolle, baumwollreich oder Baumwoll-Polyester", fr: "Coton, riche en coton ou coton-polyester", nl: "Katoen, katoenrijk of katoen-polyester" },
  "Cotton-rich or cotton-polyester by programme": { en: "Cotton-rich or cotton-polyester by programme", de: "Baumwollreich oder Baumwoll-Polyester je Programm", fr: "Riche en coton ou coton-polyester selon le programme", nl: "Katoenrijk of katoen-polyester per programma" },
  "Cotton-rich or cotton-polyester by construction": { en: "Cotton-rich or cotton-polyester by construction", de: "Baumwollreich oder Baumwoll-Polyester je Konstruktion", fr: "Riche en coton ou coton-polyester selon la construction", nl: "Katoenrijk of katoen-polyester volgens constructie" },
  "Cotton-polyester ratio selected by programme": { en: "Cotton-polyester ratio selected by programme", de: "Baumwoll-Polyester-Verhältnis je Programm gewählt", fr: "Ratio coton-polyester choisi selon le programme", nl: "Katoen-polyesterverhouding gekozen per programma" },
  "Typically 100% polyester": { en: "Typically 100% polyester", de: "Üblicherweise 100 % Polyester", fr: "Généralement 100 % polyester", nl: "Doorgaans 100% polyester" },
  "Polyester with elastane percentage selected by stretch target": { en: "Polyester with elastane percentage selected by stretch target", de: "Polyester mit Elastananteil gemäß gewünschter Dehnung", fr: "Polyester avec taux d’élasthanne choisi selon l’extensibilité visée", nl: "Polyester met elastaanpercentage volgens de gewenste stretch" },
  "Typically polyester; stretch versions by order": { en: "Typically polyester; stretch versions by order", de: "Üblicherweise Polyester; Stretchversionen je Auftrag", fr: "Généralement polyester ; versions extensibles selon commande", nl: "Doorgaans polyester; stretchversies per order" },
  "Polyester or polyester blend selected by programme": { en: "Polyester or polyester blend selected by programme", de: "Polyester oder Polyestermischung je Programm", fr: "Polyester ou mélange polyester choisi selon le programme", nl: "Polyester of polyestermix gekozen per programma" },
  "Polyester or nylon blend with elastane by target recovery": { en: "Polyester or nylon blend with elastane by target recovery", de: "Polyester- oder Nylonmischung mit Elastan gemäß gewünschtem Rücksprung", fr: "Mélange polyester ou nylon avec élasthanne selon la reprise visée", nl: "Polyester- of nylonmix met elastaan volgens het gewenste herstel" },
  "Natural cowhide": { en: "Natural cowhide", de: "Natürliches Rindsleder", fr: "Cuir bovin naturel", nl: "Natuurlijk rundleer" },
  "Natural sheep leather": { en: "Natural sheep leather", de: "Natürliches Schafleder", fr: "Cuir de mouton naturel", nl: "Natuurlijk schapenleer" },
  "Natural goat leather": { en: "Natural goat leather", de: "Natürliches Ziegenleder", fr: "Cuir de chèvre naturel", nl: "Natuurlijk geitenleer" },
  "Cow, sheep or goat suede according to product": { en: "Cow, sheep or goat suede according to product", de: "Rinds-, Schaf- oder Ziegenvelours je Produkt", fr: "Daim bovin, mouton ou chèvre selon le produit", nl: "Rund-, schapen- of geitensuède volgens product" },
  "Polyester, cotton-blend or insulation system by design": { en: "Polyester, cotton-blend or insulation system by design", de: "Polyester, Baumwollmischung oder Isolationssystem je Design", fr: "Polyester, mélange coton ou système isolant selon le modèle", nl: "Polyester, katoenmix of isolatiesysteem volgens ontwerp" },

  "Typically 140–240 GSM": { en: "Typically 140–240 GSM", de: "Üblicherweise 140–240 GSM", fr: "Généralement 140–240 GSM", nl: "Doorgaans 140–240 GSM" },
  "Typically 160–260 GSM": { en: "Typically 160–260 GSM", de: "Üblicherweise 160–260 GSM", fr: "Généralement 160–260 GSM", nl: "Doorgaans 160–260 GSM" },
  "Typically 180–300 GSM": { en: "Typically 180–300 GSM", de: "Üblicherweise 180–300 GSM", fr: "Généralement 180–300 GSM", nl: "Doorgaans 180–300 GSM" },
  "Typically 180–260 GSM": { en: "Typically 180–260 GSM", de: "Üblicherweise 180–260 GSM", fr: "Généralement 180–260 GSM", nl: "Doorgaans 180–260 GSM" },
  "Typically 180–360 GSM": { en: "Typically 180–360 GSM", de: "Üblicherweise 180–360 GSM", fr: "Généralement 180–360 GSM", nl: "Doorgaans 180–360 GSM" },
  "Typically 170–300 GSM": { en: "Typically 170–300 GSM", de: "Üblicherweise 170–300 GSM", fr: "Généralement 170–300 GSM", nl: "Doorgaans 170–300 GSM" },
  "Typically 240–420 GSM": { en: "Typically 240–420 GSM", de: "Üblicherweise 240–420 GSM", fr: "Généralement 240–420 GSM", nl: "Doorgaans 240–420 GSM" },
  "Typically 320–480 GSM": { en: "Typically 320–480 GSM", de: "Üblicherweise 320–480 GSM", fr: "Généralement 320–480 GSM", nl: "Doorgaans 320–480 GSM" },
  "Typically 280–500 GSM": { en: "Typically 280–500 GSM", de: "Üblicherweise 280–500 GSM", fr: "Généralement 280–500 GSM", nl: "Doorgaans 280–500 GSM" },
  "Typically 400–600 GSM": { en: "Typically 400–600 GSM", de: "Üblicherweise 400–600 GSM", fr: "Généralement 400–600 GSM", nl: "Doorgaans 400–600 GSM" },
  "Typically 280–450 GSM": { en: "Typically 280–450 GSM", de: "Üblicherweise 280–450 GSM", fr: "Généralement 280–450 GSM", nl: "Doorgaans 280–450 GSM" },
  "Typically 130–220 GSM": { en: "Typically 130–220 GSM", de: "Üblicherweise 130–220 GSM", fr: "Généralement 130–220 GSM", nl: "Doorgaans 130–220 GSM" },
  "Typically 90–180 GSM": { en: "Typically 90–180 GSM", de: "Üblicherweise 90–180 GSM", fr: "Généralement 90–180 GSM", nl: "Doorgaans 90–180 GSM" },
  "Typically 220–320 GSM": { en: "Typically 220–320 GSM", de: "Üblicherweise 220–320 GSM", fr: "Généralement 220–320 GSM", nl: "Doorgaans 220–320 GSM" },
  "Typically discussed by thickness, about 0.9–1.3 mm": { en: "Typically discussed by thickness, about 0.9–1.3 mm", de: "Üblicherweise nach Stärke besprochen, etwa 0,9–1,3 mm", fr: "Généralement défini par l’épaisseur, environ 0,9–1,3 mm", nl: "Doorgaans besproken op dikte, circa 0,9–1,3 mm" },
  "Typically discussed by thickness, about 0.7–1.0 mm": { en: "Typically discussed by thickness, about 0.7–1.0 mm", de: "Üblicherweise nach Stärke besprochen, etwa 0,7–1,0 mm", fr: "Généralement défini par l’épaisseur, environ 0,7–1,0 mm", nl: "Doorgaans besproken op dikte, circa 0,7–1,0 mm" },
  "Typically discussed by thickness, about 0.8–1.1 mm": { en: "Typically discussed by thickness, about 0.8–1.1 mm", de: "Üblicherweise nach Stärke besprochen, etwa 0,8–1,1 mm", fr: "Généralement défini par l’épaisseur, environ 0,8–1,1 mm", nl: "Doorgaans besproken op dikte, circa 0,8–1,1 mm" },
  "Thickness confirmed from the approved sample or lot": { en: "Thickness confirmed from the approved sample or lot", de: "Stärke anhand des freigegebenen Musters oder Loses bestätigt", fr: "Épaisseur confirmée sur l’échantillon ou le lot approuvé", nl: "Dikte bevestigd op basis van het goedgekeurde monster of de partij" },
  "Typically 50–200 GSM; construction dependent": { en: "Typically 50–200 GSM; construction dependent", de: "Üblicherweise 50–200 GSM; abhängig von der Konstruktion", fr: "Généralement 50–200 GSM ; selon la construction", nl: "Doorgaans 50–200 GSM; afhankelijk van de constructie" },
};

function localizedTechnicalText(value: string, locale: LocaleCode): string {
  const localized = TECHNICAL_TEXT[value];
  if (!localized) throw new Error(`Missing localized technical material text: ${value}`);
  return localized[locale];
}

export function localizedMaterialSpecification(entry: MaterialEntry, locale: LocaleCode) {
  return {
    composition: localizedTechnicalText(entry.composition, locale),
    weight: localizedTechnicalText(entry.weight, locale),
  };
}

export const MATERIAL_TECHNICAL_SOURCE_COUNT = Object.keys(TECHNICAL_TEXT).length;
