export type Finding = { file: string; line: number; rule: string };
export const SERVER_ONLY_NAMES: readonly string[];
export function scanDir(dir: string): Finding[];
