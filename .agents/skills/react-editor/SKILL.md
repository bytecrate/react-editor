```markdown
# react-editor Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and conventions used in the `react-editor` codebase, a TypeScript project scaffolded with Vite. You'll learn how to structure files, write and organize code, follow commit conventions, and understand the project's testing approach. This guide is ideal for contributors seeking consistency and best practices within the repository.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `textEditor.tsx`, `richTextUtils.ts`

### Imports
- Use **relative import paths** for all module imports.
  - Example:
    ```typescript
    import TextEditor from './textEditor'
    ```

### Exports
- Use **default exports** for modules and components.
  - Example:
    ```typescript
    const TextEditor = () => { /* ... */ }
    export default TextEditor
    ```

### Commit Messages
- Follow **conventional commit** style.
- Prefixes used: `chore`, `fix`
- Example:
  ```
  fix: resolve cursor position bug
  chore: update dependencies
  ```

## Workflows

### Making a Code Change
**Trigger:** When you need to add a feature, fix a bug, or refactor code.
**Command:** `/make-change`

1. Create a new branch for your change.
2. Make your code modifications, following the coding conventions.
3. Write or update tests as needed (see Testing Patterns).
4. Commit your changes using a conventional commit message.
5. Push your branch and open a pull request.

### Running the Project Locally
**Trigger:** When you want to run or test the project locally.
**Command:** `/run-local`

1. Install dependencies:
    ```
    npm install
    ```
2. Start the development server:
    ```
    npm run dev
    ```
3. Open the provided local URL in your browser.

### Writing a Commit
**Trigger:** When you are ready to commit your changes.
**Command:** `/commit`

1. Stage your changes:
    ```
    git add .
    ```
2. Write a commit message using the conventional format:
    ```
    <type>: <short description>
    ```
    - Example:
      ```
      fix: correct typo in toolbar
      ```
3. Commit your changes:
    ```
    git commit -m "fix: correct typo in toolbar"
    ```

## Testing Patterns

- Test files use the pattern: `*.test.*` (e.g., `editor.test.tsx`).
- The testing framework is **unknown** from analysis, but tests are colocated with source files or in the same directory.
- Example test file:
    ```typescript
    // editor.test.tsx
    import { render } from '@testing-library/react'
    import Editor from './editor'

    test('renders editor', () => {
      render(<Editor />)
      // assertions...
    })
    ```

## Commands
| Command        | Purpose                                      |
|----------------|----------------------------------------------|
| /make-change   | Steps for making a code change               |
| /run-local     | Run the project locally with Vite            |
| /commit        | Write a conventional commit                  |
```
