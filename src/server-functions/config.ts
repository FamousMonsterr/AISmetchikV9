// src/server-functions/config.ts
// Central configuration for server-side analysis pipeline.

export const SERVER_ANALYSIS_COLLECTION = 'server_analysis_jobs';
export const SERVER_ANALYSIS_CREDIT_COST = 1;

export type ServerQuoteConfig = {
  taxType: 'none' | 'vat_included' | 'vat_added' | 'usn';
  includeCommissioning: boolean;
  commissioningCost: number;
  commissioningQuantity: number;
  includeExecutiveDocumentation: boolean;
  executiveDocumentationTotalCost: number;
  executiveDocumentationQuantity: number;
  includeMeasurementTrip: boolean;
  measurementTripCost: number;
  measurementTripQuantity: number;
  includeDismantling: boolean;
  dismantlingCost: number;
  includeWallDrilling: boolean;
  wallDrillingCount: number;
  wallDrillingCost: number;
  includeFloorDrilling: boolean;
  floorDrillingCount: number;
  floorDrillingCost: number;
  showMaterialColumns: boolean;
};

// Matches the client-side default quote config from AppContext, duplicated here to keep server code tree-shakable.
export const DEFAULT_SERVER_QUOTE_CONFIG: ServerQuoteConfig = {
  taxType: 'usn',
  includeCommissioning: true,
  commissioningCost: 7,
  commissioningQuantity: 1,
  includeMeasurementTrip: false,
  measurementTripCost: 0,
  measurementTripQuantity: 1,
  includeExecutiveDocumentation: true,
  executiveDocumentationTotalCost: 15000,
  executiveDocumentationQuantity: 1,
  includeDismantling: false,
  dismantlingCost: 0,
  includeWallDrilling: false,
  wallDrillingCount: 0,
  wallDrillingCost: 0,
  includeFloorDrilling: false,
  floorDrillingCount: 0,
  floorDrillingCost: 0,
  showMaterialColumns: true,
};
