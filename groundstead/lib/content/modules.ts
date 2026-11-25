// The ten modules of the journey: step 0 to step 8 plus the 72-hour city mode.
// Must match the module enums in content/schema/article.schema.json and spec.schema.json (a test checks this).
export const MODULES = ['readiness', 'fund', 'land', 'water', 'power', 'food', 'shelter', 'health', 'community', 'mode72'] as const;
export type ModuleId = (typeof MODULES)[number];
