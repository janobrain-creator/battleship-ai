# battleship-ai

Battleship game with AI as your opponent, built using Devin as part of an interview process.

Play classic Battleship (10x10 board, standard fleet) in the browser against a computer opponent.

- Requirements: [REQUIREMENTS.md](REQUIREMENTS.md)
- Technical design: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)

## Development

Requires Node.js 22 (see `.nvmrc`).

```bash
npm ci            # install dependencies
npm run dev       # start the dev server (http://localhost:5173)
npm test          # run the unit tests
npm run lint      # ESLint
npm run typecheck # TypeScript type check
npm run build     # production build into dist/
```

CI runs lint, format check, type check, tests and build on every pull request.
