# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep rendering and interaction in React, and route all API requests through the shared client using relative `/api` paths. Each capability view exposes loading, empty, and accessible error states.
- Logic tier decision: Keep request validation, business rules, and response shaping in Express routes/services. Return deliberate 4xx responses for invalid or unknown input rather than leaking database cast or validation errors as 500s.
- Data tier decision: Use Mongoose models for persisted fields, required-field validation, references, and defaults; keep representative, idempotent seed behavior in the seed script.
- Activity tracking approach: Accept `userId`, `teamId`, `type`, and `minutes`; validate ID shape and referenced records before writing. Persist references and submitted activity details, and compute `points` and `occurredAt` on the server.
- Team management approach: Require a name, preserve the submitted name and mascot, and store member references consistently when creating and listing teams.
- Leaderboard approach: Aggregate activity points per team, sort descending by total, and return `teamName`, `totalPoints`, and sequential 1-based ranks.
- Workout suggestions approach: Find the user by email, use their goal and recent activity to select matching workout suggestions, and include a reason for the leading suggestion. Return a deliberate 4xx when no user matches.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
    1- 1 passed, 4 failed
  - The failures indicate missing model validation for required user, team, activity, and workout fields; the seed/idempotency test passed.
- API command: `npm run test:api --prefix octofit-tracker/backend`
    1- 4 failed
  - Failures indicate invalid activity and team requests are not returning the expected 4xx responses, the leaderboard is not aggregating activity points, and workout suggestions lack the expected reason.
- Frontend command: `npm test --prefix octofit-tracker/frontend`
    1- 15 failed
  - Failures indicate capability content and the user-specific workout request do not meet the contract, and route loading, empty, and accessible error states are missing.
- Backend build command: `npm run build --prefix octofit-tracker/backend`
    1- Not run yet; run after backend changes. Failures indicate TypeScript compilation problems.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
    1- Not run yet; run after frontend changes. Failures indicate TypeScript or Vite build problems.
