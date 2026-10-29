# Development guidelines

## Branches and scope

- Check the current branch, working tree, and target base before starting. Create `codex/` branches from the latest `origin/master` for routine fixes.
- Preserve existing uncommitted changes and save the working tree before switching branches.
- Keep fixes, CLI integration, and IGA Pages migration in separate branches and commits. Follow the scope of the current task.

## Dependencies and configuration

- Use the Node.js and npm versions specified in `.nvmrc` and `package.json`. Install dependencies with `npm run setup`.
- Update the corresponding `package-lock.json` when changing dependencies.
- Maintain configuration examples in `.env.example` and store local credentials in `.env.local`.
- Keep keys, tokens, and cookies out of commits, logs, and conversation output.

## Validation

Run checks appropriate to the code change. Run all checks for build tooling or dependency changes. From the repository root:

```shell
npm test
npm run typecheck
(cd web && ./node_modules/.bin/eslint src --max-warnings 0)
npm run build
```

For startup, port, or API changes, also start the local services and exercise the affected pages or endpoints. Report the results and any gaps in verification.
For documentation changes, check commands, links, and configuration names, then run `git diff --check`.

## Code and documentation

- Use English for documentation, code comments, and development instructions throughout the repository.
- Follow the existing code style. Use comments for constraints that need explanation. Describe current behavior in code and documentation.
- Keep README content focused on installation, configuration, usage, and troubleshooting. Consolidate repeated instructions.
- Use concrete facts and actions. Omit decorative wording, forced contrasts, and accounts of the editing process.
