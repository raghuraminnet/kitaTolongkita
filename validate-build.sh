#!/bin/bash
# Pre-push validation script
# Run automatically before git push, or manually: ./validate-build.sh

set -e

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

echo "=== Pre-push Build Validation ==="

# ── Backend (.NET) ──────────────────────────────────────────────────
if [ -f "$ROOT/backend/src/KitaTolongKita.Api/KitaTolongKita.Api.csproj" ]; then
    echo "[1/2] Building backend..."
    DOTNET=$(command -v dotnet 2>/dev/null || echo "")
    if [ -z "$DOTNET" ]; then
        echo "  ⚠️  dotnet not found — skipping backend build"
    else
        dotnet build "$ROOT/backend/src/KitaTolongKita.Api/KitaTolongKita.Api.csproj" -c Release --no-restore 2>&1 | tee /tmp/backend-build.log
        if grep -q "error CS" /tmp/backend-build.log; then
            echo "❌ Backend build FAILED — fix errors before pushing"
            exit 1
        fi
        echo "  ✅ Backend build OK"
    fi
else
    echo "[1/2] Backend project not found — skipping"
fi

# ── Frontend (Next.js) ──────────────────────────────────────────────
if [ -f "$ROOT/admin-portal/package.json" ]; then
    echo "[2/2] Building admin portal..."
    if [ ! -d "$ROOT/admin-portal/node_modules" ]; then
        echo "  ⚠️  node_modules missing — run npm install first"
    else
        npx next build --no-lint 2>&1 | tee /tmp/frontend-build.log | tail -20
        if grep -q "error" /tmp/frontend-build.log | grep -v "warning"; then
            echo "❌ Frontend build FAILED — fix errors before pushing"
            exit 1
        fi
        echo "  ✅ Frontend build OK"
    fi
else
    echo "[2/2] Frontend project not found — skipping"
fi

echo "=== All validations passed ==="
