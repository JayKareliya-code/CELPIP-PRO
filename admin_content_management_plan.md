# Admin Content Management Plan

## Separate Implementation Plan for Admin Side

### Scope: Manage ready-made learning materials, speaking prompts, writing tasks, speaking images, and related content assets from an internal admin panel

---

## 1. Goal

Build a separate **admin-side content management system** so you can manage all reusable CELPIP platform content without relying on the model to generate it on demand.

The admin system should allow authorized staff to:

- create and edit **speaking prompts**
- create and edit **writing tasks**
- upload and assign **speaking images**
- add and organize **learning materials**
- control which content is visible for **starter / pro / ultra**
- group content by **module, task, topic, difficulty, and status**
- version content safely without breaking live user flows
- keep everything stored in the **database in an organized way**, with media referenced cleanly

This plan is designed to **extend the previously built schema and architecture**, not replace it.

---

## 2. Design Principles

1. **Database-first content system**  
   All metadata, structure, access rules, ordering, and relationships live in PostgreSQL.

2. **Media separated from metadata**  
   Images and documents are stored in object storage, while file metadata and references live in the DB.

3. **Admin edits should not break live sessions**  
   Use publish states, soft deletes, versioning, and audit logs.

4. **Reusable content model**  
   The same learning material can be linked to multiple plans, tasks, modules, or bundles.

5. **Compatible with existing implementation**  
   Extend current `speaking_prompts`, `writing_prompts`, `users`, plan/entitlement, and purchase models.

6. **No dependency on model generation**  
   This admin plan assumes the content already exists and is uploaded or entered manually.

---

## 3. What the Admin Side Must Manage

### 3.1 Speaking prompts

Admin should be able to manage:

- task number
- title
- prompt text
- prep time
- response time
- difficulty
- prompt category/topic
- vocabulary tips
- connector phrases
- template hints
- one or more related images
- active/inactive state
- draft/published/archived status
- display order
- tags

### 3.2 Writing tasks

Admin should be able to manage:

- task number
- title
- prompt text
- task type
- min/max words
- time limit
- difficulty
- idea hints
- intro template
- conclusion template
- active/inactive state
- draft/published/archived status
- display order
- tags

### 3.3 Learning materials

Admin should be able to manage ready-made materials such as:

- task guides
- tips and strategies
- sample responses
- vocabulary sets
- grammar tips
- structure templates
- drill materials
- mock test support content
- PDF/Doc/image/video/audio-based study assets

Each material should support:

- title
- slug
- summary
- full content body or linked file asset
- material type
- module
- task mapping
- level / difficulty
- access tier
- add-on gating
- sort order
- publish status

### 3.4 Speaking images

Admin should be able to upload and manage images for speaking tasks, especially tasks that need scene-based visuals.

Support:

- image upload
- alt text
- caption
- task mapping
- material mapping
- status
- display order
- image dimensions
- file size
- thumbnail URL
- original URL

### 3.5 Plan and add-on content gating

Admin should be able to define access rules such as:

- visible to all starter/pro/ultra users
- visible only to pro/ultra
- visible only to ultra
- visible only if a specific add-on was purchased
- visible if either plan OR add-on grants access

---

## 4. Recommended Architecture

This admin system should fit into the same monorepo and architecture style already used:

### Backend

- FastAPI
- SQLAlchemy 2.0
- PostgreSQL
- S3-compatible object storage for files/images
- Redis/Celery for async media processing if needed

### Frontend

- Next.js admin routes
- shadcn/ui forms, tables, dialogs
- React Query for admin data fetching
- role-based route guards

### Storage split

- **Database** stores content metadata and relationships
- **Object storage** stores image/PDF/media binaries
- DB rows reference object keys and URLs through asset tables

---

## 5. Recommended Admin Route Structure

```text
/apps/web/app/admin/
├── page.tsx
├── prompts/
│   ├── page.tsx
│   ├── speaking/page.tsx
│   ├── writing/page.tsx
│   ├── speaking/[id]/page.tsx
│   └── writing/[id]/page.tsx
├── materials/
│   ├── page.tsx
│   ├── [id]/page.tsx
│   ├── create/page.tsx
│   └── categories/page.tsx
├── assets/
│   ├── page.tsx
│   ├── images/page.tsx
│   ├── documents/page.tsx
│   └── [id]/page.tsx
├── bundles/
│   ├── page.tsx
│   └── [id]/page.tsx
├── tags/
│   └── page.tsx
└── audit/
    └── page.tsx
```

---

## 6. Core Admin Features

## 6.1 Dashboard

Admin dashboard should show:

- total speaking prompts
- total writing prompts
- total published learning materials
- total draft materials
- total assets
- unpublished items needing review
- broken asset references
- recently edited items
- content grouped by module/task

## 6.2 Prompt management

### Speaking prompt management

Functions:

- create prompt
- edit prompt
- clone prompt
- archive prompt
- assign images
- assign tags
- assign learning materials
- reorder prompts
- publish/unpublish

### Writing prompt management

Functions:

- create writing task
- edit task
- clone task
- archive task
- assign tags
- assign learning materials
- reorder tasks
- publish/unpublish

## 6.3 Learning material management

Functions:

- create article-like content
- upload PDF or document as a material asset
- assign material to speaking/writing module
- assign material to specific tasks
- set plan access
- set add-on access
- publish/unpublish
- archive
- preview before publish

## 6.4 Asset management

Functions:

- upload image/document/video/audio
- view metadata
- assign to prompts/materials
- replace file without changing public reference if needed
- archive unused assets
- validate orphaned assets

## 6.5 Access control management

Functions:

- choose which plans can access item
- choose which add-ons can unlock item
- mark content as:
  - included in starter
  - included in pro
  - included in ultra
  - unlocked by add-on only
  - hidden internally

## 6.6 Audit and recovery

Functions:

- track who changed content
- see previous values
- restore previous version
- review publish history

---

## 7. Database Schema Plan

This section is the most important part: the schema must **match or extend** the existing system.

The existing foundation already includes:

- `users`
- `speaking_prompts`
- `writing_prompts`
- plan/entitlement model
- purchases/add-ons from the revised Phase 3 plan
- attempts and reports

This admin plan should extend that with organized content tables.

---

## 8. Schema Extensions

## 8.1 Existing tables to extend

### A. `speaking_prompts`

Existing table should be extended with admin/content fields if not already present.

Recommended additions:

```sql
ALTER TABLE speaking_prompts
ADD COLUMN slug TEXT UNIQUE,
ADD COLUMN topic TEXT,
ADD COLUMN instructions_text TEXT,
ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
ADD COLUMN sort_order INT NOT NULL DEFAULT 0,
ADD COLUMN version_no INT NOT NULL DEFAULT 1,
ADD COLUMN created_by UUID REFERENCES users(id),
ADD COLUMN updated_by UUID REFERENCES users(id),
ADD COLUMN published_at TIMESTAMPTZ,
ADD COLUMN archived_at TIMESTAMPTZ;
```

### B. `writing_prompts`

Recommended additions:

```sql
ALTER TABLE writing_prompts
ADD COLUMN slug TEXT UNIQUE,
ADD COLUMN topic TEXT,
ADD COLUMN instructions_text TEXT,
ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
ADD COLUMN sort_order INT NOT NULL DEFAULT 0,
ADD COLUMN version_no INT NOT NULL DEFAULT 1,
ADD COLUMN created_by UUID REFERENCES users(id),
ADD COLUMN updated_by UUID REFERENCES users(id),
ADD COLUMN published_at TIMESTAMPTZ,
ADD COLUMN archived_at TIMESTAMPTZ;
```

These extensions preserve the current task schema while making them manageable from an admin CMS.

---

## 8.2 New table: `content_assets`

Purpose: central registry for every uploaded file.

```sql
CREATE TABLE content_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_type TEXT NOT NULL
        CHECK (asset_type IN ('image', 'pdf', 'doc', 'audio', 'video', 'other')),
    title TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_bucket TEXT NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    public_url TEXT,
    thumbnail_url TEXT,
    file_size_bytes BIGINT,
    width INT,
    height INT,
    duration_seconds INT,
    checksum_sha256 TEXT,
    alt_text TEXT,
    caption TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived', 'deleted')),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_assets_type ON content_assets(asset_type);
CREATE INDEX idx_content_assets_status ON content_assets(status);
CREATE INDEX idx_content_assets_uploaded_by ON content_assets(uploaded_by);
```

This becomes the single source of truth for speaking images and any uploaded learning files.

---

## 8.3 New table: `learning_materials`

Purpose: primary content record for reusable learning materials.

```sql
CREATE TABLE learning_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    material_type TEXT NOT NULL
        CHECK (material_type IN (
            'article',
            'tip_sheet',
            'sample_response',
            'template',
            'vocabulary_set',
            'grammar_note',
            'drill',
            'mock_support',
            'file_based'
        )),
    module TEXT NOT NULL
        CHECK (module IN ('speaking', 'writing', 'general')),
    skill TEXT
        CHECK (skill IN ('speaking', 'writing', 'overall')),
    body_markdown TEXT,
    body_json JSONB,
    primary_asset_id UUID REFERENCES content_assets(id),
    difficulty TEXT
        CHECK (difficulty IN ('easy', 'medium', 'hard')),
    estimated_read_minutes INT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    version_no INT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    published_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_materials_module ON learning_materials(module);
CREATE INDEX idx_learning_materials_type ON learning_materials(material_type);
CREATE INDEX idx_learning_materials_status ON learning_materials(status);
CREATE INDEX idx_learning_materials_sort_order ON learning_materials(sort_order);
```

Use `body_markdown` for normal text-based content.  
Use `primary_asset_id` if the main item is a file or PDF.

---

## 8.4 New table: `material_assets`

Purpose: attach multiple assets to one learning material.

```sql
CREATE TABLE material_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES learning_materials(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES content_assets(id) ON DELETE CASCADE,
    asset_role TEXT NOT NULL DEFAULT 'attachment'
        CHECK (asset_role IN ('cover', 'attachment', 'inline', 'thumbnail', 'reference')),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(material_id, asset_id, asset_role)
);

CREATE INDEX idx_material_assets_material ON material_assets(material_id);
CREATE INDEX idx_material_assets_asset ON material_assets(asset_id);
```

---

## 8.5 New table: `speaking_prompt_images`

Purpose: map one or more uploaded images to speaking prompts.

```sql
CREATE TABLE speaking_prompt_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    speaking_prompt_id UUID NOT NULL REFERENCES speaking_prompts(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES content_assets(id) ON DELETE CASCADE,
    image_role TEXT NOT NULL DEFAULT 'primary'
        CHECK (image_role IN ('primary', 'secondary', 'reference')),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(speaking_prompt_id, asset_id)
);

CREATE INDEX idx_speaking_prompt_images_prompt ON speaking_prompt_images(speaking_prompt_id);
CREATE INDEX idx_speaking_prompt_images_asset ON speaking_prompt_images(asset_id);
```

This is better than storing only a single `context_image_url` directly on `speaking_prompts`.  
You may keep `context_image_url` temporarily for backward compatibility, but the new system should use relational asset mapping.

---

## 8.6 New table: `content_tags`

Purpose: reusable content tagging.

```sql
CREATE TABLE content_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    tag_type TEXT NOT NULL
        CHECK (tag_type IN ('topic', 'difficulty', 'grammar', 'vocabulary', 'module', 'general')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 8.7 New table: `content_tag_links`

Purpose: polymorphic tag links.

```sql
CREATE TABLE content_tag_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID NOT NULL REFERENCES content_tags(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL
        CHECK (entity_type IN ('speaking_prompt', 'writing_prompt', 'learning_material')),
    entity_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_tag_links_entity ON content_tag_links(entity_type, entity_id);
CREATE INDEX idx_content_tag_links_tag ON content_tag_links(tag_id);
```

---

## 8.8 New table: `learning_material_task_links`

Purpose: connect materials to task-specific practice.

```sql
CREATE TABLE learning_material_task_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES learning_materials(id) ON DELETE CASCADE,
    skill TEXT NOT NULL CHECK (skill IN ('speaking', 'writing')),
    task_number INT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(material_id, skill, task_number)
);

CREATE INDEX idx_learning_material_task_links_task ON learning_material_task_links(skill, task_number);
```

This lets one material be attached to multiple tasks.

---

## 8.9 New table: `content_access_rules`

Purpose: control who can access what.

This is critical because your business model uses:

- base plans
- add-ons
- feature gating
- plan-scoped functionality

```sql
CREATE TABLE content_access_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL
        CHECK (entity_type IN ('learning_material', 'speaking_prompt', 'writing_prompt')),
    entity_id UUID NOT NULL,
    starter_access BOOLEAN NOT NULL DEFAULT TRUE,
    pro_access BOOLEAN NOT NULL DEFAULT TRUE,
    ultra_access BOOLEAN NOT NULL DEFAULT TRUE,
    requires_addon BOOLEAN NOT NULL DEFAULT FALSE,
    addon_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_access_rules_entity ON content_access_rules(entity_type, entity_id);
CREATE INDEX idx_content_access_rules_addon ON content_access_rules(addon_code);
```

This should align with the plan/add-on ownership model from Phase 3.

---

## 8.10 New table: `content_versions`

Purpose: preserve edit history and rollback.

```sql
CREATE TABLE content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL
        CHECK (entity_type IN ('speaking_prompt', 'writing_prompt', 'learning_material')),
    entity_id UUID NOT NULL,
    version_no INT NOT NULL,
    snapshot_json JSONB NOT NULL,
    changed_by UUID REFERENCES users(id),
    change_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(entity_type, entity_id, version_no)
);

CREATE INDEX idx_content_versions_entity ON content_versions(entity_type, entity_id);
```

---

## 8.11 New table: `admin_audit_logs`

Purpose: permanent trace of admin actions.

```sql
CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES users(id),
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_value_json JSONB,
    new_value_json JSONB,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_admin ON admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_entity ON admin_audit_logs(entity_type, entity_id);
CREATE INDEX idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);
```

---

## 9. Recommended Relationship Model

### Speaking side

- one speaking prompt -> many prompt images
- one speaking prompt -> many tag links
- one speaking prompt -> one access rule
- one speaking prompt -> many linked learning materials through task mapping or direct linking

### Writing side

- one writing prompt -> many tag links
- one writing prompt -> one access rule
- one writing prompt -> many linked learning materials through task mapping

### Learning side

- one learning material -> one primary asset
- one learning material -> many secondary assets
- one learning material -> many tag links
- one learning material -> many task links
- one learning material -> one access rule
- one learning material -> many versions

This model is normalized, flexible, and compatible with your current prompt and plan system.

---

## 10. Admin API Plan

## 10.1 Prompt APIs

### Speaking prompts

- `GET /api/v1/admin/speaking-prompts`
- `POST /api/v1/admin/speaking-prompts`
- `GET /api/v1/admin/speaking-prompts/{id}`
- `PATCH /api/v1/admin/speaking-prompts/{id}`
- `POST /api/v1/admin/speaking-prompts/{id}/publish`
- `POST /api/v1/admin/speaking-prompts/{id}/archive`
- `POST /api/v1/admin/speaking-prompts/{id}/clone`
- `POST /api/v1/admin/speaking-prompts/{id}/images`
- `DELETE /api/v1/admin/speaking-prompts/{id}/images/{image_id}`

### Writing prompts

- `GET /api/v1/admin/writing-prompts`
- `POST /api/v1/admin/writing-prompts`
- `GET /api/v1/admin/writing-prompts/{id}`
- `PATCH /api/v1/admin/writing-prompts/{id}`
- `POST /api/v1/admin/writing-prompts/{id}/publish`
- `POST /api/v1/admin/writing-prompts/{id}/archive`
- `POST /api/v1/admin/writing-prompts/{id}/clone`

## 10.2 Learning material APIs

- `GET /api/v1/admin/materials`
- `POST /api/v1/admin/materials`
- `GET /api/v1/admin/materials/{id}`
- `PATCH /api/v1/admin/materials/{id}`
- `POST /api/v1/admin/materials/{id}/publish`
- `POST /api/v1/admin/materials/{id}/archive`
- `POST /api/v1/admin/materials/{id}/assets`
- `POST /api/v1/admin/materials/{id}/tasks`
- `POST /api/v1/admin/materials/{id}/access-rules`

## 10.3 Asset APIs

- `POST /api/v1/admin/assets/upload-url`
- `POST /api/v1/admin/assets/confirm`
- `GET /api/v1/admin/assets`
- `GET /api/v1/admin/assets/{id}`
- `PATCH /api/v1/admin/assets/{id}`
- `POST /api/v1/admin/assets/{id}/archive`

## 10.4 Audit APIs

- `GET /api/v1/admin/audit`
- `GET /api/v1/admin/versions/{entity_type}/{entity_id}`

---

## 11. Backend Service Layer

Recommended service modules:

```text
app/services/
├── admin_prompt_service.py
├── admin_material_service.py
├── admin_asset_service.py
├── admin_access_service.py
├── admin_versioning_service.py
└── admin_audit_service.py
```

Responsibilities:

### `admin_prompt_service.py`

- create/edit speaking prompt
- create/edit writing prompt
- clone prompt
- publish/archive
- assign images
- update ordering

### `admin_material_service.py`

- create/edit material
- link tasks
- assign assets
- manage status
- preview content

### `admin_asset_service.py`

- generate upload URL
- confirm uploaded file
- capture metadata
- attach asset to entity

### `admin_access_service.py`

- update plan access rules
- validate add-on codes
- resolve content visibility

### `admin_versioning_service.py`

- save snapshot on every significant change
- restore old version if requested

### `admin_audit_service.py`

- log every content mutation

---

## 12. Admin Frontend UI Plan

## 12.1 Speaking prompt form

Fields:

- title
- slug
- task number
- topic
- prompt text
- instructions text
- prep time
- response time
- difficulty
- vocabulary tips
- connector phrases
- template hint
- image picker/uploader
- tags
- access rules
- status
- sort order

## 12.2 Writing prompt form

Fields:

- title
- slug
- task number
- topic
- prompt text
- instructions text
- task type
- min/max words
- time limit
- difficulty
- idea hints
- intro template
- conclusion template
- tags
- access rules
- status
- sort order

## 12.3 Learning material form

Fields:

- title
- slug
- summary
- material type
- module
- skill
- markdown editor or file chooser
- difficulty
- estimated read time
- linked tasks
- linked assets
- plan access rules
- add-on gating
- status
- sort order

## 12.4 Asset manager

Views:

- grid view for images
- list view for documents
- filter by type/status
- preview
- copy storage key / public URL
- see which prompts/materials use the asset

---

## 13. Publishing Workflow

Recommended workflow:

### Draft

Admin creates or edits content in draft state.

### Review

Optional internal review if another admin or editor needs to approve it.

### Publish

Publishing:

- stores snapshot version
- marks status as published
- sets `published_at`
- becomes visible in user-facing app if access rules allow

### Archive

Archived content:

- hidden from end users
- preserved in DB
- still visible in admin
- cannot be newly assigned in normal flows unless restored

This prevents accidental deletion and broken history.

---

## 14. Migration Strategy

Because parts of prompt management already exist, migration should be incremental.

### Phase A

Extend existing `speaking_prompts` and `writing_prompts`.

### Phase B

Add new content tables:

- `content_assets`
- `learning_materials`
- `material_assets`
- `speaking_prompt_images`
- `content_tags`
- `content_tag_links`
- `learning_material_task_links`
- `content_access_rules`
- `content_versions`
- `admin_audit_logs`

### Phase C

Backfill existing image URLs
If `speaking_prompts.context_image_url` already contains data:

- create asset rows for each existing image
- create `speaking_prompt_images` mappings
- optionally keep old field for temporary compatibility

### Phase D

Switch frontend reads to relational asset tables

---

## 15. Security and Permissions

Use role checks:

- `admin` -> full access
- `editor` -> content create/edit/publish, but maybe no billing/admin settings
- `support` -> read-only plus audit visibility if needed

At minimum:

- all `/admin/*` routes require authenticated admin user
- all admin mutations are audited
- object storage upload URLs must be short-lived
- file type validation must happen on confirm step
- size limits should exist per asset type

---

## 16. Validation Rules

### Speaking prompt validation

- task number must be valid
- prep/response time required
- published prompt must have prompt text
- published prompt with image role `primary` should have an active image when task expects one

### Writing prompt validation

- task type required
- min words required
- time limit required
- prompt text required before publish

### Learning material validation

- title, slug, type, module required
- either `body_markdown` or `primary_asset_id` must exist
- access rule must exist before publish

### Asset validation

- checksum recommended
- mime type must match allowed asset type
- image dimensions captured for images

---

## 17. Search and Filtering Requirements

Admin lists should support:

- search by title/slug
- filter by task number
- filter by module
- filter by status
- filter by difficulty
- filter by access tier
- filter by add-on code
- filter by asset type
- filter by recently edited
- filter by orphaned assets

Recommended indexes:

- prompt slug
- prompt status
- material status
- material module
- asset type/status
- entity_type/entity_id composites for links

---

## 18. Testing Plan

## 18.1 Backend tests

- create/edit/publish/archive speaking prompt
- create/edit/publish/archive writing prompt
- upload/confirm asset
- create learning material
- assign speaking image
- link material to task
- enforce access rule retrieval
- create content version on change
- write admin audit log on mutation

## 18.2 Frontend tests

- prompt form renders and saves
- image upload flow works
- materials can be linked to tasks
- filters work
- publish/archive actions reflect updated state
- admin-only routes are protected

## 18.3 Migration tests

- existing prompts still load
- existing image URLs can be migrated
- old app flow is not broken during migration

---

## 19. Recommended Build Order

## Stage 1 — Schema and asset foundation

- extend prompt tables
- add `content_assets`
- add `speaking_prompt_images`
- add upload flow
- basic admin asset browser

## Stage 2 — Prompt admin

- speaking prompt CRUD
- writing prompt CRUD
- draft/publish/archive
- tags and ordering

## Stage 3 — Learning materials admin

- learning material CRUD
- task linking
- asset linking
- access rules

## Stage 4 — Versioning and audit

- content version snapshots
- audit logs
- restore support

## Stage 5 — UX polish

- previews
- search/filter optimization
- orphaned asset detection
- editor experience improvements

---

## 20. Final Recommendation

For your use case, the best approach is to build a **real admin CMS on top of your current FastAPI + PostgreSQL + Next.js stack**, where:

- **PostgreSQL stores all structured content and relationships**
- **object storage stores media files**
- **asset, prompt, and learning material records are normalized**
- **access rules align with your one-time plan + add-on model**
- **the schema extends the existing prompt tables instead of replacing them**

This will be much easier and safer than generating content through the model repeatedly, especially because your speaking prompts, writing tasks, images, and study materials are already available.

---

## 21. Suggested Output File Structure for Engineering

```text
apps/api/app/
├── api/v1/admin_prompts.py
├── api/v1/admin_materials.py
├── api/v1/admin_assets.py
├── models/content_asset.py
├── models/learning_material.py
├── models/material_asset.py
├── models/speaking_prompt_image.py
├── models/content_tag.py
├── models/content_tag_link.py
├── models/content_access_rule.py
├── models/content_version.py
├── models/admin_audit_log.py
├── repositories/admin_prompt_repo.py
├── repositories/admin_material_repo.py
├── repositories/admin_asset_repo.py
├── services/admin_prompt_service.py
├── services/admin_material_service.py
├── services/admin_asset_service.py
├── services/admin_access_service.py
├── services/admin_versioning_service.py
└── services/admin_audit_service.py

apps/web/app/admin/
├── prompts/
├── materials/
├── assets/
├── tags/
└── audit/
```

---

## 22. Review Summary

This plan was written as a **separate admin plan**, not an extension of the previous document.

It has been reviewed for:

- compatibility with the prior Phase 1–3 architecture
- DB-first organization
- clean schema extensions instead of duplication
- separation between file storage and DB metadata
- alignment with your one-time plan + add-on entitlement model

Key review conclusion:

- the schema is organized
- it extends the existing foundation correctly
- it supports prompt/image/material management cleanly
- it avoids storing unstructured content logic in random places
- it is suitable for production growth
