# Warp Planning Guide

**Purpose:** Structured workflow for Warp when handling tasks that touch multiple files or require careful coordination. Use this for anything beyond simple, single-file changes.

**Last Updated:** Synthesized from plans.md

---

## When to Use This Guide

Use this planning workflow when:
- Task touches 3+ files
- Changes span multiple subsystems
- Risk of breaking existing functionality
- Task requires coordination with Codex (per Linear workflow)
- You're unsure of the scope

Skip this for:
- Single-file doc updates
- Simple CSS/UI tweaks
- Obvious, isolated fixes

---

## Warp's Scope

Warp is authorized to work on **all subsystems**, including:

- Documentation updates
- UI tweaks (CSS, labels, tooltips, components)
- Zustand store changes
- Rendering pipeline and WebGL
- Shaders (GLSL)
- Geometry kernel
- Workflow engine and node registry
- Commands and viewport
- Solvers

**Risk awareness:** Some subsystems are higher-risk. Apply extra care and testing when working on:
- Store state mutations (ensure atomic updates, history recording)
- Shaders (ensure vert/frag match, don't break attribute layouts)
- Geometry kernel (keep functions pure, don't mutate inputs)
- Rendering pipeline (dispose GPU resources properly)

**If unsure about approach:** Comment on the Linear issue to discuss before starting.

---

## Planning Process

### Phase 0: Scope and Verify

**Before writing any code:**

1. **Confirm Linear issue exists** with:
   - Goal
   - Context
   - Files likely touched
   - Success criteria
   - Labels (safe/risky + subsystem)

2. **Verify assignment** - Is this assigned to you (Warp)?

3. **Check for conflicts** - Is anyone else touching these files?

4. **List affected files** - Be explicit about what you'll change

### Phase 1: Research

**Gather context before changing anything:**

1. Read relevant existing code
2. Check how similar features are implemented
3. Identify patterns to follow
4. Note any dependencies or side effects

**Output:** Clear understanding of what to change and how

### Phase 2: Plan the Changes

**For each file you'll modify:**

The file paths below are examples; replace them with the actual files for your task.

| File | Change Type | Risk Level |
|------|-------------|------------|
| `docs/subsystems_guide.md` | Update | Low |
| `client/src/components/X.tsx` | Add prop | Medium |

**Checkpoint criteria:**
- Can you describe what each change does?
- Do you know the order of changes?
- Have you identified test/validation steps?

### Phase 3: Execute

**Work incrementally:**

1. Make one logical change at a time
2. Verify each change works before moving on
3. Keep commits small and focused

**Commit message format:**
```
<type>: <brief description>

<optional body>

Co-Authored-By: Warp <agent@warp.dev>
```

Types: `docs`, `fix`, `feat`, `refactor`, `style`, `test`

### Phase 4: Validate

**Before marking complete:**

- [ ] Changes match success criteria
- [ ] No console errors
- [ ] Existing functionality still works
- [ ] Tests pass (or explicitly skipped with reason)
- [ ] Docs updated if relevant

### Phase 5: Close Out

**Update Linear with:**
- What you did
- Files changed
- Tests run (or skipped + reason)
- Any risks or follow-ups
- Link to commit/PR

---

## Subsystem Quick Reference

Know which subsystem you're touching:

| Subsystem | Key Files | Risk Level |
|-----------|-----------|------------|
| **Docs** | `docs/*` | Low |
| **UI/CSS** | `*.css`, `*.module.css` | Low |
| **Store** | `useProjectStore.ts` | High - follow atomic update pattern |
| **Rendering** | `WebGLRenderer.ts`, `renderAdapter.ts` | High - dispose resources properly |
| **Shaders** | `webgl/shaders/*` | High - match vert/frag, don't break layouts |
| **Geometry** | `geometry/*` | Medium - keep functions pure |
| **Viewport** | `WebGLViewerCanvas.tsx` | High - large file, test interactions |
| **Workflow Engine** | `workflowEngine.ts` | Medium - test evaluation |
| **Node Registry** | `nodeRegistry.ts` | Medium - large file, test compute functions |
| **Commands** | `commands/registry.ts` | Medium - test command flow |

---

## Checkpoint Strategy

**Good checkpoint = safe stopping point**

A checkpoint is valid when:
- Code compiles without errors
- App still runs
- You can commit safely
- You can pause and resume later

**Recommended checkpoints:**
1. After research (before any code changes)
2. After each file is updated
3. After validation passes
4. After Linear is updated

---

## Collision Avoidance

**Prevent stepping on others' work:**

1. **Check Linear** - Is anyone else assigned to related work?
2. **Check recent commits** - Has the file been modified recently?
   ```bash
   git log --oneline -5 -- <file>
   ```
3. **If in doubt** - Comment on the Linear issue before starting

**If you discover a collision:**
1. Stop immediately
2. Comment on Linear explaining the overlap
3. Wait for resolution before continuing

---

## Templates

Replace the example file paths below with the actual files for your task.

### Linear Issue Comment (Starting Work)

```
Starting work on this issue.

**Files I'll touch:**
- docs/subsystems_guide.md
- client/src/components/Bar.tsx

**Approach:**
Brief description of planned changes.

**Estimated scope:** Small / Medium
```

### Linear Issue Comment (Completing Work)

```
Completed this issue.

**Changes:**
- Updated docs/subsystems_guide.md with new section
- Added tooltip to Bar component

**Files changed:**
- docs/subsystems_guide.md
- client/src/components/Bar.tsx

**Tests:**
- Manual verification: app loads, tooltip displays
- No automated tests for docs

**Risks/Follow-ups:**
- None / List any concerns

**Commit:** <hash or PR link>
```

---

## Checklist: Before Starting

- [ ] Linear issue exists and assigned to me
- [ ] Labels applied (subsystem + risk level)
- [ ] Success criteria defined
- [ ] I've listed files I'll touch
- [ ] No conflicts with others' current work
- [ ] For high-risk subsystems: reviewed relevant patterns in `warpagent.md`

## Checklist: Before Closing

- [ ] Changes match success criteria
- [ ] App runs without errors
- [ ] Tests run or explicitly skipped
- [ ] Linear comment posted with summary
- [ ] Commit/PR linked
- [ ] Docs updated if relevant

---

## When Things Go Wrong

### Build/compile errors after your change
1. Revert your change: `git checkout -- <file>`
2. Re-read the code you were modifying
3. Try again with smaller changes

### Accidentally touched risky code
1. Stop immediately
2. Revert: `git checkout -- <file>`
3. Comment on Linear explaining what happened
4. Reassign to Codex if needed

### Unsure if change is correct
1. Make the change in a separate branch
2. Comment on Linear with your approach
3. Ask for review before merging

### Merge conflict
1. Don't force push
2. Comment on Linear
3. Coordinate with whoever made the conflicting change

---

## Quick Commands

```bash
# Check recent changes to a file
git log --oneline -5 -- <file>

# See what you've changed
git diff

# Revert a file
git checkout -- <file>

# Create a checkpoint commit
git add -A && git commit -m "WIP: checkpoint"

# Run tests
npm test -w client

# Type check
npm run build -w client
```

---

## Summary

1. **Verify** - Is this in Warp's scope? Is there a Linear issue?
2. **Research** - Understand before changing
3. **Plan** - Know what files you'll touch
4. **Execute** - Small, incremental changes
5. **Validate** - Confirm it works
6. **Close** - Update Linear with summary

**When in doubt, ask in Linear before proceeding.**
