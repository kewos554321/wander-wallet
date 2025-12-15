# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wander Wallet is a Next.js-based web application for managing shared expenses during group travel. It supports collaborative expense tracking with settlement calculations, member management, and project sharing functionality.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, Radix UI
- **Backend**: Next.js API Routes, Prisma 6.18 ORM, PostgreSQL (Neon)
- **Auth**: NextAuth v5 beta with Google OAuth and credentials provider, JWT strategy

## Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:reset     # Reset database
npm run db:studio    # Open Prisma Studio GUI
```

## Architecture

### Directory Structure

- `/app` - Next.js App Router pages and API routes
- `/components` - React components (ui/, auth/, layout/, system/)
- `/lib` - Utilities (db.ts for Prisma client, utils.ts for Tailwind helpers)
- `/prisma` - Database schema
- `/types` - TypeScript type definitions
- `auth.ts` - NextAuth configuration (root level)

### Data Model Relationships

```
User → createdProjects (Project[])
     → projectMemberships (ProjectMember[])

Project → creator (User)
        → members (ProjectMember[])
        → expenses (Expense[])
        → shareCode (unique 12-char code)

ProjectMember → project, user (optional for placeholders), role (owner/member)

Expense → project, payer (User), participants (ExpenseParticipant[])
        → category (food/transport/accommodation/entertainment/shopping/other)
```

### API Route Patterns

- All routes verify session: `const session = await auth()`
- Member access check: Verify user is project member before allowing access
- Creator-only actions: DELETE project, remove members
- Return JSON with appropriate HTTP status codes

### Key Implementation Details

- **Path alias**: `@/*` maps to project root
- **Session**: JWT-based with 5-minute refresh, auto-logout on 401
- **Share codes**: 12-character Base64URL encoded random bytes
- **Member placeholders**: Members can be added by name before claiming their account
- **Settlement algorithm**: Greedy approach matching highest debtor with highest creditor
- **Currency display**: Uses zh-TW locale formatting

### Authentication Flow

1. Google OAuth or credentials-based login
2. Auto-creates user on first credential login
3. Session provider wraps app with automatic refresh
4. API routes validate session and return 401 for invalid tokens

## Development Notes

- Test credentials: `test@example.com` / `test1234`
- Mobile-first responsive design with bottom navigation
- PWA support with service worker and install prompt
- Dark mode with system detection and manual toggle
