# Obsidian Smart Slides Plugin - Development Guidelines

## 🌍 **IMPORTANT: Language Policy**
- **ALL CODE, COMMENTS, DOCUMENTATION, AND ARTIFACTS** in repository MUST be in **ENGLISH**
- **ONLY COMMUNICATION WITH USER** is in Polish
- This includes: variable names, function names, comments, commit messages, documentation, README files, etc.

## Custom Commands / Aliases

### /nakurwiaj <Task level 1.*>

When user types this command, execute following steps:

#### Workflow for Task-Level Execution:
1. **Task Discovery Phase**:
   - Search for Task <level 1.*> in Kanban board `/Users/hretheum/dev/obsidian-vault/kanban/obsidian-plugin.md`
   - Priority: `in progress` column → `todo/backlog` → any column (except `done` and `archive`)
   - Load task details from `TASK_VALIDATION_CRITERIA.md` if needed

2. **Subtask Execution Loop**:
   For each subtask (1.X.1, 1.X.2, 1.X.3, etc.) in the Task:
   
   a. **Execute subtask** based on atomic action defined
   b. **Quality Check**:
      - Run `/agent code-reviewer` for code quality validation
      - Apply suggested corrections immediately
   c. **Update Status**:
      - Mark subtask as completed in Kanban board (move to done or check checkbox)
      - Execute `git add . && git commit -m "feat: complete subtask X.X.X - <description>" && git push`
   d. **Auto-continue** to next subtask

3. **Task Completion Phase**:
   After ALL subtasks completed:
   
   a. **Final Quality Assurance**:
      - Run `/agent code-reviewer` for complete task review  
      - Run `/agent qa` for quality assurance validation
      - Apply any corrections from both agents
   b. **Task Finalization**:
      - Mark main Task as completed in Kanban (move to `done` column)
      - Execute `git add . && git commit -m "feat: complete Task X.X - <task_name>" && git push`
   c. **STOP** - Do not continue to next task

4. **Execution Rules**:
   - Use parallel tool calls where possible
   - Minimize output - show progress, not descriptions
   - All commits must follow conventional commit format
   - All artifacts must be in English (per language policy)

## Project Structure
- Main project directory: `/Users/hretheum/dev/bezrobocie/obsidian`
- All artifacts must follow English language policy
- Follow Clean Architecture principles
- Use TypeScript with strict mode
- Implement comprehensive testing strategy

## NPM Scripts Reference

- `typecheck`: Run TypeScript type checking with no emit
- `dev`: Run development build (esbuild)
- `build`: Typecheck then production build (esbuild)
- `version`: Bump manifest version and stage files
- `test`: Run Jest (pass with no tests locally)
- `test:ci`: Run Jest with coverage in CI
- `test:watch`: Watch mode for Jest
- `test:coverage`: Generate coverage report
- `lint`: Run ESLint for .ts files
- `lint:ci`: ESLint with zero warnings allowed
- `lint:fix`: Autofix ESLint issues
- `format`: Prettier write for `src/**/*.ts`
- `format:check`: Prettier check for `src/**/*.ts`
- `security:audit`: npm audit (high+) non-failing
- `validate:bundle-size`: Validate bundle size budget
- `benchmark:basic`: Run basic performance benchmarks
- `ci:gates`: Aggregate gates: typecheck, lint, format:check, test:ci, bundle-size, benchmarks
- `deps:check`: Detect circular dependencies (madge)
- `deps:graph`: Generate dependency graph SVG (requires Graphviz)
- `deps:json`: Generate dependency graph JSON

## Folder Structure Overview

```
src/
  core/
    events/
  security/
  services/
  types/
  ui/
  utils/
```
- Respect Clean Architecture boundaries enforced by ESLint import rules
- Export public APIs from `src/core/index.ts`

## Development Workflow

1. Create a branch from `main`
2. Implement changes with TypeScript strict mode and Result<T> patterns
3. Run locally: `npm run ci:gates`
4. Commit with conventional commit message
5. Push and open PR; ensure CI and CodeQL are green
6. Request 1 approving review (branch protection requires it)

## Troubleshooting

- Prettier failures: run `npm run format`
- ESLint failures: run `npm run lint:fix`
- CI failing on Graphviz: ensure Graphviz is installed locally or rely on CI step
- Jest coverage: add tests under `src/**/__tests__` or `*.test.ts`

## Testing Procedures

- Unit tests with Jest and ts-jest; coverage threshold set to 80% global
- Place tests with `*.test.ts` or `*.spec.ts` under `src/`
- Run locally: `npm test` or `npm run test:coverage`
- Security tests: add cases per `docs/SECURITY_GUIDELINES.md`

## Architecture Decisions & References

- Governance: `docs/PROJECT_GOVERNANCE.md`
- Code Standards: `docs/CODE_STANDARDS.md`
- Error Handling: `docs/ERROR_HANDLING_STANDARDS.md`
- Testing Strategy: `docs/TESTING_STRATEGY.md`
- Performance Benchmarks: `docs/PERFORMANCE_BENCHMARKS.md`
- LLM Guardrails: `docs/LLM_DEVELOPMENT_GUARDRAILS.md`

## LLM Guardrails & Governance

- Follow prompt safety rules and output sanitization per `docs/LLM_DEVELOPMENT_GUARDRAILS.md`
- Enforce Result<T> and safe path handling per `docs/SECURITY_GUIDELINES.md`

## Code Review Checklist & Quality Gates

- Zero ESLint errors; no warnings in CI
- TypeScript typecheck passes
- Prettier formatting enforced
- Tests green with coverage meeting thresholds
- No circular dependencies (madge)
- CI and CodeQL must be green before merge

## Development Standards
- All commits must follow conventional commit format
- Code coverage minimum: >90% for unit tests, >80% for integration tests
- Security scanning required for all dependencies
- Performance benchmarks must be maintained
- LLM development must follow established guardrails