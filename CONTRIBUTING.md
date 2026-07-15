# Contributing to Director Desk

We love your input! We want to make contributing to Director Desk as easy and transparent as possible, whether it's:

* Reporting a bug
* Discussing the current state of the code
* Submitting a fix
* Proposing new features

## Our Development Workflow

We use Docker and Docker Compose to spin up local developer environments easily.

### Local Setup
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Supan-Roy/director-desk.git
   cd director-desk
   ```
2. **Launch development environment:**
   ```bash
   docker compose --profile dev up --build
   ```
   * The backend will start on [http://localhost:8000](http://localhost:8000)
   * The frontend will start on [http://localhost:5173](http://localhost:5173)

## Ground Rules & Branching

* **Branch Naming**: Keep branches descriptive. Use standard prefixes:
  * `feature/your-feature-name`
  * `bugfix/issue-description`
  * `chore/minor-maintenance`
* **Commit Messages**: Write clear, imperative commits. E.g., `feat(editor): add multi-track audio selection`.

## Submitting a Pull Request

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add unit/integration tests.
3. Ensure the test suite passes locally.
4. Verify code formatting and linting:
   * **Python (Backend)**: Ensure `py_compile` compiles cleanly.
   * **JS/React (Frontend)**: Run `npm run build` inside `frontend/` to make sure it builds without TypeScript or bundling warnings.
5. Issue your Pull Request using our pull request template.

## Reporting Bugs / Issues

* **Use the templates**: Please use the Bug Report or Feature Request templates when opening issues on GitHub.
* **Be detailed**: Include logs, environment specs (OS, Python/Node versions), and steps to reproduce.
