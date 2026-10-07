import type { ExSpec, World } from "./types";
export function preprocess(src: string): string;
export function normalizeWorld(w: unknown, file: string): World;
export function exercise(ex: unknown, where: string): ExSpec;
export function resetReport(): { errors: string[]; exCount: number };
export function getErrors(): string[];
export function getExerciseCount(): number;
