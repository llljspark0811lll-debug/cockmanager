export type LevelMode = "none" | "separate" | "filter";
export type BracketMode = "STANDARD" | "TEAM_BATTLE";

export function getVariantKey(mode: BracketMode, levelMode: LevelMode = "none"): string {
  return mode === "STANDARD" ? `STANDARD_${levelMode}` : mode;
}

export function normalizeLevelMode(value: string | null | undefined): LevelMode {
  if (value === "separate" || value === "filter") return value;
  return "none";
}
