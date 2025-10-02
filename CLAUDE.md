# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

**Development:**
```bash
cd "Investments tracker"
npm install
npm run dev       # Start development server on http://localhost:5173
```

**Build & Preview:**
```bash
npm run build     # Build for production (outputs to dist/)
npm run preview   # Preview production build locally
```

**Firebase Deployment:**
```bash
firebase deploy   # Deploy to Firebase Hosting
```

## Architecture Overview

This is a React TypeScript application for tracking investment contributions and analyzing paychecks. It uses Firebase for backend services with LocalForage as an offline fallback.

### Key Architectural Decisions

1. **Hybrid Storage Pattern**: The app uses Firebase Firestore as the primary database with LocalForage for offline capability. All data operations go through `storage.ts` which handles the fallback logic.

2. **Single Document Storage**: All application state is stored in a single Firestore document at `state/main`. This simplifies data management but may have scaling implications.

3. **PDF Processing Pipeline**: 
   - PDFs are uploaded to Firebase Storage (`paystubs/` directory)
   - OCR extraction happens client-side using Tesseract.js
   - Parsed data is stored in Firestore with file references

4. **Tab-based UI Structure**: The app has two main sections accessed via tabs:
   - Investments tracking (401k, ESPP contributions)
   - Paycheck analysis (paystub parsing and visualization)

### Critical Security Issue

**IMMEDIATE ACTION REQUIRED**: The Firestore security rules in `firestore.rules` are completely open (`allow read, write: if true`). This allows anyone to read/write your data. Update these rules based on your authentication strategy before the expiration date.

### AI Integration

The app includes OpenAI integration for:
- Chatbot assistance for financial insights (`components/Chatbot.tsx`)
- Paystub parsing assistance (`utils/ai.ts`)

Ensure the OpenAI API key is properly secured and not exposed in the client-side code.

### Main Entry Points

- `src/main.tsx` - Application bootstrap
- `src/App.tsx` - Main component managing global state and routing
- `src/storage.ts` - Data persistence layer
- `src/utils/parsePaystub.ts` - PDF parsing logic

### Type Definitions

All TypeScript interfaces are defined in `src/types.ts`. Key types include:
- `InvestmentEntry` - Individual contribution record
- `PaystubData` - Parsed paycheck information
- `AppState` - Global application state structure