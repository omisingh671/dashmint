# Dashmint Project Blueprint

## 1. Product Summary

Dashmint is a SaaS platform that turns a customer’s MySQL database/schema into a secure admin dashboard with role-based access, dynamic table pages, reports, filters, search, pagination, and CSV export.

The goal is to help businesses quickly create internal dashboards without manually coding every admin panel from scratch.

---

## 2. Core Idea

Dashmint should not generate source code in MVP.

It should work as a dynamic dashboard engine:

- Super Admin creates dashboards.
- Super Admin connects a customer MySQL database or uploads schema.
- Dashmint detects tables, fields, and relations.
- Super Admin chooses which tables/reports are visible.
- Super Admin creates admins and assigns dashboards/reports.
- Admins only see assigned dashboards and allowed actions.
- Customer database access is read-only in MVP.

---

## 3. Target Users

### Super Admin

The owner/operator of Dashmint or the main client account owner.

Can:

- Manage dashboards
- Manage admins
- Connect databases
- Configure schema
- Configure reports
- Assign permissions
- View audit logs

### Admin / Manager

Client-side user who uses assigned dashboards.

Can:

- View assigned dashboards
- View permitted table pages
- View permitted reports
- Search/filter/sort data
- Export CSV only if allowed

---

## 4. MVP Scope

### Authentication

- Super Admin login
- Admin login
- JWT/session-based auth

### Dashboard Management

- Create dashboard
- Edit dashboard
- Delete/disable dashboard
- Assign dashboard to admin

### Admin Management

- Create admin
- Edit admin
- Disable admin
- Assign dashboard permissions

### Schema Management

- Connect MySQL database
- Upload Prisma schema
- Detect tables and fields
- Save schema metadata
- Choose visible tables
- Refresh schema

### Dynamic Table Pages

- Generate sidebar/pages from selected schema tables
- Show table records
- Search
- Sort
- Pagination
- CSV export

### RBAC

- SUPER_ADMIN has full access
- ADMIN only sees assigned dashboards
- Permissions per dashboard/table/report
- Read/export permissions

### Reports

- Detect/review table relations
- Add manual relations
- Create report pages from related tables
- Select columns
- Add filters
- Preview report
- Save report
- Assign report permissions
- Run report
- Export CSV if allowed

### Audit Logs

Track important actions:

- Login
- Dashboard create/update/delete
- Admin create/update/delete
- Assignment changes
- Schema refresh
- Report create/update/delete
- CSV export

---

## 5. Out of Scope for MVP

Do not build these yet:

- AI report generation
- MongoDB support
- PostgreSQL support
- Excel export
- Charts
- Customer data create/edit/delete
- Custom workflow actions
- White labeling
- Custom domains
- Scheduled reports
- Row-level permissions
- Natural language report builder

---

## 6. Tech Stack

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
- JWT/session auth

### Database

- Platform DB: MySQL with Prisma
- Customer DB v1: MySQL only
- Customer DB query layer: mysql2 or Kysely

### Export

- CSV first
- Excel later

---

## 7. Core Platform Models

- User
- Dashboard
- DashboardAssignment
- DatabaseConnection
- SchemaModel
- SchemaField
- SchemaRelation
- ReportDefinition
- ReportColumn
- ReportFilter
- Permission / permissionsJson
- AuditLog

---

## 8. Access Rules

If user role is SUPER_ADMIN:

- Allow all dashboards
- Allow all reports
- Allow all table pages
- Allow all management actions

If user role is ADMIN:

- Allow only assigned dashboards
- Allow only permitted tables
- Allow only permitted reports
- Allow export only if export permission exists

---

## 9. Dynamic Table Engine

The table engine should:

- Load dashboard schema metadata
- Show selected tables in sidebar
- Fetch records from customer DB dynamically
- Support search, sort, pagination
- Support CSV export
- Use only whitelisted table and field names
- Never expose DB credentials to frontend
- Never allow raw SQL from frontend

---

## 10. Report Engine

The report engine should:

- Use saved schema metadata
- Use saved table relations
- Let Super Admin create reports from base table + related tables
- Generate safe backend SQL
- Use parameterized queries
- Support filters
- Support pagination
- Support CSV export
- Respect report permissions

Reports should support business use cases like:

- Booking report
- Repeat customers
- Most booked room/unit/property
- Revenue report
- Season-wise spikes

---

## 11. Schema Relation Engine

The relation engine should:

- Detect real MySQL foreign keys
- Suggest likely relations from field names
- Allow Super Admin to manually add/edit/disable relations
- Save relations per dashboard

Example:

- bookings.customerId → customers.id
- bookings.roomId → rooms.id
- rooms.unitId → units.id
- units.propertyId → properties.id
- payments.bookingId → bookings.id

---

## 12. Example Rental Business Use Case

A rental booking customer needs reports like:

- Bookings with date/property/status filters
- Repeat customers
- Most booked room
- Most booked unit
- Most booked property
- Revenue by date range
- Season-wise booking spikes
- Cancellation/refund reports

Dashmint should support this through report definitions, not hardcoded rental logic.

---

## 13. Current Status

Update this section after every major implementation.

### Built

- [x] Super Admin auth
- [x] Admin auth
- [x] Dashboard management
- [x] Admin management
- [x] Dashboard assignment
- [x] Database connection
- [x] Schema introspection
- [x] Dynamic table pages
- [x] CSV export
- [x] Audit logs
- [x] Schema relation mapping
- [x] Report builder
- [x] Report viewer
- [x] Report permissions
- [x] Secured/encrypted Database Connection credentials
- [x] Business Packs report presets (Rental, Education, E-commerce)

### In Progress

- None

### Pending

- None

---

## 14. Development Rules

- Do not over-engineer.
- Do not rewrite the whole app unnecessarily.
- Preserve existing working behavior.
- Build in small safe steps.
- Keep customer DB read-only in MVP.
- Use Prisma only for platform DB.
- Use dynamic MySQL query layer for customer DB.
- Validate inputs with Zod.
- Use parameterized queries.
- Never allow raw SQL from frontend.
- Never expose customer DB credentials to frontend.
- Keep frontend and backend synced.

### Code Size Rule

Code files should generally stay within 500–700 lines.

If a file grows beyond that, split it by responsibility, for example:

- routes
- services
- validators
- types
- helpers
- UI components
- hooks

A file may go above 700 lines only when splitting would make the code harder to understand. Around 1200 lines should be treated as the maximum exception, not the normal target.

---

## 15. MVP Milestones

### Milestone 1: Core SaaS

- Auth
- Users
- Dashboards
- Assignments
- Basic RBAC

### Milestone 2: Schema Dashboard

- Connect MySQL
- Upload Prisma schema
- Save schema metadata
- Dynamic table pages
- Search/sort/pagination
- CSV export

### Milestone 3: SaaS Safety

- Audit logs
- Encrypted DB credentials
- Permissions
- Schema refresh

### Milestone 4: Report Engine

- Schema relations
- Report builder
- Report viewer
- Report permissions
- Report CSV export

### Milestone 5: Business Packs

- Rental report presets
- Education report presets
- E-commerce report presets

---

## 16. Final Product Direction

Dashmint should evolve from:

Database table viewer

to:

Dynamic business dashboard and report engine

The winning formula is:

Auto-generated table pages + relation-aware reports + RBAC + CSV export + audit logs.
