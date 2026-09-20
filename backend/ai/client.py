"""Thin model-API wrapper. One model constant, one call path, key never leaves here.

Provider: the Meta Model API (https://api.meta.ai), spoken through its Anthropic
Messages-compatible endpoint, so the Anthropic SDK is still the transport. The
key is MODEL_API_KEY, read from the environment or backend/.env, and is never
logged, returned, or sent anywhere but the provider.
"""

import json
import os
import re
from typing import Any, List, Optional

# The only place a model id lives.
MODEL = "muse-spark-1.3"
FALLBACK_MODEL = "muse-spark-1.2"
BASE_URL = "https://api.meta.ai"
KEY_VAR = "MODEL_API_KEY"
ENV_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")

MAX_TOKENS = 1400
TEMPERATURE = 0.7

_client = None
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


def _get_client():
    global _client
    if _client is None:
        from anthropic import Anthropic

        _client = Anthropic(base_url=BASE_URL, auth_token=os.environ[KEY_VAR])
    return _client


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
    """Raise NoKey or CallFailed; never leak the key or a raw provider error."""
    global _model_in_use
    if not have_key():
        raise NoKey()
    # `temperature` is accepted for callers but not sent: the installed SDK's
    # messages.create() no longer takes it, and the provider recommends leaving
    # sampling at its default anyway.
    del temperature
    last_error = "unknown"
    for model in (_model_in_use, FALLBACK_MODEL):
        try:
            resp = _get_client().messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system,
                messages=messages,
            )
            _model_in_use = model
            return "".join(b.text for b in resp.content if b.type == "text")
        except Exception as e:  # noqa: BLE001 - provider detail stays server-side
            status = getattr(e, "status_code", None)
            body = getattr(e, "body", None) or {}
            kind = (body.get("error") or {}).get("type") if isinstance(body, dict) else None
            last_error = f"{type(e).__name__}{f' {status}' if status else ''}{f' {kind}' if kind else ''}"
            continue
    raise CallFailed(f"The model did not answer ({last_error})")


def ask(system: str, user: str, max_tokens: int = MAX_TOKENS) -> Optional[str]:
    """The soft variant used by the cached calls: None on any failure."""
    try:
        return complete(system, [{"role": "user", "content": user}], max_tokens=max_tokens)
    except (NoKey, CallFailed):
        return None
