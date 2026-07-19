# Security policy

## Supported versions

Security fixes are provided for the latest version published to the VS Code Marketplace.

## Reporting a vulnerability

Report suspected vulnerabilities through [GitHub's private vulnerability reporting](https://github.com/MarcellM01/Pinpoint/security/advisories/new).

Do not include secrets, private page content, or unredacted `.pinpoint/` reports in a public issue. If private reporting is unavailable, open a public issue requesting a private contact channel without disclosing vulnerability details.

Please include:

- The affected Pinpoint and VS Code versions
- Reproduction steps or a minimal proof of concept
- The security impact
- Any suggested mitigation

## Data handling

Pinpoint does not include telemetry, accounts, analytics, or extension-initiated network requests. Captured frontend context is written to the local workspace and its file mention is copied to the clipboard. Users should review reports before sharing them because rendered page content can contain sensitive information.
