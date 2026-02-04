// ============================================================================
// SPARSE MATRIX UTILITIES
// ============================================================================

/**
 * Compressed Sparse Row (CSR) matrix format
 */
export interface CSRMatrix {
  rowPtr: Uint32Array;
  colIdx: Uint32Array;
  values: Float64Array;
  nrows: number;
  ncols: number;
}

/**
 * Triplet format for building sparse matrices
 */
export interface Triplet {
  row: number;
  col: number;
  value: number;
}

/**
 * Build CSR matrix from triplets (row, col, value)
 * Automatically sums duplicate entries
 */
export function buildCSRFromTriplets(
  triplets: Triplet[],
  nrows: number,
  ncols: number
): CSRMatrix {
  // Group by (row, col) and sum values
  const entries = new Map<string, number>();
  for (const t of triplets) {
    const key = `${t.row},${t.col}`;
    entries.set(key, (entries.get(key) ?? 0) + t.value);
  }
  
  // Convert to sorted triplets
  const uniqueTriplets: Triplet[] = [];
  for (const [key, value] of entries) {
    const [row, col] = key.split(',').map(Number);
    uniqueTriplets.push({ row, col, value });
  }
  
  // Sort by row, then column
  uniqueTriplets.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });
  
  // Count non-zeros per row
  const rowCounts = new Uint32Array(nrows);
  for (const t of uniqueTriplets) {
    rowCounts[t.row]++;
  }
  
  // Build row pointers
  const rowPtr = new Uint32Array(nrows + 1);
  rowPtr[0] = 0;
  for (let i = 0; i < nrows; i++) {
    rowPtr[i + 1] = rowPtr[i] + rowCounts[i];
  }
  
  // Allocate arrays
  const nnz = uniqueTriplets.length;
  const colIdx = new Uint32Array(nnz);
  const values = new Float64Array(nnz);
  
  // Fill arrays
  let idx = 0;
  for (const t of uniqueTriplets) {
    colIdx[idx] = t.col;
    values[idx] = t.value;
    idx++;
  }
  
  return { rowPtr, colIdx, values, nrows, ncols };
}

/**
 * Sparse matrix-vector multiplication: y = A * x
 */
export function matVec(A: CSRMatrix, x: Float64Array): Float64Array {
  const y = new Float64Array(A.nrows);
  
  for (let i = 0; i < A.nrows; i++) {
    let sum = 0;
    for (let j = A.rowPtr[i]; j < A.rowPtr[i + 1]; j++) {
      sum += A.values[j] * x[A.colIdx[j]];
    }
    y[i] = sum;
  }
  
  return y;
}

/**
 * Dot product of two vectors
 */
export function dot(a: Float64Array, b: Float64Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Vector addition: z = a + b
 */
export function vecAdd(a: Float64Array, b: Float64Array): Float64Array {
  const z = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) {
    z[i] = a[i] + b[i];
  }
  return z;
}

/**
 * Vector subtraction: z = a - b
 */
export function vecSub(a: Float64Array, b: Float64Array): Float64Array {
  const z = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) {
    z[i] = a[i] - b[i];
  }
  return z;
}

/**
 * Scaled vector addition: z = a + alpha * b
 */
export function axpy(alpha: number, a: Float64Array, b: Float64Array): Float64Array {
  const z = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) {
    z[i] = a[i] + alpha * b[i];
  }
  return z;
}

/**
 * Jacobi preconditioner (diagonal of A)
 */
export function buildJacobiPreconditioner(A: CSRMatrix): Float64Array {
  const diag = new Float64Array(A.nrows);
  
  for (let i = 0; i < A.nrows; i++) {
    for (let j = A.rowPtr[i]; j < A.rowPtr[i + 1]; j++) {
      if (A.colIdx[j] === i) {
        diag[i] = A.values[j];
        break;
      }
    }
    
    // Guard against zero/negative diagonal
    const value = diag[i];
    const safe = Math.abs(value);
    diag[i] = safe > 1e-14 ? safe : 1.0;
  }
  
  return diag;
}

/**
 * Apply Jacobi preconditioner: z = M^-1 * r
 */
export function applyJacobiPreconditioner(
  M: Float64Array,
  r: Float64Array
): Float64Array {
  const z = new Float64Array(r.length);
  for (let i = 0; i < r.length; i++) {
    z[i] = r[i] / M[i];
  }
  return z;
}

/**
 * Preconditioned Conjugate Gradient solver
 * Solves A * x = b for symmetric positive definite A
 */
export function solvePCG(
  A: CSRMatrix,
  b: Float64Array,
  x0?: Float64Array,
  tol: number = 1e-6,
  maxIters: number = 1000
): { x: Float64Array; converged: boolean; iters: number; residual: number } {
  const n = A.nrows;
  const b_norm = Math.sqrt(dot(b, b));
  if (b_norm === 0) {
    return { x: new Float64Array(n), converged: true, iters: 0, residual: 0 };
  }
  const x = x0 ? Float64Array.from(x0) : new Float64Array(n);
  
  // Build Jacobi preconditioner
  const M = buildJacobiPreconditioner(A);
  
  // Initial residual: r = b - A*x
  let r = vecSub(b, matVec(A, x));
  
  // Apply preconditioner: z = M^-1 * r
  let z = applyJacobiPreconditioner(M, r);
  
  // Initial search direction
  let p = Float64Array.from(z);
  
  // Initial residual norm
  let rz = dot(r, z);
  const tol_abs = tol * Math.max(1, b_norm);
  
  let converged = false;
  let iters = 0;
  
  for (iters = 0; iters < maxIters; iters++) {
    // Check convergence
    const r_norm = Math.sqrt(dot(r, r));
    if (r_norm < tol_abs) {
      converged = true;
      break;
    }
    
    // Ap = A * p
    const Ap = matVec(A, p);
    
    // alpha = (r^T z) / (p^T A p)
    const pAp = dot(p, Ap);
    if (Math.abs(pAp) < 1e-14) {
      // Breakdown
      break;
    }
    const alpha = rz / pAp;
    
    // x = x + alpha * p
    for (let i = 0; i < n; i++) {
      x[i] += alpha * p[i];
    }
    
    // r = r - alpha * Ap
    for (let i = 0; i < n; i++) {
      r[i] -= alpha * Ap[i];
    }
    
    // z = M^-1 * r
    z = applyJacobiPreconditioner(M, r);
    
    // beta = (r_new^T z_new) / (r_old^T z_old)
    const rz_new = dot(r, z);
    const beta = rz_new / rz;
    rz = rz_new;
    
    // p = z + beta * p
    for (let i = 0; i < n; i++) {
      p[i] = z[i] + beta * p[i];
    }
  }
  
  const residual = Math.sqrt(dot(r, r));
  
  return { x, converged, iters, residual };
}
