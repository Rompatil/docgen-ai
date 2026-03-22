"""Utility functions for string and data manipulation."""

import re
from typing import List, Dict, Optional


def slugify(text: str, separator: str = "-") -> str:
    """Convert text to URL-friendly slug.

    Args:
        text: Input text
        separator: Character to use between words

    Returns:
        Lowercased slug string
    """
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[\s_]+', separator, text)


def truncate(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """Truncate text to max length with suffix."""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


def chunk_list(items: List, size: int) -> List[List]:
    """Split a list into chunks of given size."""
    return [items[i:i + size] for i in range(0, len(items), size)]


class TextProcessor:
    """Processes and transforms text content.

    Provides methods for cleaning, normalizing, and
    extracting information from text strings.
    """

    def __init__(self, locale: str = "en"):
        self.locale = locale
        self._stop_words = self._load_stop_words()

    def clean(self, text: str) -> str:
        """Remove extra whitespace and normalize."""
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def extract_emails(self, text: str) -> List[str]:
        """Find all email addresses in text."""
        pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        return re.findall(pattern, text)

    def word_count(self, text: str) -> int:
        """Count words excluding stop words."""
        words = self.clean(text).split()
        return len([w for w in words if w.lower() not in self._stop_words])

    def _load_stop_words(self) -> set:
        """Load stop words for the configured locale."""
        defaults = {"the", "a", "an", "is", "are", "was", "were", "in", "on", "at"}
        return defaults


class _InternalHelper:
    """Private helper - should not appear in exports."""

    def do_something(self):
        pass
