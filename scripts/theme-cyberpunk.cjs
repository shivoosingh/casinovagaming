const fs = require("fs");
const path = require("path");

const pairs = [
  [/rgba\(201,\s*169,\s*98/g, "rgba(0, 229, 255"],
  [/rgba\(224,\s*200,\s*120/g, "rgba(0, 238, 255"],
  [/rgba\(232,\s*213,\s*163/g, "rgba(122, 245, 255"],
  [/rgba\(196,\s*120,\s*90/g, "rgba(255, 45, 120"],
  [/rgba\(122,\s*143,\s*126/g, "rgba(123, 47, 247"],
  [/rgba\(212,\s*210,\s*200/g, "rgba(200, 210, 255"],
  [/rgba\(11,\s*12,\s*15/g, "rgba(5, 5, 16"],
  [/#e8d5a3/gi, "#7af5ff"],
  [/#e0c878/gi, "#33eeff"],
  [/#c9a962/gi, "#00E5FF"],
  [/#a8893f/gi, "#0099cc"],
  [/#8f7340/gi, "#0077aa"],
  [/#d4b56e/gi, "#00c4e0"],
  [/#c4785a/gi, "#ff2d78"],
  [/#a05a40/gi, "#cc0055"],
  [/#7a8f7e/gi, "#7B2FF7"],
  [/#5a6f5e/gi, "#5500cc"],
  [/#0b0c0f/gi, "#050510"],
  [/#0a0b0d/gi, "#030308"],
  [/#0e1014/gi, "#050816"],
  [/#12141a/gi, "#0a0a1e"],
  [/#151820/gi, "#0d1028"],
  [/#12100e/gi, "#100510"],
  [/#151310/gi, "#100510"],
  [/#16181f/gi, "#0d0d1f"],
  [/#101218/gi, "#080818"],
  [/#181a21/gi, "#0d0d1f"],
  [/#1a1c24/gi, "#10102a"],
  [/#22252f/gi, "#1a1a3a"],
  [/#f0eee6/gi, "#e8eaf6"],
  [/#d4d2c8/gi, "#c8caef"],
  [/#8a8b94/gi, "#6b6d8f"],
];

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (f === "node_modules" || f === ".next" || f === "public") continue;
      walk(p, out);
    } else if (/\.(tsx?|jsx?|css)$/.test(f)) out.push(p);
  }
  return out;
}

const root = path.join(__dirname, "..", "src");
const files = walk(root);
let changed = 0;
for (const file of files) {
  let t = fs.readFileSync(file, "utf8");
  const orig = t;
  for (const [re, rep] of pairs) t = t.replace(re, rep);
  if (t !== orig) {
    fs.writeFileSync(file, t);
    changed++;
  }
}
console.log("Updated", changed, "of", files.length);
