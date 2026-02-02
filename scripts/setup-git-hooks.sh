#!/bin/bash

# Setup Git hooks for Lingua
# This script installs pre-commit hooks that run semantic validation

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"

echo "🔧 Setting up Git hooks..."

# Create pre-commit hook
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash

# Pre-commit hook: Run semantic validation
# This ensures all semantic operations are valid before committing

echo "🔍 Running semantic validation..."

# Run validation
npm run validate:semantic

# Check exit code
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Semantic validation failed!"
  echo "   Please fix the errors above before committing."
  echo "   Run 'npm run validate:semantic' to see details."
  echo ""
  exit 1
fi

echo "✅ Semantic validation passed!"
exit 0
EOF

# Make hook executable
chmod +x "$HOOKS_DIR/pre-commit"

echo "✅ Git hooks installed successfully!"
echo ""
echo "Pre-commit hook will now run semantic validation before every commit."
echo "To skip validation (not recommended), use: git commit --no-verify"
echo ""
