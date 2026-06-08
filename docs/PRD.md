# Product Requirements Document (PRD): AI App Generator (Base44-Style)

## 1. Executive Summary & Objective

The objective of this platform is to build an enterprise-ready, metadata-driven Application Platform-as-a-Service (a-PaaS) inspired by Base44. The system enables users to describe applications in natural language (e.g., *"Create a CRM for sales teams with leads, contacts, pipelines, dashboards, authentication, and workflows"*), parses the request into a high-fidelity application metadata schema, and dynamically renders the complete application at runtime. 

The platform requires zero dynamic code compilation or redeployments to provision new user applications, serving 100,000+ users and millions of records reliably in a multi-tenant environment.

---

## 2. Core Functional Requirements

### 2.1 AI Prompt Engine
- **Input**: Natural language prompt describing the SaaS app.
- **Processing**: Structured parsing using LLM (OpenAI GPT-4o-mini/GPT-4o) with strict JSON Schema output.
- **Output**: Structured App Schema (entities, pages, navigation, forms, dashboards, workflows).
- **Validation**: Schema-level validation (via Zod) to check for cycle references, missing relationships, or invalid components before saving.

### 2.2 Metadata Runtime Engine
- **Dynamic Routing**: Catch-all app router mapping `/apps/[appId]/pages/[pageSlug]` and rendering the specific layout dynamically.
- **Dynamic Navigation**: Sidebar/Top navigation generated from navigation metadata, adjusted for the active user's roles.
- **Dynamic Pages**: Resolves pages to forms, tables, dashboards, or layouts at runtime.

### 2.3 Component Registry
- A strict registry mapping string identifiers (`"form"`, `"table"`, `"chart"`, `"dashboard"`, `"card"`) to React components.
- **Safety**: Robust fallback component rendered for unregistered or malformed component types without throwing fatal errors.

### 2.4 Dynamic Form Engine
- **Supported Fields**: `text`, `textarea`, `number`, `email`, `password`, `select`, `radio`, `checkbox`, `date`, `file_upload`.
- **Validation**: Validation rules configured in metadata (e.g. `min`, `max`, `pattern`, `required`) translated into dynamic Zod schemas at runtime.
- **Conditional Fields**: Fields that show/hide based on values of other fields (e.g. `show field Y only if X == 'Yes'`).
- **Async Fields**: Form fields (like selects) fetching option data dynamically from other system entities or external APIs.

### 2.5 Dynamic Table Engine
- **Standard Operations**: Server-side filtering, sorting, pagination, and multi-column search.
- **Column Customization**: Column visibility toggles, text formatting (date, currency, badge), and custom column styling.
- **Actions**:
  - *Row Actions*: Edit, delete, trigger workflow, view details.
  - *Bulk Actions*: Bulk delete, bulk update field, export to CSV.

### 2.6 Dynamic Dashboard Engine
- **Layout**: Dynamic grid layout supporting cards, metrics, charts (line, bar, pie), and embedded tables.
- **Data Resolution**: Query builder that resolves metric values (counts, averages, sums) from underlying entity records.

### 2.7 Dynamic API Generator
- **CRUD Endpoints**: Generic `/api/v1/apps/[appId]/entities/[entityName]` endpoint supporting:
  - `GET` (List with sorting, pagination, filtration)
  - `GET /[id]` (Retrieve single)
  - `POST` (Insert with dynamic validation)
  - `PUT`/`PATCH` (Update record)
  - `DELETE` (Delete record or bulk delete)
- **Features**: Automatic payload validation (using the entity's dynamic schema), tenant scoping, and authorization checks.

### 2.8 Dynamic Database Engine
- **Multi-Tenant Model**: Multi-tenant isolation at the row level.
- **Schema Storage**: A single Postgres database using JSONB document storage for dynamic entities. This allows 100k+ apps to exist without needing real-time SQL schema migrations (`ALTER TABLE`) which degrade performance and lock databases.
- **Indexes**: Dynamic database entity records indexed on Tenant ID, App ID, Entity Type, and key columns using PostgreSQL GIN/BTREE indexes.

### 2.9 Authentication & Access Control (RBAC)
- **Auth**: Email (Credentials-based) and OAuth (Google, GitHub) via Auth.js.
- **Tenant Isolation**: Strict scoping. Users belong to a tenant and can only access applications, metadata, and records belonging to that tenant.
- **Roles**:
  - `Admin`: Full control over app definitions, schema creation, tenant settings, and workflows.
  - `Manager`: CRUD access to records, edit workflows, view dashboards, import CSVs.
  - `User`: Read/Write access to records based on assignments, no system config permissions.

### 2.10 Workflow Engine
- **Logic**: Trigger-Condition-Action model.
- **Supported Triggers**: `Record Created`, `Record Updated` (e.g., status change), `Record Deleted`.
- **Supported Conditions**: Field-level values (e.g., `priority == "high"` or `amount > 5000`).
- **Supported Actions**: `Send Notification` (in-app, email), `Create Record` (e.g. task), `Update Record` (e.g. status), `Trigger Webhook`.

### 2.11 CSV Import
- **Mapping**: Dynamic UI allowing mapping of CSV header columns to target entity fields.
- **Preview**: Validation of the first 10 rows before processing.
- **Batch Processing**: Transaction-safe insertion of records with real-time error logging.

### 2.12 Progressive Web App (PWA)
- Offline-ready static pages shell, cached using Service Workers.
- Add-to-Home-Screen prompt for mobile and desktop systems.

### 2.13 Multi-language (i18n)
- Dynamic translation wrapper. App metadata supports key translation (e.g., English, Spanish, French, German).
- Quick language switcher in the main navigation.

### 2.14 GitHub Export
- Package the dynamically generated application metadata into a static, compilable, standalone Next.js codebase.
- Push the codebase directly to a specified GitHub repository via Octokit.

---

## 3. Non-Functional & Reliability Requirements

### 3.1 Reliability & Resilience
- **Error Boundaries**: Component-level React Error Boundaries with graceful fallback designs to ensure a single component crash does not crash the entire app.
- **Fallback UI**: Standard placeholders for missing/malformed widgets.
- **Retry Mechanisms**: Exponential backoff retry policies for OpenAI requests and dynamic CRUD transactions.
- **Structured Logging**: Diagnostic logging utilizing JSON formats, tracing metadata generation and workflow executions.

### 3.2 Performance & Scalability
- **Scale**: Must easily scale to support 100,000+ users.
- **Latencies**: 
  - Dynamic API queries < 100ms.
  - Page render time (FCP) < 1.5 seconds.
  - LLM parse and app bootstrap < 10 seconds.
- **Database Scaling**: Avoid dynamic DDL modifications. Use standard index-backed JSONB columns and database connection pooling (Prisma + PgBouncer/Neon connection pool).

### 3.3 Security Strategy
- **SQL Injection Prevention**: Safe mapping via Prisma ORM parameterized queries.
- **Tenant Isolation**: Middleware-level check enforcing tenant ID filters on all database queries.
- **API Security**: CSRF protection, rate limiting, and RBAC middleware verifying permissions before executing write commands.
