"""Pytest configuration for backend tests.

Tests should be runnable locally without requiring a developer's .env file.
The CI workflow also supplies these variables explicitly; setdefault keeps
real environment values intact when they are already provided.
"""

import os


os.environ.setdefault("DATABASE_URL", "sqlite:///./ci.db")
os.environ.setdefault(
    "SECRET_KEY",
    "ci-test-secret-key-must-be-at-least-32-characters-long",
)
