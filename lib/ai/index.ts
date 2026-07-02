/** Public surface of the AI layer. Server-side only — do not import from client components. */
export { isAiEnabled, GEMINI_MODEL } from "./client";
export { parseScenario } from "./parse";
export { explainSimulation, explainVulnerability, explainBudget } from "./explain";
export { explainEnvironment, explainPolicy } from "./explainNew";
export {
  CANNED_RESPONSES,
  matchCanned,
  keywordParse,
  normalizeQuestion,
  detectIntervention,
  extractMagnitude,
  findZone,
  type ZoneRef,
} from "./canned";
