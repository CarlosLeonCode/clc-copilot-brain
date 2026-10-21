<p align="center">
  <img src="docs/assets/banner.svg" alt="Copilot Brain: your AI assistant answers from your company's own documents, shows the source, and never makes things up." width="100%">
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Node.js-22%2B-339933.svg" alt="Node.js 22+">
  <img src="https://img.shields.io/badge/Works_with-Claude_%C2%B7_Codex_%C2%B7_Cursor_%C2%B7_Gemini-7c3aed.svg" alt="Works with Claude, Codex, Cursor, Gemini">
  <img src="https://img.shields.io/badge/Made_for-every_team-ec4899.svg" alt="Made for every team">
</p>

<p align="center">
  🇬🇧 <strong>English</strong> · 🇪🇸 <a href="./README.es.md">Español</a>
</p>

# 🧠 Copilot Brain

**Your AI assistant answers your team's questions using your company's own documents, shows where each answer came from, and never makes things up.**

## 🧩 The problem it solves

- 🌀 **Knowledge is scattered.** It lives in people's heads, old documents and chat threads, and nobody finds it when they need it.
- 🎲 **AI tools invent answers.** A generic assistant guesses your prices, policies and processes.
- 🔁 **New people ask the same questions.** Every new hire or rep interrupts someone to learn how things work.

## 👀 See it in action

*Illustrative examples, not recorded conversations. The answers come from the sample documents included with Copilot Brain.*

> [!NOTE]
> **💼 A sales rep asks: "The prospect says it's too expensive. What do I say?"**
>
> "I completely understand that budget scrutiny is strict right now. Let me ask: how much developer time was spent last month refactoring hallucinated AI code or tracking down outdated API specs?" Then offer a 20-minute ROI review.
>
> 📄 *Source: pricing-too-high*

> [!TIP]
> **🛠️ The on-call engineer asks: "A P1 incident just started. What do I do?"**
>
> Acknowledge the alert within 5 minutes and name an incident lead. The communications lead posts a status update within 15 minutes. Roll back recent changes until errors stay below 0.1% for 10 minutes. No response in 7 minutes? Escalate to the backup on-call.
>
> 📄 *Source: incident-management*

> [!IMPORTANT]
> **💰 An account executive asks: "Can I give a 25% discount?"**
>
> Not on your own. 21–30% needs the VP of Sales or CRO, justified by a public case study, logo rights or a joint webinar, and the customer owes a case study within 60 days. You can approve up to 10% with a 12-month prepayment.
>
> 📄 *Source: pricing-tiers-and-discount-matrix*

If a document doesn't exist yet, the assistant says so and offers to help you write it.

You can also ask to *see* things: *"Show me my sales process"* opens your sales steps and call guides as a simple visual page.

## 🗂️ What you can keep in it

<table align="center">
  <tr>
    <td align="center" width="33%">💼<br><strong>Sales</strong><br>Your sales process, call guides, objection replies, competitor comparisons, call notes<br><em>"How do we beat our main competitor?"</em></td>
    <td align="center" width="33%">📣<br><strong>Marketing</strong><br>Brand guidelines, key messages, content calendar<br><em>"What is our elevator pitch?"</em></td>
    <td align="center" width="33%">🧭<br><strong>Product</strong><br>Roadmap, feature specs, release notes<br><em>"What are we building this half?"</em></td>
  </tr>
  <tr>
    <td align="center" width="33%">🛠️<br><strong>Operations</strong><br>Step-by-step procedures, tools, vendors<br><em>"What do I do when a major incident starts?"</em></td>
    <td align="center" width="33%">🧑‍🤝‍🧑<br><strong>People</strong><br>Handbook, hiring scorecards, onboarding plans<br><em>"What does a new hire do in the first 30 days?"</em></td>
    <td align="center" width="33%">💰<br><strong>Finance &amp; Legal</strong><br>Pricing, discount rules, contract templates<br><em>"Who approves a 25% discount?"</em></td>
  </tr>
</table>

## ⚙️ How it works in 3 steps

1. 🧰 **Someone on your team sets it up once** (about 10 minutes).
2. 💬 **A guided interview with your AI assistant** fills it with your company's information and drafts your first documents for each area. You approve everything before it's saved. The assistant guides you from the first "hi": if the brain isn't set up yet, it offers to start.
3. 🙋 **Everyone asks in plain words** and gets answers with their source. No special commands to learn.

```mermaid
flowchart LR
    A(["🧰 1. Set it up once"]) --> B(["💬 2. Guided interview"]) --> C(["🙋 3. Ask anything"])
    classDef setup fill:#e0e7ff,stroke:#4f46e5,stroke-width:2px,color:#1e1b4b
    classDef interview fill:#fce7f3,stroke:#db2777,stroke-width:2px,color:#500724
    classDef ask fill:#ccfbf1,stroke:#0d9488,stroke-width:2px,color:#042f2e
    class A setup
    class B interview
    class C ask
```

🎨 See the visual guide to the basics (in Spanish): [How to use Copilot Brain](./docs/diagrams/uso.html).

## 💬 Just ask in plain words

You never need to learn a command. Type what you want, in English or Spanish:

| Say this | What happens |
| :--- | :--- |
| *"What can you do?"* | A short menu of what your brain can help with. |
| *"Set up my brain"* | The guided interview, one question at a time. |
| *"Log this call"* (and paste your notes) | Your assistant sums up the call in one sentence and saves it after you say yes. |
| *"How are we doing?"* | Plain numbers on what's working in sales. |
| *"How did this month go?"* | A monthly review with changes you can accept or skip. |
| *"Show me my sales process"* | Opens the visual page of your sales process. |
| *"Here's my sales flow"* | Brings in a process you already have drawn somewhere. |
| *"Classify my old calls"* | Sorts older call notes so they count in the numbers. |
| *"Put my brain in Spanish"* | Switches your brain's language. |
| *"Check my brain"* | A health check, explained in plain words. |
| *"Update my brain"* | Brings your brain up to the latest version, after you agree. |

## 💼 Your sales system

Your brain comes with a ready-to-use sales system that you can shape to the way your team sells.

- 🗺️ **A map of your sales process**: the steps every deal goes through.
- 📞 **Call guides** for a cold call, a discovery call, a demo and a follow-up. Each guide says what to say, what to do when the call goes one way or another, and **what success means** for that call (for example, "meeting booked").
- 🧭 **Types of sale**: cold outreach, inbound requests, referrals and existing customers. You can add your own.
- 📝 **Call notes**: after each call, say *"Log this call"*. Your assistant records the type of sale, where the lead came from and whether the call reached its goal, and asks before saving.
- 📅 **A monthly review**: ask *"How did this month go?"*. Your assistant reads the real numbers, proposes changes to your guides, and changes nothing until you approve.
- 🎬 **Scripts for any industry**: say *"Write me a script for restaurants"*. Your assistant asks about your customers and your words, shows you a preview, and saves it only after you say yes. It opens as a visual page you can read during a call.
- 📖 **A glossary**: ask *"What does MEDDPICC mean?"* and get a plain answer. The assistant can add the terms your team uses, and they show up on your sales page.

### 👁️ See your sales process

Your assistant turns your sales steps and call guides into a simple visual page you can open in your browser. Just ask *"Show me my sales process"*. The page updates itself whenever a guide changes, and it works without an internet connection. The page follows the brain's language (English or Spanish).

The page also shows what's working, by type of sale, call guide and person, in plain numbers. Ask: *"How are we doing?"*

Its **"How it's going"** section shows:

- 📊 Results by type of sale, by call guide (measured against that guide's own idea of success) and by person.
- 🎯 Where calls tend to miss their goal.
- 🗓️ This month so far next to the last full month.
- ⏳ "Too early to tell" when there are only a few calls, so nobody draws conclusions from too little.
- 🧪 Sample documents are never counted.

<p align="center">
  <img src="docs/assets/sales-system-preview.png" alt="Sales system page: the five steps of the sales process as a diagram, with a card for each call guide showing its goal, decision tree and what to say." width="100%">
</p>

### 📥 Already have your process drawn?

Say *"Here's my sales flow"* and share it: a photo of a whiteboard, a PDF, an export from Miro or Archify, or just a description.

1. 🔎 Your assistant explains back what it understood and asks about anything unclear, one question at a time.
2. 👀 It shows you a preview of the page with your flow.
3. ✅ It saves it only after you say yes.

Changing a step or improving a guide later works the same way: explain, preview, save after a yes.

## 🤝 Works with the AI tools you already use

Any AI tool that can open a folder on your computer works out of the box:

- 🟠 **Claude Code**, and the Code tab of the Claude desktop app
- ⚫ **Codex**
- 🛸 **Google Antigravity**
- 🟣 **Cursor** and 🌊 **Windsurf**
- 🔷 **Gemini CLI**

Chat apps that can't open folders (ChatGPT, Gemini Gems, Claude Projects) can use a copy-paste setup. See [Connect your AI tool](#-connect-your-ai-tool).

🌎 Works in English and Spanish.

## 🔒 Your data stays yours

> [!IMPORTANT]
> - 📁 **Plain files you own.** Everything is saved as ordinary documents in a folder on your computer or shared drive.
> - 🚫 **The tool itself sends nothing anywhere.** It only reads and writes those local files, and the sales page works offline. Whichever AI assistant you use (Claude, ChatGPT, Gemini…) handles your questions under that provider's own terms, so choose one your company trusts.
> - ✅ **You review every change.** The assistant shows you each draft and saves it only after you approve.

---

## 🚀 Get started

Setup is done **once**, by someone on your team who is comfortable typing a few commands. It takes about 10 minutes.

1. 🧰 Install Copilot Brain on the computer (see the guide below).
2. 🧠 Create your company's brain and choose its language.
3. 📂 Open the brain's folder in your AI tool and say *"Set up my brain"* (or just say *"hi"*: the assistant guides you from the first "hi").

<details>
<summary><strong>Step-by-step installation guide</strong></summary>

<br>

**Before you start:** you need [Node.js](https://nodejs.org/) 22 or newer. Check it with:

```bash
node -v
```

**1. Download Copilot Brain and install it**

Copilot Brain is not on npm yet, so you install it from its source code:

```bash
git clone https://github.com/carlosleoncode/clc-copilot-brain.git
cd clc-copilot-brain
npm install
npm link
```

`npm link` makes the `clc-brain` command available anywhere on your computer. Check that it points to the copy you just downloaded (macOS and Linux):

```bash
readlink -f "$(command -v clc-brain)"
```

The result should end in `clc-copilot-brain/bin/cli.js` inside the folder you just cloned.

> [!WARNING]
> If you linked an older copy before, the command may still point to it. Run `npm link` again from the new folder (or run `npm unlink -g @clc/copilot-brain` first), then check again.

**2. Create your company's brain**

```bash
clc-brain init ../acme-brain
```

Answer a few questions (language, company name, industry, areas). To set the language up front, add `--language es` (Spanish) or `--language en` (English); by default it follows your computer's language. The sales page follows the brain's language, and so does `clc-brain stats`. `--language es` gives you starter guides in Spanish too (the sales map, the pipeline and the call guides). You'll see **"Second Brain initialized successfully!"** followed by your next steps.

To skip the questions, pass everything as options:

```bash
clc-brain init ../acme-brain --yes --language es --name "Acme" --industry "SaaS" --tagline "We make sales simple" --areas "sales,operations"
```

> [!TIP]
> Want to look around first? Run `clc-brain init ../demo-brain --demo` to get a brain filled with sample documents. Remove them later with `clc-brain clean-demo ../demo-brain`. A brain without samples (`--clean`) is the default.

**3. Open it with your AI assistant**

Open the `acme-brain` folder in Claude Code, Codex, Google Antigravity, Cursor, Windsurf or Gemini CLI. No extra setup is needed. Using another app? See [Connect your AI tool](#-connect-your-ai-tool).

Not sure what comes next? Run `clc-brain` on its own inside the folder: it shows where you are and the next step.

**4. Run the guided interview**

Say *"Set up my brain"* (you can also type `/brain-onboarding`). The assistant asks one question at a time, fills in your company profile and drafts a first document for each area. You approve each draft before it is saved.

**5. Check everything is healthy**

```bash
clc-brain doctor ../acme-brain
```

You should see **0 errors**. If something is missing, `clc-brain doctor ../acme-brain --fix` repairs it without touching your documents.

<sub>Once Copilot Brain is published on npm, step 1 becomes a single command: `npm install -g @clc/copilot-brain`.</sub>

</details>

## 🏢 Use it inside a company workspace

If your company also uses other AI tools, give the company one folder (and optionally one git repo) and give each tool its own subfolder:

```
acme/                 # one folder (and optionally one git repo) per company
├── AGENTS.md         # company-level router for AI assistants (+ CLAUDE.md symlink)
├── brain/            # Copilot Brain
└── other-tool/       # any other tool, in its own sibling folder
```

> [!WARNING]
> **Never create the brain in a folder another tool already uses.** `clc-brain init` writes `AGENTS.md` (overwriting an existing one) and the `CLAUDE.md`, `GEMINI.md`, `.cursorrules` and `.windsurfrules` links at the root of its folder, which would replace the other tool's rules.

From the company folder, create the brain in its own subfolder:

```bash
cd acme
clc-brain init brain --name "Acme"
```

Every brain file stays inside `brain/`. Other commands take the same path, for example `clc-brain doctor brain`.

**Opening your AI assistant at `acme/`.** Claude Code only loads `CLAUDE.md`/`AGENTS.md` from `acme/` and its parent folders. The brain's rules and `.claude/skills` load only after the assistant reads a file inside `brain/`, and the shortcuts in `brain/.claude/skills` (such as `/call`) are not documented to be found from the parent. So either:

1. **Open the assistant inside `brain/`** for day-to-day brain work (simplest), or
2. **Add a short router** at `acme/AGENTS.md`, with a `CLAUDE.md` link to it (`ln -s AGENTS.md CLAUDE.md`), that sends each topic to its folder:

```markdown
# Acme workspace

Before acting on a topic below, read `<folder>/AGENTS.md` and follow it.

| Topic | Folder |
| :--- | :--- |
| Company knowledge, SOPs, sales calls, objections | `brain/` |
| <other tool's topics> | `other-tool/` |
```

Keep the router short, and don't `@import` each folder's `AGENTS.md`: imports load everything when the assistant starts.

## 🔄 Update an existing brain

When a new version comes out, the person who installed Copilot Brain gets the latest version, then asks the assistant *"Update my brain"*. The assistant explains what would change and only updates after you say yes. Your own documents and call notes are never overwritten.

<details>
<summary><strong>Step-by-step update guide</strong></summary>

<br>

**1. Get the latest version**

```bash
cd clc-copilot-brain
git pull
npm install
npm link   # only needed if the check below points somewhere else
readlink -f "$(command -v clc-brain)"
```

**2. Preview the update, then apply it**

```bash
clc-brain upgrade ../acme-brain --dry-run
clc-brain upgrade ../acme-brain --yes
```

`--dry-run` shows what would be added or changed, without writing anything. Review it, then run it with `--yes`. What the update does:

- Built-in shortcuts and assistant instructions are refreshed. If you had customized one, your version is kept next to it as a `.bak` copy. If a `.bak` from an earlier update is still there, that file is skipped and reported; move the old `.bak` away and run it again.
- The assistant rules at the top of `AGENTS.md` are refreshed (with a `.bak` copy); anything you wrote outside them stays as is.
- Call guides you already have are never overwritten. New starter guides are added in the brain's language.
- Your call notes, won/lost reviews and other documents are never touched.

Or skip the commands and say *"Update my brain"*: the assistant runs the same preview and applies it only after you agree.

**3. After updating an older brain**

Ask your assistant, in this order:

1. *"Put my brain in Spanish"* (only if you want Spanish and the brain is still in English).
2. *"Here's my sales flow"*, and share the process you already use.
3. *"Classify my old calls"*, so earlier calls count in the numbers.
4. *"Show me my sales process"*.

</details>

## 🔌 Connect your AI tool

Open only the one you use.

<details>
<summary><strong>Claude Code · Codex · Antigravity · Cursor · Windsurf · Gemini CLI · Claude desktop (Code tab)</strong></summary>

<br>

Open your brain folder. That's it: every tool reads the rules in `AGENTS.md`, directly or through `CLAUDE.md`, `GEMINI.md`, `.cursorrules` and `.windsurfrules`. People ask in plain words, and the assistant follows the right procedure.

Slash commands such as `/call` or `/flow` are optional shortcuts that work in all of these tools (see "Slash commands in every assistant" below). Nobody needs them.

The sales page works in any of these tools: when you ask *"Show me my sales process"*, the assistant runs `clc-brain view --open` for you. If it can't run commands, open `sales/sales-system.html` in your browser.

</details>

<details>
<summary><strong>ChatGPT · Gemini Gems · Claude Projects</strong></summary>

<br>

These apps can't open your folder, so follow the copy-paste guide inside your brain:

| App | Guide |
| :--- | :--- |
| ChatGPT (custom GPT) | `skills/integrations/CHATGPT_CUSTOM_GPT.md` |
| Gemini Gems | `skills/integrations/GEMINI_GEM.md` |
| Claude Projects | `skills/integrations/CLAUDE_PROJECT.md` |

</details>

<details>
<summary><strong>Optional: chat apps through an MCP connection</strong></summary>

<br>

Only for chat apps that can't open folders but support MCP servers (for example the Claude desktop chat). Add this to the app's MCP settings (in Claude Desktop: `claude_desktop_config.json`) with the full path to your brain; `clc-brain init` prints it with your path filled in:

```json
{
  "mcpServers": {
    "acme-brain": { "command": "clc-brain", "args": ["mcp", "/full/path/to/acme-brain"] }
  }
}
```

Restart the app. It can search the brain, save call notes and objections, and run health checks. The sales page and the sales numbers need a tool with folder access.

</details>

## 📥 Bring your existing documents

- **Text** from Notion, Google Docs, handbooks or CRM notes: paste it into your assistant and say *"Save this in our brain under operations"* (or any area).
- **Meeting notes**: paste them and say *"Log this call"*.
- **Sales flows** from Miro, Archify, Lucidchart, a PDF or a whiteboard photo: share it and say *"Here's my sales flow"*.

## 📚 Reference

<details>
<summary><strong>Slash commands in every assistant (optional)</strong></summary>

<br>

Everything below also works by asking in plain words, in any tool. Slash commands are a quicker way in. Each one is a skill in `.agents/skills/<name>/SKILL.md`; `clc-brain init` and `clc-brain upgrade` generate the extra files some assistants need (`.claude/skills/`, `.gemini/commands/`, `.windsurf/workflows/`). Edit the skill, never the generated files, then run `clc-brain upgrade`.

| Assistant | How to use a shortcut |
| :--- | :--- |
| Claude Code | Type `/call` (from `.claude/skills/`). |
| Codex | Type `$call`, or pick it from `/skills`. |
| Google Antigravity | Type `/call`, or just ask: skills load when they fit the request. |
| Cursor | Type `/call` in the agent chat. |
| OpenCode | Type `/call`. |
| Windsurf | Type `/call` (workflow from `.windsurf/workflows/`). |
| Gemini CLI | Type `/call` (command from `.gemini/commands/`). |
| GitHub Copilot | Type `/call` in agent mode, or just ask. |

Older brains used names with a colon (`/brain:onboarding`); they are now `/brain-onboarding`, `/brain-sales`, `/brain-doctor` and `/brain-add-area`. `clc-brain upgrade` removes the old `.claude/commands/` files you never changed and tells you about the ones you did.

| Shortcut | What it does |
| :--- | :--- |
| `/brain` | Overview of your brain and what you can do. |
| `/brain-onboarding` | Guided interview that sets up your brain. |
| `/brain-sales` | Sales help: objection replies, competitor comparisons, what to say. |
| `/objection` | Approved reply to a buyer objection, or save a new one. |
| `/battlecard` | How you compare against a competitor. |
| `/call` | Analyze call notes and save them. |
| `/flow` | See or change your sales process and call guides, or bring in a flow you already have. |
| `/script` | Write or improve a script for any industry, preview it as a page, and keep the glossary. |
| `/retro` | Monthly review of calls and won/lost deals. |
| `/brain-add-area` | Add a new area or document. |
| `/brain-doctor` | Health check from inside the chat. |
| `/brain-search` | Find the answer across every area of your brain. |
| `/sales-assist` | Draft outreach and prepare calls with the right call guide. |
| `/sop-auditor` | Check a procedure (SOP) for gaps. |

</details>

<details>
<summary><strong>Terminal commands</strong></summary>

<br>

| Command | What it does |
| :--- | :--- |
| `clc-brain init [folder]` | Create a brain. Options: `--language en\|es`, `--name`, `--industry`, `--tagline`, `--areas`, `--demo` or `--clean` (default), `--yes`. |
| `clc-brain doctor [folder]` | Check health; add `--fix` to repair. |
| `clc-brain add-area [folder]` | Add an area: `--preset operations` or `--custom legal_ops`. |
| `clc-brain list-areas [folder]` | See installed and available areas. |
| `clc-brain clean-demo [folder]` | Remove sample documents, keep yours. |
| `clc-brain upgrade [folder] [--dry-run] [--yes]` | Update an existing brain to the latest commands and skills; your edits are kept as `.bak` copies. `--dry-run` previews, `--yes` applies. |
| `clc-brain view [folder] [--open] [--draft <file>]` | Build the visual page of your sales process; add `--open` to open it in your browser, or `--draft <file>` to preview a change without saving it. |
| `clc-brain stats [folder] [--month YYYY-MM] [--json]` | Show what's working in your sales (by type of sale, call guide and person) for this month and the last one; `--json` gives the raw numbers. |
| `clc-brain mcp [folder]` | Start the optional MCP connection (used by the config above). |

`clc-brain --help` lists every option. `copilot-brain` is the same command under another name.

</details>

<details>
<summary><strong>Languages</strong></summary>

<br>

- Each brain has one language, English or Spanish (`language` in `org-kernel.json`). `init --language es|en` sets it; without it, `init` uses your computer's language.
- The assistant talks and writes new content in the brain's language, and answers in whatever language a person writes in.
- Spanish brains get the sales map, the pipeline and the four call guides in Spanish, and a Spanish sales page and `stats` report.
- The starter documents of the other areas (marketing, product, operations, people, finance & legal) are in English for now. The assistant can translate them when you ask.
- To switch later, say *"Put my brain in Spanish"*.

</details>

<details>
<summary><strong>What's inside a brain</strong></summary>

<br>

| Folder | What goes inside |
| :--- | :--- |
| `company-profile.md` | Who you are and what you sell. |
| `sales/system.md` | The map of your sales process. |
| `sales/plays/` | The call guides (cold call, discovery, demo, follow-up), each with its goal and its definition of success. |
| `sales/stages/` | The steps of your sales process and what must be true before moving on. |
| `sales/calls/` | Call notes, one folder per month. |
| `sales/win-loss/` | Reviews of deals won and lost. |
| `sales/scripts/` | Your scripts, one file each, with a visual page generated beside it. |
| `sales/glossary.md` | Your terms and what they mean (created with the first term). |
| `sales/` (other folders) | Customer profiles, objections, competitor comparisons, qualification, case studies. |
| `sales/sales-system.html` | The visual page of your sales process (created for you; open it in any browser). |
| `marketing/` | Brand, messaging, content calendar, distribution. |
| `product/` | Roadmap, specs, release notes. |
| `operations/` | Step-by-step procedures, tools, vendors. |
| `hr_people/` | Handbook, hiring scorecards, onboarding plans. |
| `finance_legal/` | Pricing, discount rules, contract templates. |
| `playbooks/` | One operating guide per area. |
| `AGENTS.md` | The rules every AI tool follows in this brain. |

For developers: [TECHNICAL.md](./TECHNICAL.md) covers the architecture, data model and validation rules, and [docs/Journal/](./docs/Journal/) records the design decisions.

</details>

---

<p align="center">
  Made with ❤️ for teams who want AI that tells the truth.<br>
  <sub>MIT License © <a href="https://github.com/carlosleoncode">Carlos Leon Code</a> · <a href="https://opensource.org/licenses/MIT">License</a></sub>
</p>
