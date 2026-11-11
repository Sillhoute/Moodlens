const { execSync } = require("child_process");
const { existsSync } = require("fs");
const path = require("path");

const isWin = process.platform === "win32";
const py = isWin ? "python" : "python3";

if (!existsSync("venv")) {
  console.log("⚙️ Membuat virtual environment (venv)...");
  execSync(`${py} -m venv venv`, { stdio: "inherit" });
}

console.log("📦 Memeriksa & memasang dependensi Python...");
const pythonExe = isWin
  ? path.join("venv", "Scripts", "python.exe")
  : path.join("venv", "bin", "python");

// Gunakan 'python -m pip' agar lebih aman dan kompatibel.
execSync(`"${pythonExe}" -m pip install --upgrade pip`, { stdio: "inherit" });

console.log("✨ Lingkungan Python siap!");
