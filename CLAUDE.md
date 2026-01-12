# Wander Wallet - Claude Instructions

## Quick Reference

```bash
npm run dev          # Dev server
npm run build        # Build
npm run lint         # Lint
npm run test:run     # Test
npm run db:studio    # Prisma GUI
```

**Stack**: Next.js 16 + React 19 + TypeScript 5 + Tailwind v4 + Prisma 6.18 + LINE LIFF

## Documentation Index

Only load docs when needed for the task:

### Core (Always relevant)
| Doc | When to Load |
|-----|--------------|
| `.claude/docs/core/manifesto.md` | Communication rules, principles |

### Coding
| Doc | When to Load |
|-----|--------------|
| `.claude/docs/coding/tech-stack.md` | Need tech details, dependencies |
| `.claude/docs/coding/commands.md` | Need CLI commands |
| `.claude/docs/coding/directory-structure.md` | Finding files, creating new files |
| `.claude/docs/coding/testing.md` | Writing or running tests |

### Business Logic
| Doc | When to Load |
|-----|--------------|
| `.claude/docs/business/overview.md` | Understanding project purpose |
| `.claude/docs/business/data-models.md` | Database, Prisma schema work |
| `.claude/docs/business/api-patterns.md` | API routes, auth, endpoints |
| `.claude/docs/business/ai-features.md` | Voice parsing, receipt OCR |

### Reference
| Doc | When to Load |
|-----|--------------|
| `.claude/docs/reference/components.md` | Using shared UI components |
| `.claude/docs/reference/interfaces.md` | TypeScript interfaces |

## Loading Rules

1. **On-demand**: Only read docs relevant to current task
2. **Read before modify**: Always read files before editing
3. **Don't guess**: Ask when uncertain
4. **Language**: Reply in Traditional Chinese, code comments in English
