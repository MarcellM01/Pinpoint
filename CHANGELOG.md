# Changelog

All notable changes to Pinpoint are documented in this file.

## Unreleased

- Capture a screenshot of the picked element alongside its HTML/CSS context, saved next to the report and embedded in it. The clipboard still carries just the `@` mention — most AI chat inputs treat an OS clipboard image as the whole paste and drop accompanying text, so the mention stays the reliable, primary way to get context (and the screenshot) into a chat.
- Vendor [modern-screenshot](https://github.com/qq15725/modern-screenshot) (MIT) to render the screenshot from the live DOM; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## 0.1.1

- First public VS Code Marketplace release.
- Publish under the unique `marcellm01.tinysuite-pinpoint` extension identifier.

## 0.1.0

- Initial release.
- Pick elements in VS Code's Integrated Browser.
- Capture agent-readable HTML and CSS context in local Markdown reports.
- Copy report `@` mentions to the clipboard for use in AI chats.
