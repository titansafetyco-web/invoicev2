// Source: allamericanasphaltpaving.com service pages (asphalt, seal coating, striping, speed bumps, concrete).
// Default rates are PLACEHOLDERS. Set your real pricing here.
export type Service = { name: string; unit: string; rate: number };
export const SERVICE_GROUPS: Record<string, Service[]> = {
  "Asphalt Paving": [
    { name: "New asphalt paving (residential driveway)", unit: "sq ft", rate: 4.5 },
    { name: "New asphalt paving (commercial parking lot)", unit: "sq ft", rate: 3.75 },
    { name: "Private road / HOA road paving", unit: "sq ft", rate: 3.5 },
    { name: "Base rock install & grading (DOT-approved)", unit: "sq ft", rate: 1.25 },
    { name: "Excavation (grass / concrete / pavers removal)", unit: "sq ft", rate: 1.5 },
  ],
  "Resurfacing & Overlay": [
    { name: "Asphalt overlay", unit: "sq ft", rate: 2.75 },
    { name: "Mill & resurface", unit: "sq ft", rate: 3.25 },
    { name: "Commercial parking lot resurfacing", unit: "sq ft", rate: 3.0 },
  ],
  "Repairs": [
    { name: "Pothole repair (saw-cut & hot mix patch)", unit: "each", rate: 350 },
    { name: "Depression / base repair", unit: "sq ft", rate: 8 },
    { name: "Surface leveling", unit: "sq ft", rate: 2.25 },
  ],
  "Seal Coating & Cracks": [
    { name: "Seal coating", unit: "sq ft", rate: 0.35 },
    { name: "Crack sealing", unit: "lin ft", rate: 1.25 },
  ],
  "Striping": [
    { name: "Parking lot line striping", unit: "lin ft", rate: 0.6 },
    { name: "Stall re-stripe", unit: "stall", rate: 8 },
    { name: "ADA / handicap markings", unit: "each", rate: 95 },
    { name: "Arrows, stop bars & legends", unit: "each", rate: 45 },
  ],
  "Speed Bumps & Bollards": [
    { name: "Asphalt speed bump", unit: "each", rate: 450 },
    { name: "Speed hump install", unit: "each", rate: 900 },
    { name: "Protective bollard install", unit: "each", rate: 275 },
    { name: "Car stop reset / replace", unit: "each", rate: 65 },
  ],
  "Concrete": [
    { name: "Concrete driveway", unit: "sq ft", rate: 9 },
    { name: "Concrete sidewalk (4\")", unit: "sq ft", rate: 8 },
    { name: "Concrete repair", unit: "sq ft", rate: 12 },
  ],
  "Other": [{ name: "Custom line item", unit: "each", rate: 0 }],
};
