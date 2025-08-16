---
branch: feature/timestamp-example
title: Example showing date and timezone handling
when: 2025-01-15 09:00
timezone: America/New_York
labels: ["example", "scheduled"]
---

This PR demonstrates branchpilot's flexible date and timezone handling.

## Date Format Examples

branchpilot supports various date formats in the `when` field:

### ISO 8601 with timezone info

- `2025-01-15T09:00:00Z` - UTC time
- `2025-01-15T09:00:00-05:00` - Eastern Standard Time
- `2025-01-15T09:00:00+09:00` - Japan Standard Time

### Simple formats (use timezone field or system timezone)

- `2025-01-15` - Date only (midnight)
- `2025-01-15 09:00` - Date and time
- `2025-01-15 09:00:00` - Date and time with seconds
- `01/15/2025` - US format (MM/dd/yyyy)
- `15/01/2025` - UK format (dd/MM/yyyy)
- `1/5/2025` - Short format

## Timezone Resolution

Timezone is determined by (in order of precedence):

1. **Explicit offset in date** — If date includes offset (e.g., `-05:00`), it's used
2. **Timezone field** — If no offset but `timezone` field present, it's used
3. **System timezone** — Falls back to your system's timezone

## Best Practices

### Option 1: ISO with explicit offset

```yaml
when: 2025-01-15T09:00:00-05:00
```

### Option 2: Simple date with timezone field

```yaml
when: 2025-01-15 09:00
timezone: America/New_York
```

The second option is clearer for teams and handles DST automatically.

## Use Cases

- **Coordinating across timezones** — Everyone uses the same timezone reference
- **Scheduling for office hours** — Ensure PRs are created during work hours
- **Handling DST transitions** — Timezone database handles daylight saving time
