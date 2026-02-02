# Test Solver Ontology

Document Version: 1.0
Date: 2026-01-31
Status: Complete

## EXECUTIVE SUMMARY

The test solver infrastructure in Specificity implements a sophisticated, pattern-driven architecture for testing computational solvers. This document defines the ontological structure of test rigs, enabling systematic creation of new test solver scripts that follow established conventions.

## 1. CORE ONTOLOGICAL ENTITIES

### 1.1 Test Rig (Orchestration Entity)

Definition: A test rig is an orchestration entity that coordinates the complete lifecycle of solver testing.

Essential Components:
- Hero Geometry Builder: Creates domain geometry for testing
- Context Creator: Wraps geometry in test execution context
- Goal Builder: Constructs solver-specific goals from fixtures
- Configuration Builder: Assembles solver parameters
- Solver Invoker: Executes the solver with inputs
- Report Builder: Captures and summarizes results
- Logger: Outputs structured test data
- Validator: Verifies correctness (optional)

Lifecycle Pattern:
Create Geometry → Wrap Context → Build Goals → Build Config → Invoke Solver → Build Report → Log Report → Return Results

Ontological Invariants:
- All test rigs follow identical lifecycle
- All test rigs return structured reports
- All test rigs are pure functions (no side effects except logging)
- All test rigs support variant execution

### 1.2 Fixture (Test Data Entity)

Definition: A fixture is a reusable test data entity that defines goals, configurations, and input parameters.

Essential Components:
- Goal Builders: Functions that construct GoalSpecification arrays
- Config Builders: Functions that construct solver-specific configurations
- Data Builders: Functions that construct input data (materials, seeds, etc.)
- Variant Builders: Functions that construct variant-specific data

Ontological Invariants:
- All fixtures are pure functions
- All fixtures return type-safe data structures
- All fixtures support parameterization
- All fixtures enable variant testing

### 1.3 Report (Result Capture Entity)

Definition: A report is a structured data entity that captures solver outputs, computes summary statistics, and enables validation.

Essential Components:
- Metadata: Label, timestamp, variant
- Input Summary: Mesh metrics, goals, configuration
- Output Summary: Solver results, performance metrics
- Statistical Summary: Min, max, mean, RMS of output fields
- Validation Data: Success flags, error messages, warnings

Ontological Invariants:
- All reports are JSON-serializable
- All reports include finite value checking
- All reports compute statistical summaries
- All reports enable temporal analysis (timestamps)

## 2. ONTOLOGICAL PATTERNS

### 2.1 The Tripartite Test Pattern

Pattern: All test rigs follow a three-file structure

Rationale:
- Separation of Concerns: Orchestration, data, and reporting are independent
- Reusability: Fixtures can be used in multiple test scenarios
- Maintainability: Changes to test data do not affect orchestration logic
- Testability: Each component can be tested independently

### 2.2 The Geometry Wrapping Pattern

Pattern: All geometries are wrapped in MeshGeometry containers

Rationale:
- Type Safety: Ensures geometry conforms to Geometry interface
- Traceability: sourceNodeId tracks geometry origin
- Layering: layerId enables layer-based organization
- Metadata: Extensible metadata for debugging

### 2.3 The Context Creation Pattern

Pattern: All test rigs create a TestContext that maps geometry IDs to geometry objects

Rationale:
- Isolation: Test context is independent of global state
- Lookup: Enables geometry lookup by ID (required by solvers)
- Purity: Test rigs remain pure functions
- Flexibility: Multiple geometries can be registered

## 3. ONTOLOGICAL PRINCIPLES

### 3.1 Purity Principle

Principle: All test rig functions are pure (no side effects except logging).

Rationale:
- Enables deterministic testing
- Simplifies debugging
- Allows parallel execution
- Facilitates regression testing

### 3.2 Separation Principle

Principle: Orchestration, data, and reporting are separated into distinct files.

Rationale:
- Reduces coupling
- Improves maintainability
- Enables independent testing
- Clarifies responsibilities

### 3.3 Consistency Principle

Principle: All test rigs follow identical lifecycle and structure.

Rationale:
- Reduces cognitive load
- Enables pattern recognition
- Simplifies onboarding
- Facilitates automation

### 3.4 Type Safety Principle

Principle: All test data is type-safe and validated at compile time.

Rationale:
- Prevents runtime errors
- Enables IDE autocomplete
- Documents expected structure
- Catches errors early

### 3.5 Fail-Fast Principle

Principle: All validations throw on failure (no silent failures).

Rationale:
- Prevents cascading errors
- Simplifies debugging
- Makes failures obvious
- Enables quick iteration

## 4. CREATING NEW TEST SOLVER SCRIPTS

### 4.1 Checklist for New Test Rigs

Step 1: Create Fixture File
- Define solver-specific configuration type
- Implement goal builder functions
- Implement configuration builder function
- Implement data builder functions (if needed)
- Support variant builders (if applicable)

Step 2: Create Report File
- Define report type with all required fields
- Implement summarization functions for output fields
- Implement report builder function
- Implement logging function
- Include finite value checking

Step 3: Create Example File
- Implement hero geometry builder
- Implement test rig orchestration function
- Support variant execution
- Return structured report
- Follow lifecycle pattern

Step 4: Create Validation File
- Implement assertion functions
- Define tolerance parameters
- Implement consistency checks
- Test all variants
- Verify report statistics

Step 5: Integration
- Add to solver-rigs.ts registry
- Add to documentation
- Add to test suite
- Verify in browser console

## 5. SUMMARY

The test solver ontology defines:
- Four core entities: Test Rig, Fixture, Report, Validation
- Three solver-specific ontologies: Physics, Chemistry, Voxel/Topology
- Seven ontological patterns
- Seven ontological principles

Creating new test solver scripts requires:
1. Understanding the tripartite structure (example, fixtures, report)
2. Following the lifecycle pattern
3. Implementing solver-specific goal types and configurations
4. Supporting variant execution
5. Including statistical summarization and validation
6. Adhering to ontological principles

The test solver infrastructure is ready for extension and new solver development.

END OF DOCUMENT
