const fs = require('fs');

const path = 'src/App.jsx';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const unesc = (s) => s.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
const compact = (s) => s.replace(/\s+/g, ' ').trim();

const getEscaped = (line, key) => {
  const re = new RegExp(`${key}: "((?:[^"\\\\]|\\\\.)*)"`);
  const m = line.match(re);
  return m ? unesc(m[1]) : '';
};

const getNumber = (line, key) => {
  const re = new RegExp(`${key}: ([0-9]+)`);
  const m = line.match(re);
  return m ? m[1] : '';
};

const firstSentence = (s) => {
  const c = compact(s);
  const m = c.match(/^(.*?[.!?])(?:\s|$)/);
  return m ? m[1].trim() : c;
};

const categoryLabel = (c) => ({
  laptop: 'laptop',
  phone: 'smartphone',
  audio: 'audio device',
  accessory: 'tech accessory',
  electronics: 'electronics product',
}[c] || 'device');

let touched = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.includes('{ id: "') || !line.includes('description: "')) continue;

  const brand = getEscaped(line, 'brand');
  const name = getEscaped(line, 'name');
  const spec = getEscaped(line, 'spec');
  const grade = getEscaped(line, 'grade');
  const category = getEscaped(line, 'category');
  const descRaw = line.match(/description: "((?:[^"\\]|\\.)*)"/);
  const desc = descRaw ? unesc(descRaw[1]) : '';
  const price = getNumber(line, 'price');
  const market = getNumber(line, 'market');

  if (!desc || !brand || !name || !spec || !grade || !category || !price || !market) continue;

  let short = firstSentence(desc);
  if (short.length < 55) {
    short = `${brand} ${name} with ${spec}, quality-checked and ready for dependable daily use.`;
  }
  if (short.length > 170) {
    short = short.slice(0, 167);
    const cut = short.lastIndexOf(' ');
    short = (cut > 120 ? short.slice(0, cut) : short).trim() + '...';
  }

  const save = Math.max(0, Number(market) - Number(price));
  const long = `${brand} ${name} is a quality-checked ${categoryLabel(category)} built for reliable everyday performance. ${compact(desc)} This configuration includes ${spec} and is offered in Grade ${grade} condition after functional testing and photo verification. At KSh ${Number(price).toLocaleString()} versus typical market pricing of KSh ${Number(market).toLocaleString()}, it delivers a savings of KSh ${save.toLocaleString()}.`;

  let out = line.replace(/description: "((?:[^"\\]|\\.)*)"/, `description: "${esc(short)}"`);
  if (/longDescription: "((?:[^"\\]|\\.)*)"/.test(out)) {
    out = out.replace(/longDescription: "((?:[^"\\]|\\.)*)"/, `longDescription: "${esc(long)}"`);
  } else {
    out = out.replace(/description: "(?:[^"\\]|\\.)*"/, (m) => `${m}, longDescription: "${esc(long)}"`);
  }

  if (out !== line) {
    lines[i] = out;
    touched++;
  }
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log(`Updated ${touched} product lines.`);
