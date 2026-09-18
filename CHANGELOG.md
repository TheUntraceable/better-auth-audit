# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Lowered the `better-auth` peer floor from `^1.7.0` back to `^1.5.0`. The
  1.7.0 floor existed only because better-auth renamed its `getIp` export to
  `getIP`; the plugin now resolves whichever name the installed version
  exports, so 1.5.x and 1.6.x consumers work again. Verified with a clean
  typecheck and full test suite against better-auth 1.5.0, 1.6.33 and 1.7.5.

  Note that `^1.5.0` is the real floor, not the `^1.2.0` advertised before
  1.4.0: `isAPIError` is absent from every 1.4.x build and
  `runInBackgroundOrAwait` first appears in 1.4.8, so the range published
  with 1.3.0 was already inaccurate.

- The plugin now throws from `init` when better-auth exports neither `getIP`
  nor `getIp`, instead of quietly writing `ipAddress: null` on every entry. A
  further rename upstream is now a startup failure naming both candidates and
  the installed version, not a silent loss of evidence. The resolver's type is
  also inferred from whichever name better-auth declares, so a signature change
  fails typecheck rather than being erased by a cast.

### Changed

- Bumped the `better-auth` devDependency to 1.7.5.
- Pinned the test toolchain to Node 22.16.0 in `.nvmrc`, the first version
  whose `node:sqlite` exposes `StatementSync.prototype.columns()`. better-auth's
  test utilities need it, so the test suite cannot run below that. This is a
  contributor requirement only: the package declares no `engines` field,
  because nothing in `dist` depends on it.
- Added `repository`, `homepage`, `bugs` and `keywords` metadata, plus a
  `prepublishOnly` script running typecheck, tests and build.
- Added this changelog and a `LICENSE` file matching the MIT license already
  declared in `package.json`.

### Tests

- The shared test fixture's email is now verified before the email OTP sign-in
  test runs. better-auth 1.7 deletes every account linked to an
  `emailVerified: false` user the first time an email-primary proof resolves
  to it, which was destroying the password credential the rest of the suite
  depends on.

## [1.4.0] - 2026-08-23

### Changed

- Tracked better-auth's `getIp` to `getIP` export rename introduced in
  better-auth 1.7.0.
- Raised the `better-auth` peer range to `^1.7.0` to match that rename. (This
  proved to be unnecessarily narrow and is relaxed again above.)
- Widened the `zod` peer range to `^3.0.0 || ^4.0.0`; better-auth 1.7 requires
  zod v4 internally.

## [1.3.0] - 2026-07-20

### Added

- Audit logging for email OTP authentication, covering the send, sign-in and
  verification routes, with a dedicated router module.

### Fixed

- Audit writes are awaited by default instead of being dangled by
  `runInBackground`. Unawaited writes are handled badly by serverless
  runtimes: Convex warns about unawaited mutations on every audited HTTP
  endpoint and Vercel can kill the write once the response is sent. The write
  now goes to the background only when `advanced.backgroundTasks.handler`
  provides a real `waitUntil`.

## [1.2.0] - 2026-07-14

Earlier releases are not documented here; see the git history.

[Unreleased]: https://github.com/TheUntraceable/better-auth-audit/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/TheUntraceable/better-auth-audit/compare/v1.2.0...v1.4.0
[1.3.0]: https://github.com/TheUntraceable/better-auth-audit/commit/fdf0994
[1.2.0]: https://github.com/TheUntraceable/better-auth-audit/releases/tag/v1.2.0
