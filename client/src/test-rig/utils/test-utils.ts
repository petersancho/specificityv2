/**
 * Shared test utilities for solver test rigs
 */

import { NODE_DEFINITIONS } from "../../workflow/nodeRegistry";

/**
 * Get node definition by type, throwing if not found
 */
export function getNodeDefinition(type: string) {
  const node = NODE_DEFINITIONS.find((definition) => definition.type === type);
  if (!node) {
    throw new Error(`Missing node definition for ${type}`);
  }
  return node;
}
