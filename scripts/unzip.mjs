import { inflateRawSync } from 'node:zlib';

/** Extracts one entry from a zip buffer as UTF-8 text. Supports stored and deflated entries. */
export function unzipEntry(zip, name) {
  const endOfDirectory = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const entries = zip.readUInt16LE(endOfDirectory + 10);
  let offset = zip.readUInt32LE(endOfDirectory + 16);

  for (let i = 0; i < entries; i++) {
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localHeader = zip.readUInt32LE(offset + 42);
    const entryName = zip.toString('utf8', offset + 46, offset + 46 + nameLength);

    if (entryName === name) {
      const dataStart = localHeader + 30 + zip.readUInt16LE(localHeader + 26) + zip.readUInt16LE(localHeader + 28);
      const data = zip.subarray(dataStart, dataStart + compressedSize);
      return (method === 0 ? data : inflateRawSync(data)).toString('utf8');
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`${name} not found in zip`);
}

export async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

export function tsvRows(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('\t'));
}
