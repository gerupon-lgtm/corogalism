// 承認済み操作音をそのまま同梱し、初回操作のネットワーク待ちをなくす。
// 音源を変更した場合だけ node tools/embed-select.mjs で再生成する。
import { readFile, writeFile } from 'node:fs/promises';
const wav = await readFile(new URL('../assets/audio/se-select.wav', import.meta.url));
let format, pcm;
for (let offset = 12; offset + 8 <= wav.length;) {
  const id = wav.toString('ascii', offset, offset + 4), size = wav.readUInt32LE(offset + 4);
  const data = wav.subarray(offset + 8, offset + 8 + size);
  if (id === 'fmt ') format = data;
  if (id === 'data') pcm = data;
  offset += 8 + size + (size % 2);
}
if (!format || !pcm || format.readUInt16LE(0) !== 1 || format.readUInt16LE(14) !== 16) throw new Error('16-bit PCM WAV required');
const channels = format.readUInt16LE(2), rate = format.readUInt32LE(4), frames = pcm.length / 2 / channels;
const source = `// tools/embed-select.mjsによる生成物。承認済みse-select.wavの16bit PCMを保持。\nconst pcm = '${pcm.toString('base64')}';\n\nexport function createSelectBuffer(context) {\n  const bytes = atob(pcm);\n  const buffer = context.createBuffer(${channels}, ${frames}, ${rate});\n  for (let channel = 0; channel < ${channels}; channel++) {\n    const data = buffer.getChannelData(channel);\n    for (let frame = 0; frame < ${frames}; frame++) {\n      const i = (frame * ${channels} + channel) * 2;\n      const sample = bytes.charCodeAt(i) | (bytes.charCodeAt(i + 1) << 8);\n      data[frame] = (sample >= 32768 ? sample - 65536 : sample) / 32768;\n    }\n  }\n  return buffer;\n}\n`;
await writeFile(new URL('../src/audio/selectBuffer.js', import.meta.url), source);
