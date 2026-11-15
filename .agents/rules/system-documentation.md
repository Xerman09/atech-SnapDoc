---
description: Require updating system documentation and changelog on every feature or architectural change.
alwaysApply: true
---

# System Documentation & Changelog Rule

Whenever you add, modify, or remove features, screens, services, dependencies, security controls, or configuration in `scanner_app`:

1. **Update `docs/SYSTEM_DOCS.md`**:
   - Keep the **Feature Inventory**, **Architecture Overview**, **Third-Party SDK Audit**, and **Compliance & Security Status** accurate and up to date.
2. **Update `docs/CHANGELOG.md`**:
   - Prepend or update the current unreleased/version entry with a clear bullet describing what was added, changed, or fixed, along with the human-readable date (e.g., `Nov 15, 2026`).
3. **Never skip this step** when completing a user-requested code change.
