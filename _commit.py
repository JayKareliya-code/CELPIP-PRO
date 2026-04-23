import subprocess, sys, os

def run(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.stdout.strip(): print(r.stdout.strip())
    if r.stderr.strip(): print(r.stderr.strip())
    if r.returncode != 0:
        print(f"ERROR exit {r.returncode}")
        sys.exit(r.returncode)

# Phase 2 - Step 2: Stripe reconciliation, AI cost dashboard, feature flags
print("=== Phase 2: Step 2 ===")
phase2 = [
    'apps/api/alembic/versions/0011_reconciliation_log.py',
    'apps/api/app/models/reconciliation_run.py',
    'apps/api/app/workers/reconciliation_tasks.py',
    'apps/api/app/workers/celery_app.py',
    'apps/api/app/api/v1/admin_cost_report.py',
    'apps/api/app/api/v1/feature_flags.py',
    'apps/api/app/core/feature_flags.py',
    'apps/api/app/api/router.py',
    'apps/api/tests/test_reconciliation.py',
    'apps/web/app/admin/cost-report/',
    'apps/web/lib/hooks/useFeatureFlags.ts',
    'apps/web/components/admin/AdminSidebar.tsx',
    'apps/web/app/admin/page.tsx',
    'apps/web/lib/constants.ts',
    'apps/web/package.json',
    'apps/web/package-lock.json',
    'apps/web/.npmrc',
    'docker-compose.yml',
]
for f in phase2:
    run(f'git add "{f}"')

with open('_msg2.txt', 'w', encoding='utf-8') as fh:
    fh.write(
        "feat(sprint2-step2): Stripe reconciliation, AI cost dashboard, feature flags\n\n"
        "S2-2  Nightly Stripe <-> DB reconciliation cron\n"
        "      migration 0011: reconciliation_runs audit table\n"
        "      ReconciliationRun SQLAlchemy model\n"
        "      reconciliation_tasks.py: Celery Beat task at 02:00 UTC\n"
        "      celery_app.py: beat_schedule + reconciliation queue\n"
        "      docker-compose.yml: celery-beat service added\n"
        "      5 integration tests (all passing against Postgres)\n\n"
        "S2-9  Admin AI cost dashboard\n"
        "      GET /admin/cost-report (date range, by_model, by_operation, by_user)\n"
        "      /admin/cost-report page (Recharts bar chart, sortable user table)\n"
        "      AdminSidebar + admin homepage quick link\n"
        "      recharts@2.12.7, .npmrc legacy-peer-deps\n\n"
        "S2-3  Feature flag system (Unleash + FEATURE_FLAGS_JSON env fallback)\n"
        "      GET /feature-flags endpoint (per-user Unleash context)\n"
        "      useFeatureFlags() + useIsEnabled() React Query hook\n"
        "      UNLEASH_URL / UNLEASH_TOKEN / FEATURE_FLAGS_JSON config fields\n"
    )
run('git commit -F _msg2.txt')
os.remove('_msg2.txt')
print("Phase 2 committed")

# Phase 3 - Docs / state files
print("=== Phase 3: Docs ===")
run('git add -A')
import subprocess
status = subprocess.run('git status --short', shell=True, capture_output=True, text=True, encoding='utf-8')
remaining = status.stdout.strip()
if remaining:
    print("Remaining files:", remaining)
    with open('_msg3.txt', 'w', encoding='utf-8') as fh:
        fh.write("chore: Sprint 2 docs, beat schedule state, audit artefact\n")
    run('git commit -F _msg3.txt')
    os.remove('_msg3.txt')
    print("Phase 3 committed")
else:
    print("Nothing left to commit in Phase 3")

print("=== Final log ===")
run('git log --oneline -6')
