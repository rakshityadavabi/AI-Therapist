const fs = require('fs');
const path = require('path');

function walk(dir, cb) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const res = path.join(dir, f.name);
    if (f.isDirectory()) walk(res, cb);
    else cb(res);
  }
}

const root = path.join(__dirname, '..', 'node_modules', 'face-api.js', 'build', 'es6');
if (!fs.existsSync(root)) {
  console.log('face-api.js build folder not found; skipping cleanup.');
  process.exit(0);
}

walk(root, (file) => {
  if (!file.endsWith('.js')) return;
  try {
    const s = fs.readFileSync(file, 'utf8');
    let cleaned = s.replace(/\/\/#[ \t]*sourceMappingURL=.*\n?/g, '').replace(/\/\*# sourceMappingURL=.*\*\//g, '');
    // Neutralize static require('fs') calls to avoid bundlers resolving Node fs in browser builds
    cleaned = cleaned.replace(/fs\s*=\s*require\(['\"]fs['\"]\);/g, "fs = (typeof window === 'undefined' && typeof require !== 'undefined') ? eval('require')('fs') : undefined;");
    if (s !== cleaned) fs.writeFileSync(file, cleaned, 'utf8');
  } catch (err) {
    // ignore individual file errors
  }
});

console.log('face-api.js sourceMappingURL cleanup complete');
