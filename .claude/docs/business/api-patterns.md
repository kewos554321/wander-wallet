# API Patterns

## Authentication
- All routes verify session via LINE LIFF token
- Return 401 for invalid tokens

## Authorization
- Member access check: Verify user is project member
- Creator-only actions: DELETE project, remove members

## Response Format
- Return JSON with appropriate HTTP status codes

## Deletion Strategy
- Soft delete for expenses (deletedAt, deletedByMemberId)

## Auth Flow
1. LINE LIFF login
2. Auto-create User on first login (via lineUserId)
3. Session provider wraps app with automatic refresh
4. API routes validate LINE token
