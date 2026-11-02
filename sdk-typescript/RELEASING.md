# TypeScript SDK releases

Run commands from `sdk-typescript`. The Python SDK is released independently.
Use Node 24 for release tooling; the SDK runtime minimum remains Node 18.

## Local preparation

1. Review the migration notes and changelog. Confirm the intended version is not
   already published with `npm view @pearl.com/pearl-api-client-sdk versions --json --registry=https://registry.npmjs.org/`.
   This change targets 2.0.0 because request options and errors changed.
2. For future releases, update both manifests with
   `npm version <version> --no-git-tag-version` and update CHANGELOG.md.
3. Use a workstation with access to the Sinopia URLs in the lockfile.
   Keep those registry URLs unchanged. Run `npm ci`, `npm test -- --runInBand`, and `npm run build`.
   Run the suite on Node 18 and Node 24 before publishing.
4. Run `npm pack --dry-run`, then `npm pack`. Inspect the generated archive:
   it must include dist JavaScript/declarations, package.json, README, and LICENSE.
   Install that archive in a temporary project and check CommonJS and ESM imports,
   TypeScript declarations, and a request against a local test server.
   `npm ls axios --all` should show no Axios dependency.
5. Review and commit the changes locally, recording the commit SHA and archive
   checksum (`Get-FileHash <tarball> -Algorithm SHA512` in PowerShell).

## Publishing (maintainer action, not part of local implementation)

1. Ensure a clean checkout at the tested release commit. Authenticate with
   `npm login --registry=https://registry.npmjs.org/`, then verify `npm whoami --registry=https://registry.npmjs.org/`.
   The account must have publish access to the @pearl.com package and satisfy
   the registry's two-factor authentication requirements.
2. Publish the exact tested archive:
   `npm publish <tarball> --access public --registry=https://registry.npmjs.org/`.
3. Tag that commit with `git tag -a typescript-v2.0.0 <commit> -m "TypeScript SDK 2.0.0"`
   (substitute the version for future releases). Push the release commit and this
   specific tag. Create a GitHub release with the changelog and migration notes.
4. Verify `npm view @pearl.com/pearl-api-client-sdk@2.0.0 version dist.integrity --registry=https://registry.npmjs.org/`
   and install the published version in a fresh consumer for a smoke test.

If publishing fails, check whether the version exists before retrying. A published
name/version cannot be reused. Fix defects in a new patch release; if necessary,
move the `latest` dist-tag to a known-good release and document the issue.
Never commit credentials. Do not publish the Python SDK as part of this release.

References: https://docs.npmjs.com/cli/commands/npm-publish/
