A single Next.js (App Router) application — no separate Express server. Next.js Route Handlers are your Node backend. This is the most important stack deviation from the PRD.


┌─────────────────────────────────────────────────────────┐
│  Next.js App (Vercel or Firebase Hosting)               │
│                                                          │
│  Client (React)              Server (Route Handlers)     │
│  ├─ Dashboard / Map          ├─ /api/simulate            │
│  ├─ Scenario chat            ├─ /api/vulnerability       │
│  ├─ Budget tool              ├─ /api/budget              │
│  └─ Resilience timeline      └─ /api/resilience          │
│         │                            │                    │
│         │                    ┌───────┴────────┐          │
│         │                    │ Scoring Engine │ (pure TS) │
│         │                    │ + Gemini call  │          │
│         │                    └───────┬────────┘          │
└─────────┼────────────────────────────┼──────────────────┘
          │                            │
   Google Maps JS API          Gemini API + Firestore
                               (static barangay GeoJSON in repo)
Why server-side route handlers matter: your Gemini API key must never reach the browser. A separate Express service is extra deploy surface, extra CORS, extra failure point for zero benefit at this scale. The PRD's "Node.js/Express" is satisfied in spirit — it's still Node — with far less overhead.

Layering:

lib/scoring/ — pure, deterministic, testable functions (vulnerability, resilience, budget knapsack). The defensible core.
lib/ai/ — Gemini wrappers using structured output (JSON schema / function calling) so responses are parseable, plus the canned-response fallback map.
data/barangay.json (GeoJSON) + data/indicators.json — the static digital twin, version-controlled.
Firestore — only scenario history + resilience timeline.