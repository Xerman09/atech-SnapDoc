---
description: Enforce human-readable date formatting in all UI displays—never show raw database/ISO timestamps.
alwaysApply: true
---

# Human-Readable Date Formatting Rule

1. **Never display raw database date formats** (such as ISO-8601 strings like `2026-11-15T08:25:58.000Z`, SQLite `YYYY-MM-DD HH:MM:SS`, or Unix epoch numbers) anywhere in the user interface.
2. **Always use the centralized date formatter** in `src/utils/dateFormat.ts` (`formatDisplayDate`, `formatRelativeDate`, or `formatShortDate`) for any date or time shown to the user.
3. Examples of approved UI date formats:
   - `Nov 15, 2026 • 8:25 AM`
   - `Today, 8:25 AM` / `Yesterday, 4:10 PM`
   - `Nov 15, 2026`
4. Raw ISO/epoch timestamps are permitted **only** inside internal SQLite/storage layers and never rendered directly in React Native `<Text>` components.
