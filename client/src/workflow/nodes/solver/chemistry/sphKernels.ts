/**
 * SPH Kernel Functions
 * 
 * NUMERICA: Smoothed Particle Hydrodynamics kernel functions
 * 
 * Implements standard SPH kernels for particle-based fluid simulation:
 * - Wendland C2: Smooth kernel with compact support (general purpose)
 * - Spiky: Sharp gradient for pressure forces
 * - Poly6: Smooth for density computation
 * 
 * All kernels are normalized and have compact support (zero beyond smoothing radius h).
 * 
 * References:
 * - Müller et al. (2003) "Particle-Based Fluid Simulation for Interactive Applications"
 * - Wendland (1995) "Piecewise polynomial, positive definite and compactly supported radial functions"
 */

const PI = Math.PI;

// ═══════════════════════════════════════════════════════════════════════════
// WENDLAND C2 KERNEL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wendland C2 kernel - smooth, C2 continuous, compact support
 * 
 * W(r,h) = (21/(16πh³)) * (1 - r/h)⁴ * (1 + 4r/h)  for r < h
 *        = 0                                         for r >= h
 * 
 * Properties:
 * - C2 continuous (smooth second derivative)
 * - Compact support (zero beyond h)
 * - Positive definite
 * - Normalized (integral over R³ = 1)
 */
export const wendlandC2Kernel = (r: number, h: number): number => {
  if (r >= h) return 0;
  
  const q = r / h;
  const oneMinusQ = 1 - q;
  const oneMinusQ4 = oneMinusQ * oneMinusQ * oneMinusQ * oneMinusQ;
  const factor = 21 / (16 * PI * h * h * h);
  
  return factor * oneMinusQ4 * (1 + 4 * q);
};

/**
 * Gradient of Wendland C2 kernel
 * 
 * ∇W(r,h) = -(140/(16πh⁴)) * (1 - r/h)³ * (r/h) * (r̂)
 * 
 * Returns the gradient magnitude (multiply by direction vector to get full gradient)
 */
export const wendlandC2KernelGradient = (r: number, h: number): number => {
  if (r >= h || r < 1e-9) return 0;
  
  const q = r / h;
  const oneMinusQ = 1 - q;
  const oneMinusQ3 = oneMinusQ * oneMinusQ * oneMinusQ;
  const factor = -140 / (16 * PI * h * h * h * h);
  
  return factor * oneMinusQ3 * q / r;
};

// ═══════════════════════════════════════════════════════════════════════════
// SPIKY KERNEL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Spiky kernel - sharp gradient for pressure forces
 * 
 * W(r,h) = (15/(πh⁶)) * (h - r)³  for r < h
 *        = 0                       for r >= h
 * 
 * Properties:
 * - Sharp gradient (good for pressure forces)
 * - Compact support
 * - Normalized
 */
export const spikyKernel = (r: number, h: number): number => {
  if (r >= h) return 0;
  
  const hMinusR = h - r;
  const hMinusR3 = hMinusR * hMinusR * hMinusR;
  const factor = 15 / (PI * h * h * h * h * h * h);
  
  return factor * hMinusR3;
};

/**
 * Gradient of Spiky kernel
 * 
 * ∇W(r,h) = -(45/(πh⁶)) * (h - r)² * (r̂)
 * 
 * Returns the gradient magnitude (multiply by direction vector to get full gradient)
 */
export const spikyKernelGradient = (r: number, h: number): number => {
  if (r >= h || r < 1e-9) return 0;
  
  const hMinusR = h - r;
  const hMinusR2 = hMinusR * hMinusR;
  const factor = -45 / (PI * h * h * h * h * h * h);
  
  return factor * hMinusR2 / r;
};

// ═══════════════════════════════════════════════════════════════════════════
// POLY6 KERNEL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Poly6 kernel - smooth for density computation
 * 
 * W(r,h) = (315/(64πh⁹)) * (h² - r²)³  for r < h
 *        = 0                            for r >= h
 * 
 * Properties:
 * - Very smooth (good for density)
 * - Compact support
 * - Normalized
 */
export const poly6Kernel = (r: number, h: number): number => {
  if (r >= h) return 0;
  
  const h2 = h * h;
  const r2 = r * r;
  const h2MinusR2 = h2 - r2;
  const h2MinusR2_3 = h2MinusR2 * h2MinusR2 * h2MinusR2;
  const factor = 315 / (64 * PI * h * h * h * h * h * h * h * h * h);
  
  return factor * h2MinusR2_3;
};

/**
 * Gradient of Poly6 kernel
 * 
 * ∇W(r,h) = -(945/(32πh⁹)) * r * (h² - r²)² * (r̂)
 * 
 * Returns the gradient magnitude (multiply by direction vector to get full gradient)
 */
export const poly6KernelGradient = (r: number, h: number): number => {
  if (r >= h || r < 1e-9) return 0;
  
  const h2 = h * h;
  const r2 = r * r;
  const h2MinusR2 = h2 - r2;
  const h2MinusR2_2 = h2MinusR2 * h2MinusR2;
  const factor = -945 / (32 * PI * h * h * h * h * h * h * h * h * h);
  
  return factor * r * h2MinusR2_2 / r;
};

// ═══════════════════════════════════════════════════════════════════════════
// VISCOSITY KERNEL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Viscosity kernel - Laplacian for viscosity forces
 * 
 * ∇²W(r,h) = (45/(πh⁶)) * (h - r)  for r < h
 *          = 0                      for r >= h
 * 
 * Used for computing viscosity forces in SPH
 */
export const viscosityKernelLaplacian = (r: number, h: number): number => {
  if (r >= h) return 0;
  
  const factor = 45 / (PI * h * h * h * h * h * h);
  return factor * (h - r);
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute kernel value and gradient in one pass (more efficient)
 */
export const wendlandC2KernelAndGradient = (
  r: number,
  h: number
): { kernel: number; gradient: number } => {
  if (r >= h) return { kernel: 0, gradient: 0 };
  
  const q = r / h;
  const oneMinusQ = 1 - q;
  const oneMinusQ3 = oneMinusQ * oneMinusQ * oneMinusQ;
  const oneMinusQ4 = oneMinusQ3 * oneMinusQ;
  
  const h3 = h * h * h;
  const h4 = h3 * h;
  
  const kernel = (21 / (16 * PI * h3)) * oneMinusQ4 * (1 + 4 * q);
  const gradient = r < 1e-9 ? 0 : (-140 / (16 * PI * h4)) * oneMinusQ3 * q / r;
  
  return { kernel, gradient };
};

/**
 * Compute Spiky kernel value and gradient in one pass
 */
export const spikyKernelAndGradient = (
  r: number,
  h: number
): { kernel: number; gradient: number } => {
  if (r >= h) return { kernel: 0, gradient: 0 };
  
  const hMinusR = h - r;
  const hMinusR2 = hMinusR * hMinusR;
  const hMinusR3 = hMinusR2 * hMinusR;
  
  const h6 = h * h * h * h * h * h;
  
  const kernel = (15 / (PI * h6)) * hMinusR3;
  const gradient = r < 1e-9 ? 0 : (-45 / (PI * h6)) * hMinusR2 / r;
  
  return { kernel, gradient };
};
