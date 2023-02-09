# yarn-plugin-npm-audit-fix

Yarn plugin to fix npm audit issues.

It's currently experimental, can only handle simple cases, and may error out on
some projects. PRs and detailed bug reports welcome!

## Installation

```sh
yarn plugin import 'https://raw.githubusercontent.com/sargunv/yarn-plugin-npm-audit-fix/yarn-v3/bundles/%40yarnpkg/plugin-npm-audit-fix.js'
```

## Usage

To attempt to fix all advisories:

```sh
yarn npm audit fix --all --recursive
```

The command takes all the same flags as
[yarn npm audit](https://yarnpkg.com/cli/npm/audit), and also `--mode` from
[yarn install](https://yarnpkg.com/cli/install).

## Strategy

Currently, the plugin searches for all descriptors in your dependency tree
matching the module name and vulnerable versions of an audit advisory, and
checks if new versions are available from the registry that will both satisfy
the patched version range from the advisory AND the descriptor's requested
version range. If so, it'll update the resolution to the new version.

I plan to add some additional strategies in the future:

- Walk up the tree from vulnerable packages to see if upgrading a parent package
  will resolve the advisory
- If updating a package that's a direct dependency via a project manifest,
  update the manifest to declare the new version
- Add a `--force` flag that will apply semver-compatible resolutions even if
  they're not in the descriptor's requested range
