"""Thin Anthropic wrapper. One model constant, one call path, key never leaves here."""

import json
import os
import re
from typing import Any, List, Optional

# The only place a model id lives.
MODEL = "claude-opus-5"
FALLBACK_MODEL = "claude-fable-5-1"

MAX_TOKENS = 1400
TEMPERATURE = 0.7

_client = None
_model_in_use = MODEL


class NoKey(Exception):
    """ANTHROPIC_API_KEY is not set on the backend."""


class CallFailed(Exception):
    """The provider call failed on every model we tried. Message is safe for a client."""


def have_key() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


def _get_client():
    global _client
    if _client is None:
        from anthropic import Anthropic

        _client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client


def strip_fences(text: str) -> str:
    """Claude sometimes wraps JSON in ```json fences. Take it off."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def parse_json(text: str) -> Any:
    text = strip_fences(text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Last resort: grab the outermost object or array.
        for opener, closer in (("{", "}"), ("[", "]")):
            start, end = text.find(opener), text.rfind(closer)
            if start != -1 and end > start:
                try:
                    return json.loads(text[start : end + 1])
                except json.JSONDecodeError:
                    continue
        raise


def complete(
    system: str,
    messages: List[dict],
    max_tokens: int = MAX_TOKENS,
    temperature: float = TEMPERATURE,
) -> str:
    """Raise NoKey or CallFailed; never leak the key or a raw provider error."""
    global _model_in_use
    if not have_key():
        raise NoKey()
    last_error = "unknown"
    for model in (_model_in_use, FALLBACK_MODEL):
        try:
            resp = _get_client().messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system,
                messages=messages,
            )
            _model_in_use = model
            return "".join(b.text for b in resp.content if b.type == "text")
        except Exception as e:  # noqa: BLE001 - we deliberately swallow provider detail
            last_error = type(e).__name__
            continue
    raise CallFailed(f"Claude did not answer ({last_error})")


def ask(system: str, user: str, max_tokens: int = MAX_TOKENS) -> Optional[str]:
    """The soft variant used by the cached calls: None on any failure."""
    try:
        return complete(system, [{"role": "user", "content": user}], max_tokens=max_tokens)
    except (NoKey, CallFailed):
        return None
