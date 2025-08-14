# Obsidian Smart Slides Plugin - Development Guidelines

## 🌍 **IMPORTANT: Language Policy**
- **ALL CODE, COMMENTS, DOCUMENTATION, AND ARTIFACTS** in repository MUST be in **ENGLISH**
- **ONLY COMMUNICATION WITH USER** is in Polish
- This includes: variable names, function names, comments, commit messages, documentation, README files, etc.

## Custom Commands / Aliases

### /nakurwiaj <szczegóły>

When user types this command, execute following steps:

#### Variant 1: /nakurwiaj <task_number>
1. Load numbered atomic task block that user specifies
2. **APPLY AUTOMATIC AGENT CHAIN** (if project has defined):
   - Choose agents based on task type
   - After each task run code review
   - **AFTER CODE REVIEW: Run `/agent meta` for deployment patterns validation**
3. In specified task block:
   a. Start executing first atomic task
   b. After each atomic task mark it as completed (checkbox [x])
   c. After completing all tasks in block:
      - Perform metrics validation using methods specified in document
      - **Run documentation agent** (if available) for synchronization
      - Execute code review
      - **BEFORE DEPLOYMENT: Run `/agent meta` for final validation**
      - Apply any corrections
      - Execute git add, commit without push
   d. Stop
4. Use parallel tool calls where possible
5. Minimize output - focus on execution, not description

## Project Structure
- Main project directory: `/Users/hretheum/dev/bezrobocie/obsidian`
- All artifacts must follow English language policy
- Follow Clean Architecture principles
- Use TypeScript with strict mode
- Implement comprehensive testing strategy

## Development Standards
- All commits must follow conventional commit format
- Code coverage minimum: >90% for unit tests, >80% for integration tests
- Security scanning required for all dependencies
- Performance benchmarks must be maintained
- LLM development must follow established guardrails