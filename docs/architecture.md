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

- Presentation tier decision: keep UI concerns in React components and use a single shared API client to call relative `/api` URLs; render loading, empty, and error states in the components so the browser experience matches the backend contract without adding auth or extra state management.
- Logic tier decision: keep Express route handlers thin and move the business logic into the service layer, validating request payloads, looking up user/team records, and returning deliberate 4xx responses for malformed IDs or missing data instead of leaking database cast errors as 500s.
- Data tier decision: use Mongoose schemas for validation and defaults, with array defaults and required fields in the models, then seed representative users, teams, activities, and workouts idempotently so tests can safely reset and rerun against a clean in-memory MongoDB instance.
- Activity tracking approach: accept `userId`, `teamId`, `type`, and `minutes`; validate references before creating the record; compute `points` and `occurredAt` server-side; and reject invalid or unknown identifiers with a 4xx.
- Team management approach: require a `name` and `mascot`, default `members` to an empty array, and persist members as ObjectIds while exposing their IDs in the API response so the frontend can render membership correctly.
- Leaderboard approach: aggregate activity totals per team, sum points, sort descending, and assign a 1-based `rank` in the response so the UI can show ordered standings with no client-side sorting assumptions.
- Workout suggestions approach: match the logged-in user's email to a seeded user, inspect their recent activity and `fitnessGoal`, then return the top workout suggestion whose `focus` matches the current pattern and include a readable `reason` string explaining the recommendation.

## Test plan

Run the checks in this order so each failure points to a single missing layer and keeps the work incremental.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
  - Confirms schema validation and idempotent seed behavior before API logic is introduced.
- API command: `npm run test:api --prefix octofit-tracker/backend`
  - Exercises route behavior for activities, teams, leaderboard sorting, and workout recommendation logic.
- Frontend command: `npm test --prefix octofit-tracker/frontend`
  - Verifies the presentation layer is fetching the correct URLs and rendering loading, empty, and error states correctly.
- Backend build command: `npm run build --prefix octofit-tracker/backend`
  - Ensures TypeScript types and server logic compile without exposing runtime-only workarounds.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
  - Confirms the React app compiles and bundle output is valid for Vite.

The smallest safe flow is data model validation → API contracts → frontend rendering → final build verification. That order minimizes rework because the UI is built on the API contract, and the API contract is built on the data model contract.
