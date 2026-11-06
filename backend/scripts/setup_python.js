// Menyiapkan virtual environment Python dan library ML sebelum `bun run dev`.
// Bisa dipakai di Windows (venv\Scripts) maupun Mac/Linux (venv/bin).
const { execSync } = require("child_process");
const { existsSync } = require("fs");
const path = require("path");

const isWindows = process.platform === "win32";
const python = isWindows ? "python" : "python3";
const pip = isWindows
  ? path.join("venv", "Scripts", "pip")
  : path.join("venv", "bin", "pip");

if (!existsSync("venv")) {
  console.log("⚙️ Membuat virtual environment (venv)...");
  execSync(`${python} -m venv venv`, { stdio: "inherit" });
}

console.log("📦 Memeriksa & memasang dependensi Python dari requirements.txt...");
execSync(`${pip} install -r requirements.txt`, { stdio: "inherit" });
