# Project Overview

Wander Wallet is a travel expense splitting app integrated with LINE LIFF for group travel expense management.

## Core Features
- Multi-currency expense tracking
- Settlement calculation
- Member management
- Location recording
- Project sharing

## Key Implementation Details
- **Auth**: LINE LIFF SDK, JWT-based session
- **Share codes**: 12-char Base64URL encoded random bytes
- **Member placeholders**: Add by name before LINE claim
- **Settlement**: Greedy algorithm (highest debtor ↔ highest creditor)
- **Currency**: Multi-currency with custom rates (customRates)
- **Currency display**: zh-TW locale formatting
