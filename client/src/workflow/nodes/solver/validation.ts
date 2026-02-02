import type { GoalSpecification } from "./types";
import { clamp } from "./utils";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalizedGoals?: GoalSpecification[];
};

export const normalizeGoalWeights = (goals: GoalSpecification[]) => {
  const warnings: string[] = [];
  const weights = goals.map((goal) => (Number.isFinite(goal.weight) ? goal.weight : 0));
  const sum = weights.reduce((total, value) => total + value, 0);
  if (sum <= 0) {
    const normalized = goals.map((goal) => ({
      ...goal,
      weight: 1 / Math.max(goals.length, 1),
    }));
    warnings.push("Goal weights sum to 0. Using uniform weights.");
    return { goals: normalized, warnings };
  }
  if (Math.abs(sum - 1) > 1e-3) {
    const normalized = goals.map((goal) => ({
      ...goal,
      weight: clamp(goal.weight / sum, 0, 1),
    }));
    warnings.push("Goal weights normalized to sum to 1.0.");
    return { goals: normalized, warnings };
  }
  return { goals, warnings };
};

export const validatePhysicsGoals = (goals: GoalSpecification[]): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const allowedTypes = new Set(["stiffness", "volume", "load", "anchor"]);

  if (!Array.isArray(goals) || goals.length === 0) {
    return {
      valid: false,
      errors: ["Physics Solver requires at least one goal."],
      warnings,
    };
  }

  const anchors = goals.filter((goal) => goal.goalType === "anchor");
  if (anchors.length === 0) {
    errors.push("Physics Solver requires at least one Anchor goal.");
  }

  const volumeGoals = goals.filter((goal) => goal.goalType === "volume");
  if (volumeGoals.length > 1) {
    errors.push("Only one Volume goal is allowed per Physics Solver.");
  }

  const loadGoals = goals.filter((goal) => goal.goalType === "load");
  if (loadGoals.length > 0 && volumeGoals.length === 0) {
    errors.push("Load goals require a Volume goal to define material properties.");
  }

  goals.forEach((goal) => {
    if (!allowedTypes.has(goal.goalType)) {
      errors.push(`Goal type '${goal.goalType}' is not supported by Physics Solver.`);
      return;
    }
    const hasElements = Array.isArray(goal.geometry?.elements) && goal.geometry.elements.length > 0;
    if (goal.goalType === "volume") {
      return;
    }
    if (!hasElements) {
      errors.push(`${goal.goalType} goal has no geometric elements.`);
    }
  });

  const weightNormalization = normalizeGoalWeights(goals);
  warnings.push(...weightNormalization.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalizedGoals: weightNormalization.goals,
  };
};

export const validateChemistryGoals = (goals: GoalSpecification[]): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const allowedTypes = new Set([
    "chemStiffness",
    "chemMass",
    "chemBlend",
    "chemTransparency",
    "chemThermal",
  ]);

  if (!Array.isArray(goals) || goals.length === 0) {
    return {
      valid: false,
      errors: ["Chemistry Solver requires at least one goal."],
      warnings,
    };
  }

  if (!goals.some((goal) => goal.goalType === "chemBlend")) {
    warnings.push("Chemistry Solver is recommended to include a Blend goal.");
  }

  goals.forEach((goal) => {
    if (!allowedTypes.has(goal.goalType)) {
      errors.push(`Goal type '${goal.goalType}' is not supported by Chemistry Solver.`);
    }
  });

  const weightNormalization = normalizeGoalWeights(goals);
  warnings.push(...weightNormalization.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalizedGoals: weightNormalization.goals,
  };
};
