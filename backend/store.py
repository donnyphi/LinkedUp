"""JSON-file storage. No database on purpose - this is a demo app."""

import json
import os
import threading
from typing import Any, Dict, List, Optional

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")

SEEDS_PATH = os.path.join(DATA_DIR, "seed_profiles.json")
PROFILES_PATH = os.path.join(DATA_DIR, "profiles.json")
MATCHES_PATH = os.path.join(DATA_DIR, "matches.json")
CACHE_PATH = os.path.join(DATA_DIR, "ai_cache.json")

_lock = threading.Lock()


def _read(path: str, default: Any) -> Any:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def _write(path: str, value: Any) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(value, f, indent=2, ensure_ascii=False)
    os.replace(tmp, path)


def seeds() -> List[Dict]:
    return _read(SEEDS_PATH, [])


def profiles() -> List[Dict]:
    """Live profile list. Rebuilt from the committed seeds the first time."""
    existing = _read(PROFILES_PATH, None)
    if existing is None:
        existing = seeds()
        _write(PROFILES_PATH, existing)
    return existing


def save_profiles(value: List[Dict]) -> None:
    _write(PROFILES_PATH, value)


def get_profile(pid: str) -> Optional[Dict]:
    for p in profiles():
        if p["id"] == pid:
            return p
    return None


def upsert_profile(profile: Dict) -> None:
    with _lock:
        rows = profiles()
        rows = [p for p in rows if p["id"] != profile["id"]]
        rows.append(profile)
        save_profiles(rows)


def matches() -> List[Dict]:
    return _read(MATCHES_PATH, [])


def save_matches(value: List[Dict]) -> None:
    _write(MATCHES_PATH, value)


def get_match(mid: str) -> Optional[Dict]:
    for m in matches():
        if m["id"] == mid:
            return m
    return None


def upsert_match(match: Dict) -> None:
    with _lock:
        rows = [m for m in matches() if m["id"] != match["id"]]
        rows.append(match)
        save_matches(rows)


def next_match_id() -> str:
    return "m_%03d" % (len(matches()) + 1)


# ---- ai cache -------------------------------------------------------------

def cache_all() -> Dict[str, Any]:
    return _read(CACHE_PATH, {})


def cache_get(key: str) -> Any:
    return cache_all().get(key)


def cache_set(key: str, value: Any) -> None:
    with _lock:
        data = cache_all()
        data[key] = value
        _write(CACHE_PATH, data)


def reset() -> None:
    """Wipe 'me' and every match. Seeds survive so the demo can be re-run."""
    with _lock:
        save_profiles(seeds())
        save_matches([])
