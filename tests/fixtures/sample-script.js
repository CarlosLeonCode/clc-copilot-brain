// Neutral sample script used by parser and renderer tests (no real industry content).
export const SAMPLE = `---
script: sample-co
title: Sample Co scripts
industry: generic
version: 2
status: active
---
Short intro for the set.

## Cold call
play: cold-call
goal: Book a short meeting
note: Keep it under two minutes
- Smile before dialing
- Never read word for word

### Opening
branch: B1
tag: Opening
say: Hi [NAME], this is [REP] from Sample Co.
detail: Pause and let them answer.
tip: Slow down
tone: start
next: Closing

#### Interested
when: They ask a question
tag: Good sign
say: Great, let me explain in one sentence.
tone: yes
next: end

#### Not now
say: No problem, when is better?
tone: no
next: Follow up

### Closing
say: Can we book ten minutes on Tuesday?
tone: action

## Follow up
goal: Keep the door open

### Check in
say: Just checking in.
tag: Second card
say: Anything changed?
`;
