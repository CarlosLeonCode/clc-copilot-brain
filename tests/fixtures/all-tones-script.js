// Neutral script that exercises every card tone and every answer layout of a script page (page style guard, demo).
export const ALL_TONES = `---
script: demo
title: Demo call scripts
industry: generic
version: 1
status: active
---
A neutral sample with every kind of card, so the page shows all its pieces.

## First call
play: cold-call
goal: Book a short meeting
note: Keep it under two minutes
- Smile before dialing
- Listen more than you talk

### Opening
tag: Opening
say: Hi [NAME], this is [REP] from Demo Co.
detail: Pause and let them answer.
detail: Use their name once.
tip: Slow down
coach: Breathe before the first line
tone: start

#### Interested
when: They ask a question
say: Great, let me explain in one sentence.
tone: yes
next: Book

#### Busy
when: They are in a hurry
say: Of course, when is a better time?
tone: follow
next: Second call

#### Not interested
say: Thanks for your time.
tone: no
next: end

#### Just curious
next: Book

### Book
say: Can we book ten minutes on Tuesday?
tone: action

#### Yes
say: Perfect, I will send the invite.
tone: yes
next: end

#### Maybe
say: What would help you decide?
tone: plain

### Wrap up
say: Thanks for your time today.
coach: Write the notes right after the call
tone: plain

#### Thanks
say: Talk soon.
tone: yes

#### Later
say: I will call back next week.
tone: follow

#### No
say: Understood.
tone: no

## Second call
goal: Keep the door open

### Check in
say: Just checking in, is now better?

#### Yes now
say: Great, two quick questions.
tag: Then
say: What changed since we spoke?
tone: action
next: Opening

### Last try
say: Shall I keep you posted by email?

#### Sure
say: Done, thank you.
tag: Close
say: Have a good day.
tone: yes
next: end

#### No thanks
say: Understood, take care.
tag: Close
say: Goodbye.
tone: no
next: end

## Third call
goal: Confirm the next step

### Confirm
say: Does Tuesday still work?

#### Yes it does
say: See you then.
tone: yes

### Options
say: Which option suits you best?

#### Small
say: The small plan fits most teams.
tag: Next
say: Shall I send the details?
tone: action

#### Medium
say: The medium plan adds support.
tone: plain

#### None
say: No problem, thanks.
tone: no
next: end
`;
