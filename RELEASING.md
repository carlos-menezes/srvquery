# Releasing

This repository uses Changesets to version and publish the `@srvquery/*` packages.

## Prerelease

Use a prerelease when package interfaces or protocol behavior still need validation by users.

Enter prerelease mode with the `next` tag:

```sh
pnpm changeset pre enter next
```

Create or update a changeset for every package included in the release, then version the packages:

```sh
pnpm changeset version
pnpm install
```

This generates versions such as `0.0.1-next.0`, package changelogs, and `.changeset/pre.json`.

Verify the generated changes before committing:

```sh
pnpm fmt:check
pnpm lint
pnpm build
```

The repository's aggregate test command currently fails when a package has no test files. Run the affected package tests separately when necessary:

```sh
pnpm --filter @srvquery/protocol-minecraft-bedrock test
```

Review and commit the versioning changes, including:

- Package version changes
- Generated package changelogs
- `.changeset/pre.json`
- `.changeset/pre/`
- Updated `pnpm-lock.yaml`, when applicable

```sh
git status
git diff
git add .changeset packages pnpm-lock.yaml
git commit -m "chore: prepare prerelease"
git push origin main
```

Publish the prerelease after the commit is pushed and verification passes. The repository also provides a manually triggered GitHub Actions workflow for this step. Open the `Release` workflow, select the `main` branch, and run it. The workflow requires an `NPM_TOKEN` repository secret.

```sh
pnpm release
```

The release script builds the publishable packages and runs `changeset publish`. The workflow publishes packages, pushes only the package tags created by that run, and creates a GitHub Release for each new package tag. Do not create package tags manually.

Keep prerelease mode active while publishing `next` versions. Do not run `pnpm changeset pre exit` until the packages are ready for a stable release.

## Stable Release

Exit prerelease mode when the prerelease has been validated:

```sh
pnpm changeset pre exit
pnpm changeset version
pnpm install
```

Run the release checks:

```sh
pnpm fmt:check
pnpm lint
pnpm build
```

Review and commit the stable version changes, then push them:

```sh
git status
git diff
git add .changeset packages pnpm-lock.yaml
git commit -m "chore: prepare release"
git push origin main
```

Publish the stable packages with the same manually triggered `Release` workflow, or locally with:

```sh
pnpm release
```

Stable versions are expected to be `0.0.1` for the initial package release. The workflow requires an `NPM_TOKEN` repository secret and creates GitHub Releases for newly published package tags.

## Changeset Status

Inspect pending changesets and the package bump set with:

```sh
pnpm changeset status
```

Before publishing, confirm that the expected packages and versions are listed. Keep changesets focused on the packages and user-facing behavior included in that release.
