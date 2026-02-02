# SIMULATOR IMPLEMENTATION PLAN
## PhD-Level Quality Without External Libraries

**Philosophy:** Lingua builds everything from scratch. No external libraries. We learn and implement the math ourselves.

---

## CURRENT STATE ASSESSMENT

### ChemistrySolver - 60% Complete
**What Works:**
- Particle pool (Structure of Arrays)
- Spatial hashing for neighbor finding
- Basic SPH density computation
- Material diffusion
- Goal-based forces
- Voxel field generation
- Simplified marching cubes

**Missing for PhD-Level:**
- Proper SPH kernel functions (Wendland C2, Spiky, Poly6)
- Pressure forces (Tait equation of state)
- Viscosity forces (XSPH, artificial viscosity)
- Surface tension
- Centrifugal force field
- Proper time integration (Verlet, Leapfrog)
- Boundary handling
- Full marching cubes with edge interpolation

---

## IMPLEMENTATION PHASES

### Phase 1: ChemistrySolver - SPH Kernels & Pressure (3-4 days)

**Goal:** Implement proper SPH physics for realistic fluid/particle simulation.

**Tasks:**

1. **Implement SPH Kernel Functions** (1 day)
   - Wendland C2 kernel (smooth, compact support)
   - Spiky kernel (pressure forces)
   - Poly6 kernel (density computation)
   - Kernel gradient functions

2. **Implement Pressure Forces** (1 day)
   - Tait equation of state
   - Pressure gradient computation
   - Pressure force application

3. **Implement Viscosity Forces** (1 day)
   - XSPH velocity smoothing
   - Artificial viscosity
   - Viscous damping

4. **Implement Centrifugal Force** (0.5 days)
   - Rotation axis and angular velocity parameters
   - Radial acceleration field

5. **Testing & Validation** (0.5 days)
   - Dam break test
   - Material stratification test
   - Centrifugal blending test

**Total Timeline:** 22-31 days for all phases

**Philosophy:** Build everything from scratch. Learn the math. Implement it ourselves. This is Lingua.
