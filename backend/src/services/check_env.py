import sys
import subprocess
import importlib.util
import os

print("[Python Env] 🔍 Memeriksa dependensi Python di Virtual Environment...", file=sys.stderr)

required_packages = ["tensorflow", "numpy", "cv2"]

for pkg in required_packages:
    if importlib.util.find_spec(pkg) is None:
        print(f"[Python Env] ❌ Pustaka '{pkg}' belum terpasang di venv.", file=sys.stderr)
        sys.exit(1)

print("[Python Env] ✨ Semua dependensi Python di venv lengkap & siap!", file=sys.stderr)