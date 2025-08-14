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
   - Search for Task <level 1.*> in Kanban board `/Users/hretheum/dev/bezrobocie/vector-wave/vector wave/kanban/obsidian-plugin.md`
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

## Development Standards
- All commits must follow conventional commit format
- Code coverage minimum: >90% for unit tests, >80% for integration tests
- Security scanning required for all dependencies
- Performance benchmarks must be maintained
- LLM development must follow established guardrails