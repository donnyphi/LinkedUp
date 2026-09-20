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
    yield
