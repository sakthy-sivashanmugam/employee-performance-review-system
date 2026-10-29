# CLAUDE.md

Durable instructions for Claude Code sessions in this repository. See `README.md` for the project overview.

## Project purpose and stack

An Employee Performance Review Management System: a web application for managing employee records, review periods and performance reviews.

- **Frontend:** React and TypeScript
- **Backend:** Python and FastAPI
- **Database:** PostgreSQL
- **Version control:** Git and GitHub

This is a learning project. The owner wants to understand the architecture, code and engineering decisions, so explain your reasoning and do not just produce code.

## Business rules

These come from `README.md`. Treat them as the only confirmed requirements.

- Each review rates three criteria: quality of work, delivery and ownership, and teamwork and collaboration.
- Each rating is a whole-number scale of 1 to 5 as stated in the README; ask before allowing anything else.
- Only one review is allowed per employee and review period. Prevent duplicates.
- Validate review submissions.
- Calculate average ratings on the backend, not in the frontend.
- Reviews can be viewed and filtered.

Anything not listed here is unspecified. Examples: who may review whom, rounding of averages, review period date rules, authentication and roles. Ask; do not assume.

## Workflow

1. **Inspect first.** Read the relevant files and the Git state before proposing anything.
2. **Plan before editing.** Present a short plan and its scope.
3. **Wait for explicit approval** before creating or changing files.
4. **Implement one feature at a time.** Keep each change small and reviewable.
5. **Test.** Run the relevant tests after each change.
6. **Inspect the diff** before reporting completion.
7. **Explain the changes** in plain terms, including why each decision was made.

When reporting, state the actual tests run and their results. If no tests were run, say so. Clearly distinguish verified facts (things you checked) from assumptions (things you did not).

## Git rules

- Work on a feature branch. Never commit directly to `main`.
- Integrate through pull requests only.
- Commit, push, merge or switch branches only when asked.
- Keep each commit focused on one logical change.

## Scope rules

- Make only the changes that were requested. Avoid unrelated edits, refactors and formatting churn.
- Do not add dependencies without approval.
- Never invent business requirements. If something is unclear, ask.
- If the instructions and the repository state conflict, stop and explain before editing.

## Security rules

- Never commit secrets or real database credentials.
- Keep real values in `.env`, which is gitignored. Commit only `.env.example`, with placeholder values.
- Do not read or print the values in a real `.env`.
- Do not run database operations without approval.
