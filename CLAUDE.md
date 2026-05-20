This is a historically accurate Ptolemaic astronomy and astrology app. It simulates Ptolemy's geocentric cosmology as described in the *Almagest* (c. 150 CE), using deferent-and-epicycle mechanics for all celestial bodies. Publish to GitHub Pages at https://stpierrs.github.io/ptolemaic-astronomy-app/

## Workflow rules (read every session)

- **Work directly on `master`.** Do not create new branches and do not create git worktrees. All edits, commits, and experiments happen on `master` in this directory.
- **The dev server (`localhost:3000`) serves from this main project directory.** Files in any `.claude/worktrees/*` location are invisible to the browser. If you find yourself in a worktree, exit and edit here.
- **Local commits are fine; never push.** GitHub is reserved for stable releases the user explicitly triggers. Never `git push`, never `git push --force`, never use `mcp__github__*` tools.
- **Restore points are tags on master** (e.g. `restore-observation-mode-v1`). Add a new tag when locking in a working state; roll back with `git reset --hard <tag>`.
