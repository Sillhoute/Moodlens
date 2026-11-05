import sys
import subprocess
import importlib.util

required_packages = {
    "tensorflow": "tensorflow",
    "cv2": "opencv-python-headless",
    "numpy": "numpy"
}

print("[Python Env] 🔍 Memeriksa dependensi Python...", file=sys.stderr)

for module_name, package_name in required_packages.items():
    if importlib.util.find_spec(module_name) is None:
        print(f"[Python Env] 📦 Pustaka '{package_name}' belum ada. Menginstal sekali di awal...", file=sys.stderr)
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "--no-cache-dir", package_name])
            print(f"[Python Env] ✅ Berhasil menginstal {package_name}", file=sys.stderr)
        except Exception as e:
            print(f"[Python Env] ❌ Gagal menginstal {package_name}: {e}", file=sys.stderr)
            sys.exit(1)

print("[Python Env] ✨ Semua dependensi Python lengkap!", file=sys.stderr)