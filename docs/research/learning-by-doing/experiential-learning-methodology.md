# Experiential Learning for Teaching Technology to Non-Technical Adults

**Research Document — February 2026**
**Purpose:** Pedagogical strategies for the Guided AI Coding tutor

---

## Executive Summary

Adults learn technology best by doing it, failing at it, and doing it again. Lecture-first, practice-later actively undermines motivation in busy, high-agency adults who have low tolerance for abstraction without immediate utility.

---

## 1. Core Frameworks

### Kolb's Four-Stage Cycle (Applied to Tech)
1. **Concrete Experience** — Do something real (run code, click a button, break something)
2. **Reflective Observation** — Notice what happened (output, error, effect)
3. **Abstract Conceptualization** — Understand why it happened (the concept)
4. **Active Experimentation** — Try a variation (modify, extend, apply elsewhere)

**Critical insight:** Most tutorials invert this — start with theory, expect motivation before experience. For busy adults, this is fatal. Every lesson should begin with "do this first."

### Dewey's Pragmatism
Learning is problem-solving. Problems must feel real to the learner. A CEO learning databases should build a contact list for their team, not a fictional "student grade" schema.

### Constructivism
Learners construct knowledge by connecting new info to existing mental models. Never introduce a concept without establishing what the student already knows that resembles it. A variable is a labeled box. A function is a recipe. These are cognitive hooks.

---

## 2. Progressive Disclosure in Teaching

### The Cognitive Load Problem
Working memory is limited. Presenting all complexity simultaneously overwhelms learners before they can build schema.

### Levels of Disclosure
| Layer | What student sees | What is hidden |
|-------|------------------|---------------|
| 0 | "Type this command" | Why this syntax works |
| 1 | "This command does X" | Edge cases, alternatives |
| 2 | "Here is the underlying pattern" | Full spec |
| 3 | "When to break the pattern" | Advanced |

### The "Enough to Move" Rule
At each step, give just enough information to complete the next action. If the explanation could wait until after the action, delay it.

**Example (Git):**
- Step 1: "Run `git init`" (no explanation yet)
- After: "You just created a hidden folder that tracks all changes."
- Do NOT explain branches, remotes, or merge conflicts on day one.

---

## 3. Just-in-Time Learning

Teach a concept at the exact moment the learner needs it. Not before (forgotten), not after (missed teachable moment).

**Formula:** Create the need, then satisfy the need.

### How to Engineer JIT Moments
1. **Build friction before solution** — Let student try the painful way first (manually repeat 5 times), then introduce the automated solution
2. **Questions as triggers** — A concept introduced in response to student's own confusion has 3-5x better retention
3. **Placeholder explanations** — "For now, think of this as a magic address. We'll explain in lesson 4."

---

## 4. Build First, Explain Later

### Research Evidence
Manu Kapur's "Productive Failure" research (ETH Zurich): Students who attempted problems before instruction showed **30% improvement in conceptual understanding** vs. instruction-first groups.

**The pattern:**
1. Give student a goal ("Make the text red")
2. Let them try without guidance (2 min)
3. Provide the solution
4. Explain what they were actually doing

**Why this works for busy adults:** Starting with an attempt respects their agency. The struggle creates emotional investment — they'll remember the solution.

**Caveat:** Failure must be safe and bounded. Max 2-5 minutes of unguided attempt before intervention.

---

## 5. Micro-Wins and Motivation

### The Neuroscience
Dopamine is released during **progress toward a goal**, not just at reward. A curriculum producing visible results every 10-15 minutes maintains higher engagement than one promising big results later.

### The Micro-Win Loop
1. **Setup:** "By the end of this step, you'll have a button that sends email"
2. **Keep small:** Reach the win in under 15 minutes
3. **Make visible:** Real thing in the world (webpage, email, message)
4. **Name it:** "You just built your first API call"
5. **Show next:** "Next we'll make that email personalized" (anticipatory dopamine)

### The "First Win in 5 Minutes" Rule
First session is trust-building. Student's internal question: "Is this possible for someone like me?" Answer must be delivered in first 5 minutes by producing something real.

---

## 6. Common Mistakes When Teaching Tech

### Mistake 1: Jargon Dumping
"First, understand what a server is. A server listens for HTTP requests on a port..."
**Fix:** One analogy per concept. Introduce terms after the concept is understood.

### Mistake 2: Expert's Curse
Explaining with vocabulary of someone who already knows the answer.
**Fix:** Test explanations on actual non-technical people.

### Mistake 3: Completeness Over Progress
"Before we write this function, let me explain all function types..."
**Fix:** Ruthlessly defer. "Does the student need this for the next step?" If not, skip it.

### Mistake 4: Abstract/Fictional Examples
"Imagine a list of students and grades..." (when student is a CEO)
**Fix:** Always use the student's own domain.

### Mistake 5: Skipping Diagnosis
Starting lesson 1 without understanding what student knows, wants, and has failed at before.

### Mistake 6: Ignoring Emotional State
Plowing through content while student signals confusion.
**Fix:** Normalize confusion explicitly. "Every developer was confused by this the first time."

---

## 7. Engineering "Aha Moments"

1. **Build the broken model** — Let student work with simplified understanding
2. **Create contradiction** — Design a task the simplified model can't explain
3. **Ask, don't tell** — "Why do you think that happened?"
4. **Let student say the answer** — Their ownership is stronger
5. **Name the concept** — After the insight, not before

**Example (teaching functions):**
- Have student write same 3 lines 5 times for a repeated task
- Ask: "If one line has a typo, how many places to fix?" They count: five.
- "What if you could write it once and run it in all five places?"
- They feel the pain. Introduce the function. Aha = "I feel why functions exist."

---

## 8. Pace Control

### Slow Down Signals
- Hesitation before typing (following without understanding)
- Silent nodding (embarrassed to admit confusion)
- Perfect compliance, no questions (passive copying)
- Errors on things done correctly earlier (gap in understanding)

### Speed Up Signals
- Completing steps before you finish explaining
- Asking "what-if" questions
- Making predictions
- Getting bored with step-by-step

### Check Understanding, Not Completion
**Wrong:** "Did you get it? Great, let's continue."
**Right:** "Without looking — what does this line do?" or "If I asked you to add a third item, where would you put it?"

### "Teach It Back" Method
Every 2-3 concepts, ask student to explain to an imaginary friend who knows nothing about tech. Surfaces gaps immediately.

---

## 9. Scaffolding to Fading

### Vygotsky's Zone of Proximal Development
Teach in the gap between what student can do alone and what they can do with guidance.

### Concrete Sequence
- **Stage 1 (Full):** "Type exactly this: `git commit -m 'first commit'`"
- **Stage 2 (Partial):** "Commit your changes with a message describing what you did"
- **Stage 3 (Goal only):** "Save your progress so you can come back to it later"
- **Stage 4 (None):** Student works independently, tutor reactive only

### Hint Hierarchy (When Student is Stuck)
Wait 60-90 seconds before intervening, then:
1. "Look at line 3"
2. "Compare it to what you wrote in lesson 2"
3. "It's a punctuation issue"
4. "There's a missing colon"
5. (Only then) Show the correction

---

## 10. Teaching Via Analogy

### Proven Tech Analogies
| Concept | Analogy |
|---------|---------|
| Variable | Labeled box / sticky note |
| Function | Recipe |
| API | Waiter in a restaurant |
| Database | Spreadsheet with superpowers |
| Loop | Assembly line |
| If/else | Traffic light |
| Git | Track changes in Word, but for code |
| Server | Restaurant kitchen |
| Frontend/Backend | Dining room vs. kitchen |
| Cache | Notepad on your desk |

### When Analogies Fail
- **Leaky analogy:** All analogies break down. State boundaries: "This works for the basics, not everything."
- **Wrong source domain:** Analogy to something student doesn't know is worse than none
- **Analogy substitutes understanding:** Test by asking them to use the concept without the analogy

### The Anchor-and-Twist Technique
1. **Anchor:** Start with something known ("You know how Gmail shows a list of emails?")
2. **Twist:** Add new layer ("The emails aren't stored in your browser — they live on Google's computer")
3. **Label:** Name the concept ("That fetching process is an API call")

---

## 11. Real Examples of Learning-by-Doing Curricula

### The Odin Project
- Build projects from day 1, reading docs and finding answers is deliberate
- Portfolio of real deployed projects
- Teaches how to search for answers, not just what the answers are

### freeCodeCamp
- 3000+ hours, browser-based, immediate feedback
- Micro-sized lessons (2-10 minutes)
- Eliminates setup friction (biggest beginner killer)

### Codecademy
- Maximum guidance, minimum friction
- Scaffolded early → fading support
- First working line of code within 5 minutes

### Bootcamp Patterns
1. Day 1 wins (visible, shareable)
2. Project-based milestones every 1-2 weeks
3. Graduated autonomy (highly guided → spec only)

---

## 12. The Role of Failure

### Three Conditions for Productive Failure
1. **Safety:** No permanent cost, no social consequence
2. **Boundedness:** Brief and specific, not open-ended confusion (2 min stuck, not 20 min)
3. **Debrief:** Explicit explanation after every failure

### Making Failure Safe
- Normalize it: "Every developer writes code that doesn't work first time"
- Celebrate error messages: "The computer is trying to help you, not reject you"
- Share your own failures: Tutor models debugging
- Reframe success metric: "Did you eventually get it working?" not "Did you get it right first try?"
- Teach error-reading as a skill: Highest-leverage early lesson

---

## The REAL Teaching Loop

Repeatable unit structure for each learning unit (~20-30 min):

```
R — Run first
    Give pre-built code or command to run.
    Experience outcome before understanding mechanism.
    First visible result within 5 minutes.

E — Explain what happened
    Now they've seen it work, explain the concept.
    One analogy. Their domain. No undefined jargon.
    Check: "Can you say what this does in your own words?"

A — Adapt it
    Modify the working example to do something different.
    Productive failure zone — mistakes expected.
    Wait 60-90 seconds before rescuing.

L — Level up
    Show more powerful version or next concept it unlocks.
    Connect forward: "You now know X, which means you can do Y."
    Name the win. Set up the next win.
```

---

## Quick Reference: Dos and Don'ts

| DO | DON'T |
|----|-------|
| Run something in first 5 minutes | Begin with theory |
| Use student's real domain | Use generic fictional examples |
| Introduce jargon after concept understood | Lead with technical terminology |
| Wait 60-90 sec before helping stuck student | Rescue immediately |
| Ask "what do you think this does?" | Tell them, then ask if they understand |
| Celebrate error messages as information | Treat errors as failure |
| One analogy per new concept | Explain using other technical terms |
| Reveal complexity progressively | Front-load everything "for completeness" |
| End every session with tangible artifact | End on abstract concepts |
| Check understanding with predictions | Accept silent nodding |

---

## Vietnamese Market Notes

- **Face-saving culture:** Build in low-stakes checkpoints. Students will silently confirm rather than admit confusion. Check understanding actively, not passively.
- **Authority-based learning tradition:** Explicitly frame the methodology: "We learn differently here — you try before I explain. This is how professional developers actually work."
- **Strong goal-orientation:** Anchor to concrete deliverable from day one.
- **Mobile-first familiarity:** Use analogies to Zalo, Grab, VinID rather than Western desktop software.
