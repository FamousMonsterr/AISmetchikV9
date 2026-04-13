// src/lib/calculation.ts

import type { SpecificationItem, QuoteConfig } from '@/contexts/AppContext';

// Helper function to calculate item sum
export function calculateItemSum(item: SpecificationItem, quoteConfig: QuoteConfig): number {
    if (item.isInformational) return 0;
    
    let materialCostComponent = 0;
    
    // Check if the showMaterialColumns is explicitly set to false
    const showMaterials = quoteConfig.showMaterialColumns !== false;

    if (showMaterials) {
        const quantityForMaterial = (item.quantityToInstall || 0) + (item.quantityReserve || 0);
        materialCostComponent = (item.materialPrice || 0) * quantityForMaterial;
    }

    const installationCostComponent = (item.installationPrice || 0) * (item.quantityToInstall || 0);
    
    return parseFloat((materialCostComponent + installationCostComponent).toFixed(2));
}


// This function is now shared between the frontend and Excel generator.
export function calculateProjectTotals(specifications: SpecificationItem[], quoteConfig: QuoteConfig) {
    const specItemsTotalSum = specifications.reduce((acc, item) => acc + calculateItemSum(item, quoteConfig), 0);

    let servicesSubtotal = 0;
    
    const pnrCost = (specItemsTotalSum * (quoteConfig.commissioningCost / 100)) * (quoteConfig.commissioningQuantity || 0)

    if (quoteConfig.includeCommissioning) servicesSubtotal += pnrCost;
    if (quoteConfig.includeExecutiveDocumentation) servicesSubtotal += (quoteConfig.executiveDocumentationTotalCost || 0) * (quoteConfig.executiveDocumentationQuantity || 0);
    if (quoteConfig.includeMeasurementTrip) servicesSubtotal += (quoteConfig.measurementTripCost || 0) * (quoteConfig.measurementTripQuantity || 0);
    if (quoteConfig.includeDismantling) servicesSubtotal += (quoteConfig.dismantlingCost || 0);
    if (quoteConfig.includeWallDrilling) servicesSubtotal += (quoteConfig.wallDrillingCost || 0) * (quoteConfig.wallDrillingCount || 0);
    if (quoteConfig.includeFloorDrilling) servicesSubtotal += (quoteConfig.floorDrillingCost || 0) * (quoteConfig.floorDrillingCount || 0);


    const subtotalBeforeTax = specItemsTotalSum + servicesSubtotal;

    let taxAmount = 0;
    let taxLabel = "";
    let finalTotal = subtotalBeforeTax;

    if (quoteConfig.taxType === 'vat_included') {
        taxAmount = subtotalBeforeTax * (20 / 120);
        taxLabel = "В т.ч. НДС (20%)";
    } else if (quoteConfig.taxType === 'vat_added') {
        taxAmount = subtotalBeforeTax * 0.20;
        taxLabel = "НДС (20%)";
        finalTotal = subtotalBeforeTax + taxAmount;
    } else if (quoteConfig.taxType === 'usn') {
        taxAmount = subtotalBeforeTax * 0.06;
        taxLabel = "УСН (6%)";
        finalTotal = subtotalBeforeTax + taxAmount;
    }

    return { 
        subtotalBeforeTax: parseFloat(subtotalBeforeTax.toFixed(2)),
        specItemsTotalSum: parseFloat(specItemsTotalSum.toFixed(2)),
        servicesSubtotal: parseFloat(servicesSubtotal.toFixed(2)),
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        finalTotal: parseFloat(finalTotal.toFixed(2)),
        taxLabel 
    };
}
