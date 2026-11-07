import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Static composition studies. Preserve the selected wordmark candidates' paths;
// only uniform scale, position and separate paper motifs are added.
const root = fileURLToPath(new URL('../../', import.meta.url));
const sourceDirectory = path.join(root, 'apps/mobile/assets/brand/wordmark-candidates');
const outputDirectory = path.join(root, 'apps/mobile/assets/brand/wordmark-studies');
const bases = [
  { id: '2', name: '친근형', file: '02-friendly.svg', x: 112, top: 177, capHeight: 208, right: 1241, round: true },
  { id: '3', name: '모던형', file: '03-modern.svg', x: 152, top: 164, capHeight: 194, right: 1192, round: false },
];

const number = value => Number(value.toFixed(4));
const trajectory = (d, round) => `<path d="${d}" fill="none" stroke="#191919" stroke-width="${round ? 6 : 5.5}" stroke-linecap="round" stroke-linejoin="round"/>`;
const motifs = [
  {
    id: 'A', key: 'letter', name: '날아가는 편지', note: '작은 봉투와 짧은 물결 궤적',
    render: (right, round) => `${trajectory(`M${number(right - 115)} 152 C${number(right - 75)} 152 ${number(right - 46)} 172 ${number(right - 8)} 153 S${number(right + 15)} 132 ${number(right + 30)} 128`, round)}
    <g transform="translate(${number(right + 45)} 90) rotate(-14 56 37)" fill="none" stroke="#191919" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="2" width="108" height="70" rx="${round ? 10 : 4}"/>
      <path d="M5 9 50 42 Q56 47 62 42 L107 9" stroke-width="5.5"/>
      <path d="m5 67 32-27 m70 27-32-27" stroke-width="5"/>
    </g>`,
  },
  {
    id: 'B', key: 'plane', name: '종이비행기', note: '가볍게 올라가는 비행기와 짧은 궤적',
    render: (right, round) => `${trajectory(`M${number(right - 110)} 155 C${number(right - 70)} 169 ${number(right - 52)} 115 ${number(right - 14)} 123 S${number(right + 12)} 127 ${number(right + 28)} 116`, round)}
    <g transform="translate(${number(right + 45)} 72) scale(.82)" fill="none" stroke="#191919" stroke-width="${round ? 8 : 7.5}" stroke-linecap="round" stroke-linejoin="${round ? 'round' : 'miter'}">
      <path d="m4 42 128-38-40 108-28-41L4 42Z"/>
      <path d="m64 71 68-67 M64 71l-4 34 18-14" stroke-width="6.5"/>
    </g>`,
  },
  {
    id: 'C', key: 'page', name: '바람에 뜬 종이', note: '접힌 모서리와 살짝 휜 종이 한 장',
    render: (right, round) => `${trajectory(`M${number(right - 95)} 148 C${number(right - 46)} 158 ${number(right - 10)} 134 ${number(right + 32)} 119`, round)}
    <g transform="translate(${number(right + 53)} 65) rotate(-16 44 54)" fill="none" stroke="#191919" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="${round ? 'round' : 'miter'}">
      <path d="M4 4h58l26 26v69c-26-10-57-9-84 4V4Z"/>
      <path d="M62 4v26h26" stroke-width="5.5"/>
    </g>`,
  },
];

fs.mkdirSync(outputDirectory, { recursive: true });
const manifest = [];
for (const base of bases) {
  const original = fs.readFileSync(path.join(sourceDirectory, base.file), 'utf8');
  const group = original.match(/<g\b[\s\S]*<\/g>/)?.[0];
  assert(group, `Missing source wordmark group: ${base.file}`);
  assert.equal((group.match(/<path\b/g) ?? []).length, 8, 'Keep all eight source glyph paths.');
  const scale = 200 / base.capHeight;
  const x = 80 - base.x * scale;
  const y = 130 - base.top * scale;
  const right = 80 + (base.right - base.x) * scale;
  for (const motif of motifs) {
    const id = base.id + motif.id;
    const filename = `${id.toLowerCase()}-${motif.key}.svg`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="520" viewBox="0 0 1440 520" role="img" aria-labelledby="title description">
  <title id="title">Prologue 배치 후보 ${id} — ${base.name}와 ${motif.name}</title>
  <desc id="description">기존 ${base.id}번 글자 경로를 유지하고 ${motif.note}을 더한 정적인 벡터 배치 후보. 앱 적용 전 검토용이다.</desc>
  <g id="wordmark" transform="matrix(${number(scale)} 0 0 ${number(scale)} ${number(x)} ${number(y)})">
    ${group}
  </g>
  <g id="accent">
    ${motif.render(right, base.round)}
  </g>
</svg>
`;
    assert(svg.includes(group), 'Preserve the original wordmark paths and internal transform.');
    fs.writeFileSync(path.join(outputDirectory, filename), svg);
    manifest.push({ id, base: base.id, baseName: base.name, motif: motif.name, note: motif.note, file: filename });
  }
  assert.equal(fs.readFileSync(path.join(sourceDirectory, base.file), 'utf8'), original);
}
fs.writeFileSync(path.join(outputDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Prepared ${manifest.length} static SVG studies. Original wordmark paths preserved.`);
