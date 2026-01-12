# Data Models

## Core Entities

```
User (LINE user)
  → lineUserId (unique)
  → createdProjects (Project[])
  → projectMemberships (ProjectMember[])

Project (Travel project)
  → creator (User)
  → members (ProjectMember[])
  → expenses (Expense[])
  → activityLogs (ActivityLog[])
  → budget, currency, customRates, exchangeRatePrecision
  → joinMode: create_only | claim_only | both

ProjectMember (Project member)
  → project, user (optional for placeholders)
  → role: owner | member
  → displayName, claimedAt

Expense (Expense record)
  → project, payer (ProjectMember)
  → amount, currency, category
  → location, latitude, longitude
  → image (receipt image)
  → participants (ExpenseParticipant[])
  → deletedAt, deletedBy (soft delete)

ExpenseParticipant (Split participant)
  → expense, member, shareAmount

ActivityLog (Operation history)
  → project, actor (ProjectMember)
  → entityType: expense | project | member
  → action: create | update | delete
  → changes, metadata
```

## Ad System

```
Admin → advertisements (Advertisement[])
Advertisement → placements (AdPlacement[]), analytics (AdAnalytics[])
AdPlacement → placement: home | project-list | expense-list | settle
AdProvider → Third-party ad config (LINE Ads, AdMob)
```
