# Product Requirements Document (PRD)
# AI Software Advisor for Non-Technical Builders

---

## 1. Vision

Enable a non-technical person (CEO/business user) to build real software by simply talking to an AI advisor.

No:
- coding knowledge
- technical jargon
- setup pain

Only:
- describe idea
- see UI instantly
- iterate visually

Goal:
Talk → See → Tweak → Ship

---

## 2. Problem

Non-technical users cannot build software because:

- don't understand deploy / API / Docker / terminal
- afraid of technical terms
- cannot write specs
- think abstractly, not structurally

But they CAN:
- talk
- react to visuals
- give feedback on what they see

So:
Text/spec-first workflows fail.
Visual/interactive-first workflows work.

---

## 3. Target User

Primary:
- CEO / business owner
- zero technical background
- has business ideas
- wants internal tools / dashboards / apps

Example:
"Tôi muốn dashboard xem tình hình công ty"

NOT:
- engineers
- developers

---

## 4. Core Principle

### Product-oriented
Always show something working.

Never long planning.

### Progressive
Small wins:
V1 → V2 → V3 → …

Never big bang.

### Visual-first
UI > markdown > documentation

### Hide complexity
System handles:
- infra
- code
- architecture

User handles:
- intent only

---

## 5. High-Level Architecture

### Layer 1 — Execution
Autonomous multi-agent software team
- coding
- testing
- deploy
- refactor

(Already solved)

### Layer 2 — Advisor (Core product)
AI Consultant
- talk with user
- translate business → technical
- guide learning
- generate tasks
- scaffold apps

Acts like:
- Teacher
- Product Owner
- Technical assistant

### Layer 3 — Interface
Web app:
- interactive environment
- chatbot advisor
- instant visual results

Zero jargon.

---

## 6. Final Experience (End State)

After onboarding, user can:

- create a small web app
- modify features via prompts
- load CSV data
- generate dashboard
- iterate visually
- deploy with 1 click

User feeling:
"I can build software myself"

NOT:
"I depend on engineers"

---

## 7. Learning Journey (Example)

### Phase 1 — Fun
Build Tic-Tac-Toe
→ see code → run → win

### Phase 2 — Modify
Change rules (3 → 5 pieces)
→ learn prompt → change behavior

### Phase 3 — Real use case
Load CSV → build dashboard

### Phase 4 — Business
Internal tools
Reports
Automation

---

## 8. Success Metrics

- user builds first app in < 15 minutes
- zero explanation of technical terms required
- user asks for more features themselves
- user feels confident experimenting

Qualitative signal:
User says: "Tôi tự làm được rồi"

---

## 9. Non Goals (v1)

- enterprise scale
- perfect architecture
- production hardening
- multi-agent orchestration

Focus:
learning + speed only