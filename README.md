# 🌟 BarangAI

An AI-powered Digital Twin & Decision Intelligence Platform that lets local governments simulate the impact of projects and policies *before* spending a single peso.

## 🚀 About the Project

This project is developed as part of **SparkFest 2026**, a hackathon organized by **Google Developer Groups on Campus – Polytechnic University of the Philippines (GDG PUP)**.

It aims to solve a real-world, community-based problem through technology, innovation, and collaboration — helping barangays and cities make smarter, evidence-based decisions for their communities. The MVP demonstrates the platform on **Barangay Alibagu, Ilagan City, Isabela**.

## 🎯 Problem Statement

Local governments make hundreds of decisions every year — infrastructure, disaster preparedness, environmental planning, and public-service allocation — yet these decisions often rely on historical reports, manual assessments, and intuition.

This leads to recurring problems:

- Public funds are invested without accurately predicting long-term outcomes.
- Infrastructure projects can solve one problem while creating another (e.g. road widening that worsens heat or flooding).
- Disaster preparedness prioritizes hazard *locations* rather than the *people* most vulnerable to them.
- Budget allocation depends on experience instead of data.
- Communities cannot visualize a project's impact before it is built.

Without a way to simulate future scenarios, officials make expensive decisions with limited foresight — increasing the risk of inefficient spending, delayed interventions, and reduced community resilience.

## 💡 Proposed Solution

**BarangAI** creates a virtual model — a *digital twin* — of a barangay from geospatial, demographic, environmental, and infrastructure data.

- **What it does:** Officials ask questions in plain language ("What if we build an evacuation center here?") and the platform predicts the outcomes — flood reduction, carbon absorption, cooling, cost, and beneficiaries — then explains the reasoning.
- **How it solves the problem:** By previewing the future, officials compare scenarios, understand trade-offs, and choose the option with the greatest social, economic, and environmental benefit.
- **What makes it different:** A **deterministic scoring engine computes every number** (transparent, reproducible, defensible), while **Gemini only parses the question and explains the results** — never inventing figures. It focuses on *who* is most vulnerable, not just *where* hazards are, and runs even offline with graceful fallbacks.

## ⚙️ Features

- **🤖 AI Scenario Simulator** — Ask a what-if question and get predicted resilience change, flood reduction, carbon, cooling, beneficiaries, and maintenance cost, with a plain-language explanation.
- **🏘️ Community Vulnerability Intelligence** — Ranks zones by *who* is most at risk (elderly, children, PWDs, income, housing, access, hazard exposure) with recommended actions.
- **💰 AI Budget Optimization Engine** — An exact 0/1 knapsack selects the project mix that maximizes community benefit under a given budget, with a per-project rationale.
- **📊 Community Resilience Score** — A live 0–100 score across six indicators that recalculates after every simulation and tracks over time.
- **🗺️ Community Analytics Dashboard** — One interactive Google Map plus panels tying the entire digital twin together.

## 🧪 Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Recharts
- **Backend:** Next.js Route Handlers (Node), Google Gemini via `@google/genai`
- **Database:** Firebase Firestore *(planned — scenario history & resilience timeline)*
- **Tools:** Google Maps Platform (`@vis.gl/react-google-maps`), Vitest, Vercel, GitHub

## 🛠️ Getting Started

**Prerequisites:** Node.js 20+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. (Optional) configure keys — the app runs fully offline without them
cp .env.example .env.local   # add GEMINI_API_KEY and NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# 3. Run in development
npm run dev                  # http://localhost:3000

# Production build
npm run build && npm start

# Tests & type checking
npm test                     # 58 Vitest tests
npm run typecheck
```

Without API keys, scores are still fully computed, AI explanations use deterministic templates, and the map shows a colored-grid fallback. `.env.local` is gitignored, so your keys are never committed.

**Environment variables:** `GEMINI_API_KEY` (live AI), `GEMINI_MODEL` (default `gemini-2.0-flash`), `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (interactive map), `NEXT_PUBLIC_FIREBASE_*` / `FIREBASE_SERVICE_ACCOUNT` (persistence, when wired).

See [`docs/`](docs/) for the PRD, architecture, data model, and scenario coefficients (with assumptions, confidence levels, and sources).

> ⚠️ BarangAI outputs are decision-support estimates from simplified models, intended for scenario comparison — not engineering-grade predictions. Alibagu figures are partly curated from public sources (PSA, NDRRMC, OSM) and partly synthetic for demonstration.

## 🌐 Deployed Project

- **Live Demo:** https://barangai.vercel.app/
