"""Thin model-API wrapper. One model constant, one call path, key never leaves here.

Provider: the Meta Model API (https://api.meta.ai) over its Chat Completions
route. Muse Spark is a reasoning model and cannot switch reasoning off; this
route is the one that lets us pin it to "minimal", which keeps replies fast and
inside the token budget. The key is MODEL_API_KEY, read from the environment or
backend/.env at import, and is never logged, returned, or sent anywhere else.
"""

import json
import os
import re
from typing import Any, List, Optional

import httpx

# The only place a model id lives.
MODEL = "muse-spark-1.3"
FALLBACK_MODEL = "muse-spark-1.2"
BASE_URL = "https://api.meta.ai"
KEY_VAR = "MODEL_API_KEY"
ENV_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")

MAX_TOKENS = 1400
TEMPERATURE = 0.7
REASONING_EFFORT = "minimal"
# Reasoning tokens count against max_tokens on this provider. Callers ask for a
# visible budget; this is added on top so thinking never eats the answer.
REASONING_ALLOWANCE = 400
TIMEOUT_S = 30.0

_model_in_use = MODEL


class NoKey(Exception):
    """MODEL_API_KEY is not set on the backend."""


class CallFailed(Exception):
    """The provider call failed on every model we tried. Message is safe for a client."""


def _load_env_file() -> None:
    """Read backend/.env once at import. Never overrides a variable already set,
    so `MODEL_API_KEY= uvicorn ...` still runs the backend keyless on purpose."""
    try:
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                name, value = line.split("=", 1)
                os.environ.setdefault(name.strip(), value.strip().strip('"').strip("'"))
    except FileNotFoundError:
        pass


_load_env_file()


def have_key() -> bool:
    return bool(os.environ.get(KEY_VAR))


def strip_fences(text: str) -> str:
    """Models sometimes wrap JSON in ```json fences. Take it off."""
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
    """Raise NoKey or CallFailed; never leak the key or a raw provider error.

    `messages` are Anthropic-style {role, content} turns; the system prompt is
    sent as the first chat message. Returns the visible text, "" if the model
    stopped before writing any (callers treat that as a retryable miss).
    """
    global _model_in_use
    if not have_key():
        raise NoKey()
    headers = {"Authorization": f"Bearer {os.environ[KEY_VAR]}", "content-type": "application/json"}
    last_error = "unknown"
    for model in (_model_in_use, FALLBACK_MODEL):
        body = {
            "model": model,
            "max_tokens": max_tokens + REASONING_ALLOWANCE,
            "reasoning_effort": REASONING_EFFORT,
            "temperature": temperature,
            "messages": [{"role": "system", "content": system}] + messages,
        }
        try:
            r = httpx.post(BASE_URL + "/v1/chat/completions", headers=headers, json=body, timeout=TIMEOUT_S)
        except httpx.HTTPError as e:  # network, timeout - provider detail stays server-side
            last_error = type(e).__name__
            continue
        if r.status_code != 200:
            kind = None
            try:
                kind = ((r.json().get("error") or {}).get("type"))
            except ValueError:
                pass
            last_error = f"HTTP {r.status_code}{f' {kind}' if kind else ''}"
            continue
        try:
            choice = (r.json().get("choices") or [{}])[0]
        except ValueError:
            last_error = "bad json"
            continue
        _model_in_use = model
        return ((choice.get("message") or {}).get("content") or "").strip()
    raise CallFailed(f"The model did not answer ({last_error})")


def ask(system: str, user: str, max_tokens: int = MAX_TOKENS) -> Optional[str]:
    """The soft variant used by the cached calls: None on any failure."""
    try:
        return complete(system, [{"role": "user", "content": user}], max_tokens=max_tokens)
    except (NoKey, CallFailed):
        return None
