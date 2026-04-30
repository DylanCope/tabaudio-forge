# TabAudio Forge

Landing page: [https://&lt;user&gt;.github.io/tabaudio-forge/](https://fgbm.github.io/tabaudio-forge/)

TabAudio Forge is a minimal Manifest V3 extension for Chrome and Edge that records audio from the active browser tab and saves it locally as a WebM file.

The MVP uses `chrome.tabCapture.getMediaStreamId()`, an offscreen document, and `MediaRecorder`. The default recording target is `audio/webm;codecs=opus`, with a fallback to `audio/webm` if Opus is not reported as supported by the browser.

## Features

- Record audio from the active tab.
- Start, pause, resume, and stop from a small popup.
- Keep recording after the popup is closed.
- Save the result with `chrome.downloads.download`.
- English and Russian UI through Chrome's built-in extension i18n.
- No external services, accounts, ads, analytics, or telemetry.
- No host permissions.

## Install for Development

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this repository folder.
5. Open a tab with audio, click the TabAudio Forge action, and press Start.

## Output Files

Files are named like:

```text
tabaudioforge_untitled-tab_2026-04-29_13-55-00.webm
```

If the active tab title is available to the extension, it is sanitized and included in the filename. Otherwise `untitled-tab` is used.

## Privacy

- Audio is processed locally on the device.
- Audio is not uploaded anywhere.
- The extension does not initiate network requests.
- The captured stream is used only for local recording and download.

## Limits

- This records browser tab audio, not full system audio.
- Protected or DRM-backed media may behave unpredictably.
- "No artificial limit" means the extension does not impose a fixed recording duration. Actual limits still depend on browser stability, memory, Blob size, available disk space, and the current tab session.
- Long recordings are buffered as chunks in the extension's local IndexedDB storage and assembled into a final Blob on Stop. Peak memory still rises during final file assembly, so browser stability, Blob size, and disk space remain practical limits.
- PCM/lossless format selection is intentionally outside this MVP.

## Permissions

- `tabCapture`: capture audio from the active tab.
- `offscreen`: keep `MediaRecorder` running outside the popup.
- `downloads`: save the resulting `.webm` file locally.
- `activeTab`: read the active tab title and URL after the user starts recording.
- `storage`: keep recording state across Manifest V3 service worker restarts.
- `alarms`: clean up temporary offscreen resources after downloads.

## Localization

The extension uses Chrome extension i18n files:

- `_locales/en/messages.json`
- `_locales/ru/messages.json`

Chrome or Edge selects the UI language from the browser locale. English is the default locale.

## License

MIT