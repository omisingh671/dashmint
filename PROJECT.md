# DashMint / DashForge Project Notes

> Working name in the original requirement: **DashMint**  
> Repository reviewed: `https://github.com/omisingh671/dashmint`  
> Last reviewed: 2026-06-17

---

## 1. What this project is

DashMint is intended to be an MVP SaaS for generating **read-only admin dashboards from database schemas**.

The core idea is:

1. A **Super Admin** creates dashboards.
2. A dashboard is connected to a customer MySQL database or created from an uploaded Prisma schema.
3. The system introspects/parses tables and fields.
4. Schema metadata is saved in DashMint's own platform database.
5. The app dynamically renders sidebar navigation and table pages from saved schema metadata.
6. A Super Admin creates Admin users and assigns dashboards to them.
7. Admin users can only access dashboards assigned to them.
8. Admin users can read data and export CSV only if their assignment permissions allow it.

Important MVP principle:

> DashMint should be a **dynamic dashboard engine**, not a source-code generator.

It should not generate Next.js/React source files for each customer dashboard in MVP. The same frontend/backend engine should render different dashboards from metadata.

---

## 2. Original MVP scope

### Must have in MVP

- Super Admin authentication
- Admin authentication
- Super Admin dashboard
- Create/manage admins
- Create/manage dashboards
- Connect dashboard to MySQL database
- Upload Prisma schema text/file
- Parse/introspect schema tables and fields
- Save schema metadata in platform DB
- Generate sidebar/pages dynamically from metadata
- Assign dashboards to admins
- Admin sees only assigned dashboards
- Super Admin sees all dashboards
- Dynamic table page for each schema model/table
- Search, sort, pagination
- CSV export
- Basic RBAC:
  - `SUPER_ADMIN`: full access
  - `ADMIN`: assigned dashboard access only
  - Dashboard-level permissions: `read`, `export`
- Audit logs for important actions

### Explicitly out of MVP

- AI features
- MongoDB support
- PostgreSQL support
- Excel export
- Create/edit/delete customer DB records
- Generated source-code dashboards
- Over-engineered multi-tenant billing/subscription system

---

## 3. Intended tech stack

### Frontend

- Next.js / React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Query
- Zustand only where needed

### Backend

- Express
- TypeScript
- ESM only
- Zod validation
- JWT/session-based auth

### Databases

- Platform database: MySQL + Prisma
- Customer database v1: MySQL only
- Customer data access: dynamic MySQL query layer using `mysql2` or similar
- Prisma should only be used for the platform database, not customer databases

### Export

- CSV first
- Excel later

---

## 4. Current repository status from review

### Repo structure visible from GitHub

Current root-level items visible:

```txt
client
scripts
server
.gitignore
docker-compose.yml
package-lock.json
package.json
```

GitHub shows only **1 commit** at the time of review.

### Root package status

The root `package.json` defines a workspace-based project:

```json
{
  "name": "dashmint",
  "description": "DashMint MVP - Dynamic Dashboard Generator SaaS",
  "workspaces": ["client", "server"],
  "scripts": {
    "dev:server": "npm run dev --workspace=server",
    "dev:client": "npm run dev --workspace=client",
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "install:all": "npm install"
  }
}
```

### Important frontend status risk

GitHub root shows a `client` entry, but direct public access to `client/package.json` returned 404 during review.

This means one of these may be true:

- The frontend/client folder is missing or malformed.
- The `client` entry may not be a proper directory in the repo.
- The root workspace points to `client`, but the frontend may not be committed correctly.

Before continuing feature work, verify locally:

```bash
ls
ls client
cat client/package.json
```

On Windows PowerShell:

```powershell
dir
dir client
cat client/package.json
```

If `client/package.json` is missing, frontend setup is incomplete and should be fixed first.

---

## 5. Backend current status

The backend is present under `server` and uses:

- Express
- TypeScript
- ESM
- Prisma
- MySQL/MariaDB adapter packages
- `mysql2`
- JWT auth
- bcrypt password hashing
- cookie-based auth token
- audit logging service

### Backend scripts visible

```json
{
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "prisma:generate": "prisma generate",
  "prisma:db-push": "prisma db push",
  "prisma:studio": "prisma studio",
  "db:seed": "tsx src/seed.ts"
}
```

### Backend route modules visible

```txt
server/src/routes/admins.ts
server/src/routes/assignments.ts
server/src/routes/audit.ts
server/src/routes/auth.ts
server/src/routes/dashboards.ts
server/src/routes/query.ts
```

### Backend services visible

```txt
server/src/services/audit.ts
server/src/services/introspect.ts
server/src/services/query.ts
```

---

## 6. Platform database schema status

The Prisma schema already includes the core MVP models:

```txt
User
Dashboard
DatabaseConnection
DashboardAssignment
SchemaModel
SchemaField
AuditLog
```

It also includes:

```txt
GlobalRole enum:
- SUPER_ADMIN
- ADMIN
```

This matches the MVP requirement well.

### Current model responsibility

#### User

Stores platform users:

- Super Admin
- Admin

Important fields:

- `email`
- `passwordHash`
- `globalRole`

#### Dashboard

Represents one generated dashboard configuration.

Has relations to:

- database connection
- assignments
- schema models

#### DatabaseConnection

Stores customer MySQL connection details for a dashboard.

Current risk:

- Password appears to be stored directly as a string.
- For MVP local development this may work, but before production this should be encrypted at rest or moved to a secret manager.

#### DashboardAssignment

Connects Admin users to dashboards.

Stores `permissionsJson`, for example:

```json
{
  "read": true,
  "export": true
}
```

#### SchemaModel

Stores detected tables/models for a dashboard.

Important fields:

- actual table/model name
- display name
- visibility flag

#### SchemaField

Stores detected columns/fields for each model/table.

Important fields:

- actual field name
- display name
- type
- primary key flag
- nullable flag
- unique flag
- visibility flag

#### AuditLog

Stores important platform actions such as:

- login
- logout
- admin creation
- dashboard creation
- introspection
- CSV export

---

## 7. Current API route design status

### Auth routes

Base path:

```txt
/api/auth
```

Implemented/expected routes:

```txt
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

Current behavior:

- Login checks email/password.
- Password is compared using bcrypt.
- JWT is signed and stored in an HTTP-only cookie named `access_token`.
- `/me` returns authenticated user info.
- Login/logout actions are audit logged.

Important improvement needed:

- Move fallback JWT secret out of code. In production, app should fail loudly if `JWT_SECRET` is missing.
- Add Zod validation for auth payloads.

---

### Admin routes

Base path:

```txt
/api/admins
```

Implemented/expected routes:

```txt
GET    /api/admins
POST   /api/admins
PUT    /api/admins/:id
DELETE /api/admins/:id
```

Current behavior:

- Protected by authentication.
- Protected by `SUPER_ADMIN` global role.
- Super Admin can list, create, update, and delete Admin users.
- Admin creation/update/delete is audit logged.

Important improvement needed:

- Add Zod validation.
- Consider soft delete later, but hard delete is acceptable for MVP if simple.

---

### Dashboard routes

Base path:

```txt
/api/dashboards
```

Implemented/expected routes:

```txt
GET    /api/dashboards
POST   /api/dashboards
GET    /api/dashboards/:id
PUT    /api/dashboards/:id
DELETE /api/dashboards/:id
POST   /api/dashboards/:id/connection
POST   /api/dashboards/:id/introspect
POST   /api/dashboards/:id/upload-schema
PUT    /api/dashboards/:id/schema-config
```

Current behavior:

- Super Admin sees all dashboards.
- Admin sees only assigned dashboards.
- Super Admin can create/update/delete dashboards.
- Super Admin can save MySQL connection info.
- Super Admin can introspect customer MySQL schema.
- Super Admin can upload Prisma schema text.
- Super Admin can update visible tables/fields and display names.

Important improvement needed:

- Add connection test endpoint before saving credentials.
- Add password encryption before production.
- Add safer schema upload validation.
- Ensure Prisma schema parser handles `@@map`, `@map`, relation fields, enums, optional/list fields correctly.

---

### Assignment routes

Base path:

```txt
/api/assignments
```

Expected responsibility:

- Assign dashboard to Admin.
- Update dashboard permissions.
- Remove dashboard assignment.

Expected permission shape:

```json
{
  "read": true,
  "export": false
}
```

Need to verify full behavior in code before building UI.

---

### Query routes

Base path:

```txt
/api/query
```

Implemented/expected routes:

```txt
GET /api/query/:dashboardId/:tableName
GET /api/query/:dashboardId/:tableName/export
```

Current behavior:

- Uses dashboard access middleware.
- `read` permission required for table records.
- `export` permission required for CSV export.
- Uses dynamic MySQL query layer, not Prisma, for customer database records.
- Validates table and columns against saved schema metadata before query.
- Supports pagination, search, sort, and CSV export.

Important improvement needed:

- Validate `tableName` against `SchemaModel` before using it in SQL identifiers.
- Ensure table names and field names are strictly checked against metadata to prevent SQL injection.
- Add max export row limit and clear UX for large exports.
- Add query timeout.
- Add allowlist for visible fields only.

---

## 8. RBAC status

Current RBAC direction is correct.

### Current access model

#### Global access

```txt
SUPER_ADMIN -> full platform access
ADMIN       -> assigned dashboard access only
```

#### Dashboard-level access

Admin dashboard access is checked through `DashboardAssignment`.

Permissions are stored in `permissionsJson`.

Example:

```json
{
  "read": true,
  "export": true
}
```

### Middleware responsibilities

Current middleware includes:

```txt
authenticateToken
requireGlobalRole
requireDashboardAccess
```

This is the right MVP direction.

### Important RBAC rules to preserve

```txt
If user.globalRole === SUPER_ADMIN:
  allow all dashboards and all actions.

If user.globalRole === ADMIN:
  allow only dashboards assigned through DashboardAssignment.

Inside an assigned dashboard:
  allow only permitted actions such as read/export.
```

### RBAC improvements needed

- Validate `permissionsJson` with a typed helper instead of manually parsing everywhere.
- Use a shared permission utility:

```ts
canAccessDashboard(user, dashboardId);
canReadDashboard(user, dashboardId);
canExportDashboard(user, dashboardId);
```

- Consider replacing `permissionsJson: String` with a JSON field if Prisma/MySQL setup supports it cleanly.

---

## 9. Dynamic dashboard engine status

Current backend already supports the core idea:

1. Save dashboard.
2. Save customer database connection.
3. Introspect MySQL tables/columns.
4. Save metadata into platform DB.
5. Query customer DB dynamically using metadata.
6. Export CSV.

### Rendering plan for frontend

Frontend should not hardcode customer tables.

Frontend should work like this:

1. User logs in.
2. Frontend calls `/api/dashboards`.
3. Sidebar shows allowed dashboards.
4. User opens a dashboard.
5. Frontend calls `/api/dashboards/:id`.
6. Sidebar/pages are generated from `dashboard.models` where `isVisible = true`.
7. User clicks a table/model.
8. Frontend calls:

```txt
GET /api/query/:dashboardId/:tableName?page=1&limit=20&search=&sortBy=&sortOrder=
```

9. Frontend renders a reusable dynamic table component.
10. If user has export permission, show CSV export button.

### Reusable frontend components needed

```txt
DynamicDashboardShell
DynamicSidebar
DynamicModelPage
DynamicDataTable
TableToolbar
PaginationControls
SortHeaderCell
CsvExportButton
PermissionGate
```

---

## 10. Current gaps / risks

### 1. Frontend may be incomplete or missing

The root workspace expects a `client` package, but `client/package.json` was not publicly accessible during review.

This should be verified before continuing.

### 2. No clear project documentation yet

This `PROJECT.md` is created to solve that.

### 3. Zod validation not clearly implemented

The requirement included Zod, but route payloads currently appear to use manual checks in several places.

Next step should add route schemas.

### 4. Customer DB password storage is not production-safe yet

The `DatabaseConnection.password` field is stored directly.

For MVP local development, acceptable. Before production, improve this.

Recommended later options:

- encrypt before saving using app-level encryption key
- use AWS Secrets Manager / similar
- never return password in API responses

### 5. Prisma schema parser is basic

Good enough for early MVP demo, but may fail for real schemas with:

- `@@map`
- `@map`
- enums
- relation fields
- unsupported scalar types
- composite IDs
- composite unique constraints

### 6. SQL safety must stay strict

Dynamic SQL is dangerous if identifiers are not validated.

Current direction validates columns against metadata, which is good. Continue enforcing:

- table must exist in `SchemaModel`
- table must be visible
- field must exist in `SchemaField`
- field must be visible
- sort column must be allowlisted
- no raw table/field names from user input without metadata validation

### 7. Export size limit needed

Current export may fetch many records.

Add:

```txt
CSV_EXPORT_MAX_ROWS=50000
```

and show a user-friendly message when records exceed limit.

### 8. No AI should be added yet

Keep AI out of MVP until the dynamic dashboard engine is stable.

---

## 11. Recommended folder structure

### Root

```txt
dashmint/
  client/
  server/
  scripts/
  docs/
  PROJECT.md
  docker-compose.yml
  package.json
  package-lock.json
  .gitignore
```

### Server

```txt
server/
  prisma/
    schema.prisma
  src/
    index.ts
    config/
      env.ts
    lib/
      prisma.ts
      crypto.ts
    middleware/
      auth.ts
      error.ts
      validate.ts
    modules/
      auth/
        auth.routes.ts
        auth.schemas.ts
        auth.service.ts
      admins/
        admins.routes.ts
        admins.schemas.ts
        admins.service.ts
      dashboards/
        dashboards.routes.ts
        dashboards.schemas.ts
        dashboards.service.ts
      assignments/
        assignments.routes.ts
        assignments.schemas.ts
        assignments.service.ts
      schema/
        introspect.service.ts
        prisma-parser.service.ts
        schema-sync.service.ts
      query/
        query.routes.ts
        query.service.ts
        csv.service.ts
      audit/
        audit.routes.ts
        audit.service.ts
    permissions/
      rbac.ts
    utils/
      async-handler.ts
      http-error.ts
```

For now, the existing `routes/services/middleware` structure is acceptable. Do not refactor everything immediately unless it blocks progress.

### Client

```txt
client/
  app/ or src/
    app/
      login/
      dashboard/
      dashboards/
        [dashboardId]/
          page.tsx
          [modelName]/
            page.tsx
      super-admin/
        page.tsx
        admins/
        dashboards/
        audit-logs/
    features/
      auth/
      admins/
      dashboards/
      assignments/
      dynamic-dashboard/
      audit-logs/
    shared/
      api/
      components/
      hooks/
      lib/
      types/
```

---

## 12. Step-by-step MVP milestones from here

### Milestone 0 — Verify repo setup

Goal: make sure local setup is correct before building more.

Checklist:

- Confirm `client` folder exists.
- Confirm `server` installs correctly.
- Confirm `npm install` works from root.
- Confirm MySQL starts from `docker-compose.yml`.
- Confirm Prisma client generation works.
- Confirm seed creates a Super Admin.
- Confirm server starts.
- Confirm `/health` works.

Commands to try:

```bash
npm install
npm run dev:server
```

Inside server if needed:

```bash
cd server
npm run prisma:generate
npm run prisma:db-push
npm run db:seed
npm run dev
```

---

### Milestone 1 — Backend quality pass

Goal: make existing backend safer without changing behavior.

Tasks:

- Add `.env.example` for server.
- Add env validation.
- Remove unsafe fallback JWT secret in production.
- Add Zod validation middleware.
- Add Zod schemas for auth/admin/dashboard/assignment routes.
- Add centralized error handling.
- Add typed permissions helper.
- Keep API behavior same.

---

### Milestone 2 — Auth UI

Goal: login and session check from frontend.

Pages/components:

```txt
/login
ProtectedRoute/AuthGuard
DashboardLayout
LogoutButton
```

API hooks:

```txt
useLogin
useLogout
useMe
```

Expected behavior:

- Super Admin login redirects to Super Admin dashboard.
- Admin login redirects to assigned dashboards list.
- Unauthenticated user redirects to login.

---

### Milestone 3 — Super Admin admin-management UI

Goal: Super Admin can manage Admin users.

Pages:

```txt
/super-admin/admins
```

Features:

- List admins
- Create admin
- Update admin email/password
- Delete admin
- Show assigned dashboard count/name

---

### Milestone 4 — Super Admin dashboard-management UI

Goal: Super Admin can create dashboards and configure schema.

Pages:

```txt
/super-admin/dashboards
/super-admin/dashboards/new
/super-admin/dashboards/[id]
/super-admin/dashboards/[id]/schema
```

Features:

- Create dashboard
- Edit dashboard name/description
- Save MySQL connection
- Upload Prisma schema text
- Run MySQL introspection
- Preview detected tables/fields
- Toggle visible tables/fields
- Rename display names

---

### Milestone 5 — Assignment UI

Goal: assign dashboards to Admins with permissions.

Pages/components:

```txt
/super-admin/assignments
AssignDashboardDialog
PermissionCheckboxes
```

Permissions:

```txt
read
export
```

Rules:

- Admin cannot access unassigned dashboard.
- Admin cannot export unless export permission is true.

---

### Milestone 6 — Dynamic Admin dashboard engine UI

Goal: Admin can open assigned dashboard and view dynamic table pages.

Pages:

```txt
/dashboards
/dashboards/[dashboardId]
/dashboards/[dashboardId]/[tableName]
```

Features:

- Sidebar generated from visible `SchemaModel`
- Table generated from visible `SchemaField`
- Search
- Sort
- Pagination
- CSV export button only if permission allows

---

### Milestone 7 — Audit logs UI

Goal: Super Admin can review important activity.

Page:

```txt
/super-admin/audit-logs
```

Features:

- List logs
- Filter by action/user/date later
- MVP: simple paginated list is enough

---

### Milestone 8 — MVP hardening

Goal: make the MVP demo-safe.

Tasks:

- Add loading/error/empty states.
- Add 403 screens.
- Add basic server tests for RBAC.
- Add manual QA checklist.
- Add README setup steps.
- Add screenshot/demo flow later.

---

## 13. Immediate next step recommendation

Do this next:

> First verify whether the `client` folder is actually present and usable. If not, create the frontend app properly before adding more backend features.

Then implement this order:

1. Fix repo/workspace setup.
2. Add `.env.example` and setup docs.
3. Add Zod validation to backend routes.
4. Build login UI.
5. Build Super Admin dashboard list/admin management UI.
6. Build dashboard creation + schema preview flow.
7. Build dynamic table page.
8. Add assignment UI and permission gating.
9. Add audit logs UI.

---

## 14. Codex prompt for next step

Use this prompt next:

```txt
Review the current DashMint repo and verify the project setup before adding features.

Goal:
- Confirm whether the root npm workspace is valid.
- Confirm whether the client workspace actually exists and has package.json.
- Confirm server workspace installs/builds correctly.
- Confirm Prisma schema/client setup works.
- Confirm docker-compose MySQL setup matches server env expectations.
- Do not add new product features yet.

Tasks:
1. Inspect root package.json workspaces and folder structure.
2. If client workspace is missing or malformed, create/fix a minimal Next.js + TypeScript + Tailwind + shadcn-ready client without changing backend behavior.
3. Add/update .env.example files for root/server/client as needed.
4. Add a clean README setup section or update PROJECT.md with verified setup commands.
5. Run only necessary checks: install, server typecheck/build, and basic startup sanity if possible.
6. Report what was broken, what was fixed, and what remains.

Important:
- Do not implement AI.
- Do not add create/edit/delete for customer DB records.
- Keep customer DB access read-only.
- Do not support MongoDB/Postgres.
- Do not over-engineer.
```

---

## 15. Mental model to remember

DashMint has two databases in its architecture:

### 1. Platform DB

This is DashMint's own database.

It stores:

- users
- dashboards
- assignments
- permissions
- database connection configs
- schema metadata
- audit logs

Accessed with:

```txt
Prisma
```

### 2. Customer DB

This is the database connected by a Super Admin for a generated dashboard.

It stores customer application records.

Accessed with:

```txt
mysql2 dynamic query layer
```

Important rule:

> Prisma is only for DashMint platform DB. Customer data is queried dynamically and read-only in MVP.

---

## 16. MVP success definition

The MVP is successful when this flow works end-to-end:

1. Super Admin logs in.
2. Super Admin creates a dashboard.
3. Super Admin connects a MySQL database or uploads Prisma schema.
4. DashMint detects tables and fields.
5. Super Admin chooses visible tables/fields.
6. Super Admin creates an Admin user.
7. Super Admin assigns dashboard to Admin with read/export permission.
8. Admin logs in.
9. Admin sees only assigned dashboards.
10. Admin opens generated dashboard pages.
11. Admin can search/sort/paginate records.
12. Admin can export CSV only when allowed.
13. Audit logs capture important actions.
