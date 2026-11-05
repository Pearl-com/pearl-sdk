# TypeScript SDK releases

Run commands from `sdk-typescript`. The Python SDK is released separately.
The SDK supports Node.js 20 and later.

## Prepare the release

1. Pick the version using semantic versioning. Check that it is not published yet:
   `npm view @pearl.com/pearl-api-client-sdk versions --json --registry=https://registry.npmjs.org/`.
2. Set the version in `package.json` and `package-lock.json` with
   `npm version <version> --no-git-tag-version`, and add an entry to CHANGELOG.md.
3. Run `npm ci`, `npm test -- --runInBand` and `npm run build`
   on the oldest supported Node.js version and on the current LTS version.
4. Run `npm pack`. Check that the archive contains the `dist` JavaScript and
   declaration files, `package.json` and `README.md`.
   Install the archive in an empty project and check that the import,
   the TypeScript types and one request against a local test server work.
5. Merge the release commit and record its SHA and the archive checksum.

## Publish

1. Start from a clean checkout of the tested release commit. Log in with
   `npm login --registry=https://registry.npmjs.org/` and check the account with
   `npm whoami --registry=https://registry.npmjs.org/`. The account needs publish
   access to the `@pearl.com` scope and two-factor authentication.
2. Publish the tested archive:
   `npm publish <tarball> --access public --registry=https://registry.npmjs.org/`.
3. Tag the commit with `git tag -a typescript-v<version> <commit> -m "TypeScript SDK <version>"`,
   push the tag and create a GitHub release with the changelog entry.
4. Check the published version with
   `npm view @pearl.com/pearl-api-client-sdk@<version> version dist.integrity --registry=https://registry.npmjs.org/`
   and install it in a new project as a smoke test.

If publishing fails, check whether the version exists before you retry.
A published version number cannot be reused. Fix defects in a new patch release;
if needed, move the `latest` dist-tag back to a good release and note the issue.
Never commit credentials.

Reference: https://docs.npmjs.com/cli/commands/npm-publish/
