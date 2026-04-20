# Migration Patterns (v2)

## Pattern A: Feature Migration from Legacy HTML to React Route

Use this pattern for medium-risk domains (products, contacts, transactions) where the goal is to migrate behavior, not just visuals.

### Steps

1. **Stabilize shared service contracts**
- Keep data access in `src/services/repositories/*`.
- Keep plan/usage checks in `src/services/billing-limits/*`.
- Avoid embedding business rules in JSX components.

2. **Create feature-local domain utilities**
- Add pure functions for calculations and value normalization in `src/features/<feature>/domain/*`.
- Cover these utilities with deterministic unit tests before wiring UI.

3. **Create feature adapter**
- Expose a typed adapter in `src/features/<feature>/adapters/*` that orchestrates repositories and cross-cutting services.
- Keep compatibility behavior explicit in adapter methods.

4. **Create feature hook + components**
- Put async state and orchestration in hooks (`src/features/<feature>/hooks/*`).
- Keep UI components declarative and stateless where possible.
- No `window.*`, no `innerHTML`, no direct DOM querying for state.

5. **Route-level coexistence**
- New React feature lives in its own route/subtree.
- Keep legacy route as fallback until manual smoke and cutover are complete.

6. **Validation gates**
- `npm run typecheck`
- `npm run test`
- `npx vite build --outDir .tmp-dist --emptyOutDir true`
- Manual smoke for auth guard + CRUD + critical side effects.

## Pattern B: Legacy Slider/Gallery Replacement

If legacy UI uses jQuery/Slick:
- Prefer replacing with a simple React grid/list first.
- Only add advanced carousel behavior if required by product outcomes.
- Keep behavior parity focused on data actions, not plugin parity.

## Pattern C: Bulk Selection and Destructive Actions

- Track selection in React state (`Set<string>`).
- Implement page-level select-all explicitly.
- Confirm destructive actions via modal.
- Return operation summary for partial failures (`deleted`, `failed`, `failedIds`).

## Pattern D: Security Baseline in Repositories

- Always scope `update` and `delete` by `id` **and** `user_id`.
- Reject operations when no authenticated user is available.
- Add repository tests that verify security filters, not only happy path.

