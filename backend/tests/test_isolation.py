"""pytest must never touch the real data directory - a demo may be running."""

import os

import store


def test_every_store_path_is_redirected_to_tmp():
    real = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
    for name in dir(store):
        if name.endswith("_PATH"):
            assert not getattr(store, name).startswith(real), f"{name} points at the real data dir"
