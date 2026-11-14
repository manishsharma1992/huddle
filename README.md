# Huddle: planning poker people look forward to

A real-time planning poker table for backlog refinement. You run it on one laptop, it stores data in the local
Postgres, and everyone on the office network can join from a browser. No accounts and nothing to install.

```
./run.sh        # macOS / Linux: asks for your Postgres password, creates the DB, builds, starts on :8080
run.bat         # Windows Command Prompt (same steps)
.\run.ps1       # Windows PowerShell (same steps)
```

All three take `--rebuild` to force a fresh build. On Windows, if PowerShell blocks the script, run
`powershell -ExecutionPolicy Bypass -File .\run.ps1`, and allow Java through Windows Defender Firewall
so colleagues can reach the port.

It prints the LAN links (e.g. `http://192.168.1.17:8080`) to share with your team.

## What makes it fun

| Moment | What happens |
| --- | --- |
| Joining | Pick a name and an animal character. Your seat at the felt table is waiting. |
| Voting | Your hand of cards fans out at the bottom. **Tap** a card, **flick it up** onto the table, or **type** its value (`5`, `13`, `?`, `c` for ☕). Everyone sees your card land face down. |
| Waiting | Throw things (✈️ 🌸 ⭐ 🍅) at colleagues by clicking their avatar. They wobble when hit. Cheer with floating emoji. |
| Reveal | A shared **3‑2‑1** countdown, then all cards flip in the order people voted. |
| Consensus | Confetti, a chime, and a "Mind-meld! 🧠✨" toast. Consecutive unanimous estimates build a 🔥 streak. |
| Disagreement | Framed positively: outliers get a gold halo and a "Walk us through it?" bubble, because they probably know something. |
| Wrapping up | A discussion timer ring, the ⚡ fastest-voter badge, and a session recap with a CSV / Markdown export. |

Also included: light and dark themes, synthesized sounds (mutable), reduced-motion, reduced-transparency and
high-contrast support, phone layouts, and automatic reconnects.

Browser tests: `TARGET_URL=http://localhost:8080 e2e/run.sh` (Playwright via the playwright-skill runner, Chrome).

Facilitator shortcuts: **R** reveals, **Esc** takes your card back.

## Architecture: strict DDD (Evans)

```
backend/src/main/java/com/planningpoker
├── sharedkernel/domain           AggregateRoot, DomainEvent, Guard, DomainRuleViolation
├── estimation                    ← the Estimation bounded context
│   ├── domain                    pure Java, no framework imports (enforced)
│   │   ├── model                 PokerSession (aggregate root), Participant & Story (entities),
│   │   │                         Vote, Card, Deck, SessionCode, RoundResult … (value objects),
│   │   │                         PokerSessionRepository (repository interface)
│   │   └── event                 sealed PokerSessionEvent hierarchy (VoteCast, CardsRevealed …)
│   ├── application               use-case services, commands, read model (views), ports
│   ├── infrastructure            JDBC repository, Spring transactions, STOMP broadcaster, presence
│   └── interfaces                REST controllers, error mapping, SPA forwarding
└── config                        composition root (wires plain-Java services) + WebSocket config
```

* **The aggregate protects every rule**: one facilitator, one story in play, only voters vote, only deck cards,
  only the facilitator steers, and facilitation passes on automatically when the facilitator leaves.
* **Card faces never leave the server before the reveal.** The read model blanks them out.
* **Concurrency**: commands are serialized per table. The aggregate root carries a version (optimistic
  locking) with a short retry as a safety net.
* **Persistence** is hand-written SQL over four normalized tables (`poker_session`, `participant`, `story`,
  `vote`), managed by Flyway. There is no ORM, so the domain model stays free of persistence concerns.
* **ArchUnit tests fail the build** if any layer rule is broken (`DddArchitectureTest`).

## Developing

```
# terminal 1: backend on :8080
cd backend && DB_PASSWORD=… mvn spring-boot:run
# terminal 2: hot-reloading UI on :5173 (proxies /api and /ws to :8080)
cd frontend && npm install && npm run dev
```

`npm run build` writes the UI into `backend/src/main/resources/static`, so the jar serves everything.

## LAN notes

* The server binds to `0.0.0.0`. If colleagues can't connect, allow incoming connections for Java in
  *System Settings → Network → Firewall*.
* Corporate networks sometimes block laptop-to-laptop traffic (client isolation, VPN split tunnelling). If links
  don't open for others, check with IT which network segment allows it.
* Tables, stories and estimates persist in Postgres, so restarting the app does not lose a session.
