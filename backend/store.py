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

# Social layer. Seeded files are committed; runtime files are wiped by reset().
POSTS_PATH = os.path.join(DATA_DIR, "posts.json")
PROJECTS_PATH = os.path.join(DATA_DIR, "projects.json")
THREADS_PATH = os.path.join(DATA_DIR, "threads.json")
USER_POSTS_PATH = os.path.join(DATA_DIR, "user_posts.json")
USER_PROJECTS_PATH = os.path.join(DATA_DIR, "user_projects.json")
CONNECTIONS_PATH = os.path.join(DATA_DIR, "connections.json")

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


# ---- social layer -------------------------------------------------------------

def posts() -> List[Dict]:
    """What the user posted (newest first), then the seeded feed (newest first).

    Seeds carry a fixed clock so the demo feed reads the same every day; a post
    you just wrote must still land on top of them.
    """
    mine = sorted(_read(USER_POSTS_PATH, []), key=lambda r: r.get("created_at", 0), reverse=True)
    seeded = sorted(_read(POSTS_PATH, []), key=lambda r: r.get("created_at", 0), reverse=True)
    return mine + seeded


def get_post(pid: str) -> Optional[Dict]:
    return next((r for r in posts() if r["id"] == pid), None)


def add_user_post(row: Dict) -> None:
    with _lock:
        rows = _read(USER_POSTS_PATH, [])
        rows.append(row)
        _write(USER_POSTS_PATH, rows)


def next_post_id() -> str:
    return "up_%03d" % (len(_read(USER_POSTS_PATH, [])) + 1)


def projects() -> List[Dict]:
    return _read(PROJECTS_PATH, []) + _read(USER_PROJECTS_PATH, [])


def get_project(pid: str) -> Optional[Dict]:
    return next((r for r in projects() if r["id"] == pid), None)


def upsert_user_project(project: Dict) -> None:
    with _lock:
        rows = [r for r in _read(USER_PROJECTS_PATH, []) if r["id"] != project["id"]]
        rows.append(project)
        _write(USER_PROJECTS_PATH, rows)


def threads() -> List[Dict]:
    return _read(THREADS_PATH, [])


def connections() -> Dict[str, str]:
    """{other_id: 'connected'}"""
    return _read(CONNECTIONS_PATH, {})


def set_connection(other_id: str, status: str) -> None:
    with _lock:
        rows = connections()
        rows[other_id] = status
        _write(CONNECTIONS_PATH, rows)


def reset() -> None:
    """Wipe 'me', matches, connections and anything the user created. Seeds survive."""
    with _lock:
        save_profiles(seeds())
        save_matches([])
        _write(USER_POSTS_PATH, [])
        _write(USER_PROJECTS_PATH, [])
        _write(CONNECTIONS_PATH, {})
