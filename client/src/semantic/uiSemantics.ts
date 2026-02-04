import type { SemanticOpId } from "./semanticOpIds";
import type { ShadowToken } from "./uiShadowTokens";
import type { SpacingToken } from "./uiSpacingTokens";

export type UISemanticDomain =
  | "numeric" // numbers, vectors, parameters
  | "logic" // booleans, goals, constraints
  | "data" // strings, specs, metadata
  | "structure" // geometry, meshes, voxels
  | "feedback" // system feedback states
  | "neutral"; // no semantic meaning

export type UISemanticState =
  | "idle" // default
  | "active" // selected/focused
  | "computing" // operation in progress
  | "success" // operation completed
  | "warning" // needs attention
  | "error"; // operation failed

export interface UISemanticToken {
  id: string;
  domain: UISemanticDomain;
  state: UISemanticState;
  linkedOps?: SemanticOpId[];
  color: string;
  shadow: ShadowToken;
  spacing: SpacingToken;
}

export interface StickerSemanticMeta {
  stickerId: string;
  semanticOps: SemanticOpId[];
  domain: UISemanticDomain;
  accentColor?: string;
}

export type SpacingContext = SpacingToken | { token: SpacingToken };
