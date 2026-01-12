# AI Features

## Voice Expense Parsing

Parse spoken/typed expense descriptions into structured data.

**Stack**: LangChain + DeepSeek V3

**Files**:
- `lib/ai/expense-parser.ts` - Parsing logic and schema
- `app/api/voice/parse/route.ts` - API endpoint
- `components/voice/voice-expense-dialog.tsx` - UI component

## Receipt Image Parsing

Extract expense data from receipt images.

**Stack**: LangChain + Gemini 2.0 Flash Vision

**Files**:
- `lib/ai/receipt-parser.ts` - Vision parsing logic
- `app/api/receipt/parse/route.ts` - API endpoint

**Flow**:
1. User uploads receipt image
2. Click "AI 辨識發票" button
3. Image uploaded to R2, sent to Gemini Vision
4. Auto-fills: amount, description, category, date
