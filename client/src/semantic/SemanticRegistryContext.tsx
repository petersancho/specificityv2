import React, { createContext, useContext, type ReactNode } from "react";
import type { OperationRegistry } from "./operationRegistry";

const SemanticRegistryContext = createContext<OperationRegistry | null>(null);

export interface SemanticRegistryProviderProps {
  registry: OperationRegistry;
  children: ReactNode;
}

export function SemanticRegistryProvider({ registry, children }: SemanticRegistryProviderProps) {
  return (
    <SemanticRegistryContext.Provider value={registry}>
      {children}
    </SemanticRegistryContext.Provider>
  );
}

export function useSemanticRegistry(): OperationRegistry {
  const registry = useContext(SemanticRegistryContext);
  if (!registry) {
    throw new Error("useSemanticRegistry must be used within SemanticRegistryProvider");
  }
  return registry;
}

export function useSemanticRegistryOptional(): OperationRegistry | null {
  return useContext(SemanticRegistryContext);
}
