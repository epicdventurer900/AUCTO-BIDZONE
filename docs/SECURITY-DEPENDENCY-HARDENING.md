# Security Dependency Hardening

This project periodically updates direct and transitive dependencies in response to GitHub Dependabot advisories.

## Current hardening

- Replaced the `python-jose` JWT dependency chain with `PyJWT`, removing the `ecdsa`, `rsa`, and `pyasn1` dependency chain from the backend.
- Updated `pytest` to `8.4.3`.
- Pinned the frontend React Router dependency to patched `8.3.0` using the existing `react-router-dom` import surface.
- Refreshed the frontend lockfile and moved the resolved `postcss` package to `8.5.28`.

## Verification

The repository CI workflow should be allowed to complete after dependency changes. Security alerts should be re-evaluated by GitHub Dependabot after its dependency graph refreshes.
