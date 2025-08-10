---
branch: feature/simple-dates
title: Example using simplified date formats
when: 2025-01-15
labels: ["example"]
---

This PR demonstrates the simplified date format support.

You can now use:
- `2025-01-15` - Date only (assumes midnight in configured timezone)
- `2025-01-15T14:30` - Date and time without seconds
- `2025-01-15T14:30:00` - Full ISO format (still supported)

All formats support timezone specification:
- `2025-01-15 Europe/London`
- `2025-01-15T14:30 Europe/London`