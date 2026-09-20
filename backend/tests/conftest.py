"""Tests never touch the real data directory. Running pytest mid-demo must not reset the demo."""

import os
import shutil
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import store  # noqa: E402


@pytest.fixture(autouse=True)
def isolated_data_dir(tmp_path, monkeypatch):
    real = store.DATA_DIR
    tmp = tmp_path / "data"
    tmp.mkdir()
    shutil.copy(os.path.join(real, "seed_profiles.json"), tmp / "seed_profiles.json")
    shutil.copy(os.path.join(real, "ai_cache.json"), tmp / "ai_cache.json")
    monkeypatch.setattr(store, "DATA_DIR", str(tmp))
    monkeypatch.setattr(store, "SEEDS_PATH", str(tmp / "seed_profiles.json"))
    monkeypatch.setattr(store, "PROFILES_PATH", str(tmp / "profiles.json"))
    monkeypatch.setattr(store, "MATCHES_PATH", str(tmp / "matches.json"))
    monkeypatch.setattr(store, "CACHE_PATH", str(tmp / "ai_cache.json"))
    # Seeded social files are read-only for tests; runtime ones must never touch the real dir.
    for name in ("posts.json", "projects.json", "threads.json"):
        shutil.copy(os.path.join(real, name), tmp / name)
    monkeypatch.setattr(store, "POSTS_PATH", str(tmp / "posts.json"))
    monkeypatch.setattr(store, "PROJECTS_PATH", str(tmp / "projects.json"))
    monkeypatch.setattr(store, "THREADS_PATH", str(tmp / "threads.json"))
    monkeypatch.setattr(store, "USER_POSTS_PATH", str(tmp / "user_posts.json"))
    monkeypatch.setattr(store, "USER_PROJECTS_PATH", str(tmp / "user_projects.json"))
    monkeypatch.setattr(store, "CONNECTIONS_PATH", str(tmp / "connections.json"))
    yield
