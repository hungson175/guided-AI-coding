# Frontend Spec
# Version 1–3 (Progressive Prototypes)

IMPORTANT:
- frontend only
- NO real backend
- ALL data mocked
- speed > correctness

---

# Overall Layout

Two panels only.

---------------------------------
| Left (70%) | Right (30%)     |
| Environment | Advisor Chat  |
---------------------------------

Simple. Nothing else.

No complex navigation.

---

# Panel Definitions

## Left Panel — Interactive Environment

Purpose:
User DOES things here.

Contains:

1. Terminal (fake cloud shell)
2. File Browser (later versions)
3. App Preview (iframe/browser)

Everything runs in browser.
All commands simulated.

---

## Right Panel — Advisor Chat

Purpose:
User TALKS here.

Advisor:
- explains steps
- gives commands
- suggests prompts
- teaches concepts

Technically:
LLM with custom prompt
(no custom agent needed v1)

---

# Version Plan

---

# V1 — First 15 minutes win

## Goal
User builds Tic-Tac-Toe and sees it run.

## Features

Left:
- fake terminal
- "run app" button
- preview iframe

Right:
- chatbot

Flow:

Advisor says:
"Type: mkdir game"

User types.

System fakes:
- create folder
- create files
- scaffold simple web app

User clicks run → game appears.

## Mocking

Terminal:
- pre-scripted responses

Files:
- static templates

Preview:
- simple JS app

NO backend

---

# V2 — Modification mindset

## Goal
Teach: software can be changed by prompts

Task:
Convert Tic-Tac-Toe → 5-in-a-row

## Features

Advisor asks:
"How to change rules?"

User writes prompt.

System:
replace template code

Preview updates instantly.

User learns:
Prompt → Code → Result

---

# V3 — Real data

## Goal
Build simple dashboard

Task:
Load CSV → show charts

## Features

Left:
- file upload (CSV)
- preview dashboard

Right:
- advisor guides steps

Charts:
- mock charts
- fake processed data

NO real parsing required (can simulate)

---

# V4 — Toward real world (optional)

- multiple pages
- simple routing
- simple widgets
- template gallery

Still mocked.

---

# UX Rules

## Must

- instant feedback (<1s)
- always something visible
- no errors
- no jargon
- copy/paste instead of magic automation

## Avoid

- loading spinners
- logs
- stack traces
- config screens

---

# Advisor Behavior

Tone:
- teacher
- friendly
- step-by-step

Never:
- long explanation
- theory first

Always:
- "do this"
- "see result"
- then explain

---

# Tech Constraints

- pure frontend
- local state only
- mock APIs
- static templates
- fast iteration

Because:
This is learning product, not production system.

---

# Definition of Done (V1)

User can:
- open page
- follow advisor
- type commands
- see working game in < 15 minutes

If achieved → ship.