# Project memory

## Product intent & audience

- Mobile + web app for route preparation and logistics/delivery workflows.
- Key features: "Preparar Rota" flow, Circuit opening, virtual printer, persistent PDF queue, scanning (ScanPopup), admin panel (AdminPage with password gate), global announcements.
- Target platform includes web build and Android (Android Studio / Gradle).

## Brand personality & voice

- User communicates in Portuguese; expects concise, factual status reports.
- Values minimal, surgical changes — no new functionality, preserve existing flows.

## Visual design & UX direction

- Stack: Vite + React (JSX), Tailwind CSS, React hooks, Lucide React icons.
- Component patterns present: modals (AlertModal, GlobalAnnouncementModal), popups (ScanPopup), admin gate, page-level components.
- No extra UI/icon packages beyond Lucide React unless explicitly requested.

## Decisions, constraints & rationale

- TypeScript is enforced; typecheck must use the project's app config (bare `tsc` without config checks nothing).
- TS6133 (unused declarations) must be cleaned: remove unused vars, props, imports, constants, and helper functions; keep setters even when state value is unused.
- Critical flows never to be modified unless explicitly asked: Preparar Rota, Circuit opening, virtual printer, persistent PDF queue.
- Web build must pass; Android readiness requires separate Gradle/Kotlin verification.

## Open questions & assumptions

- Android Studio compilation readiness remains unverified — web typecheck and build passing does not confirm native build success.
- Earlier false-positive typecheck (reported 0 errors) was caused by running the wrong command; correct command must always be used.
- No new features to be added in maintenance/bugfix tasks.