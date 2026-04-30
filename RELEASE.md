# Release Process

This project is packaged as a static Manifest V3 extension. There is no build step beyond validating
the manifest inputs and creating a zip archive from the extension file allowlist.

## Local Commands

```sh
npm run validate
npm run package
```

`npm run package` creates `dist/tabaudio-forge-<version>.zip`. The version comes from
`manifest.json`.

## GitHub Release

1. Update `manifest.json` and `package.json` to the same version.
2. Run `npm run validate` and `npm run package`.
3. Commit the version change.
4. Create and push a matching tag:

```sh
git tag v0.1.0
git push origin v0.1.0
```

The `Extension Package` workflow validates the extension, creates the zip artifact, checks that the
tag matches `manifest.json`, and attaches the zip to the GitHub Release.

## GitHub Pages

The static landing page is served from `docs/`. The `GitHub Pages` workflow deploys that directory
with the official Pages actions.

In the repository settings, set GitHub Pages source to `GitHub Actions`.

## Chrome Web Store

The `Chrome Web Store` workflow is manual. By default it uploads the package but does not submit it
for publishing. Run it with `publish` enabled only when the uploaded package should be submitted for
review.

Required repository secrets:

- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`
- `CHROME_PUBLISHER_ID`
- `CHROME_EXTENSION_ID`

The Chrome Web Store item must already exist in the developer dashboard, and the Google Cloud project
must have Chrome Web Store API access configured for the OAuth client.

## Store Assets

Before publishing, make sure the store listing has the required screenshots, descriptions, category,
privacy information, and support details. The extension package itself includes PNG icons referenced
by `manifest.json`.
