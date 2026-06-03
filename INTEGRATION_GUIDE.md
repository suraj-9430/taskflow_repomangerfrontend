# TaskFlow Pro — Gemini AI Integration Guide

## Files in this package

| File | Destination in your project |
|------|-----------------------------|
| `ai.routes.ts` | `backend/src/routes/ai.routes.ts` |
| `ai.controller.ts` | `backend/src/controllers/ai.controller.ts` |
| `ai.service.ts` | `TaskFlow-pro/src/app/services/ai.service.ts` (replace existing) |

---

## Step 1 — Add your Gemini API key to .env

In `backend/.env`, add:

```
GEMINI_API_KEY=AIzaSy...your_actual_key_here
```

---

## Step 2 — Register the AI route in app.ts

Open `backend/src/app.ts` and add:

```typescript
import aiRoutes from './routes/ai.routes';

// Add with your other routes:
app.use('/api/ai', aiRoutes);
```

---

## Step 3 — Install node-fetch (if not already installed)

```bash
cd backend
npm install node-fetch
npm install --save-dev @types/node-fetch
```

> If your backend already uses axios or native fetch (Node 18+), 
> you can replace the fetch call in ai.controller.ts with axios or globalThis.fetch

---

## Step 4 — Replace the Angular AI service

Copy `ai.service.ts` to:
`TaskFlow-pro/src/app/services/ai.service.ts`

This replaces your existing keyword-matching service with real Gemini API calls.

---

## Step 5 — Use in your AI chat component

```typescript
// In your AI chat component
import { AiService } from '../../services/ai.service';

export class AiChatComponent {
  constructor(private aiService: AiService) {}

  sendMessage(userMessage: string) {
    this.isLoading = true;
    this.aiService.chat(userMessage).subscribe({
      next: (reply) => {
        this.messages.push({ role: 'assistant', content: reply });
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  // For task breakdown
  breakdownTask(title: string, description: string) {
    this.aiService.generateBreakdown(title, description).subscribe({
      next: (breakdown) => {
        this.taskBreakdown = breakdown;
      }
    });
  }
}
```

---

## Free Tier Limits (Gemini 1.5 Flash)

| Limit | Value |
|-------|-------|
| Requests per minute | 15 |
| Requests per day | 1,500 |
| Tokens per minute | 1,000,000 |
| Cost | Free |

This is more than enough for a development/small team environment.

---

## Security Notes

- Never expose GEMINI_API_KEY in the frontend
- The key is only used in the backend controller
- The `/api/ai/chat` route is protected by JWT (`protect` middleware)
- Only logged-in users can call the AI
