"""Thin Anthropic wrapper. One model constant, one call helper, always safe."""

import json
import os
import re
from typing import Any, Optional

# The only place a model id lives.
MODEL = "claude-opus-5"
FALLBACK_MODEL = "claude-fable-5-1"

MAX_TOKENS = 1400
TEMPERATURE = 0.7

_client = None
_model_in_use = MODEL


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


def ask(system: str, user: str, max_tokens: int = MAX_TOKENS) -> Optional[str]:
    """Return raw text, or None if anything at all goes wrong."""
    global _model_in_use
    if not have_key():
        return None
    for model in (_model_in_use, FALLBACK_MODEL):
        try:
            resp = _get_client().messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=TEMPERATURE,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            _model_in_use = model
            return "".join(b.text for b in resp.content if b.type == "text")
        except Exception:
            continue
    return None
