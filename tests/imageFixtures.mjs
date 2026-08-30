const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

let crcTable;

function crc32(buffer) {
  if (!crcTable) {
    crcTable = Array.from({ length: 256 }, (_, value) => {
      let crc = value;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
      }
      return crc >>> 0;
    });
  }
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return chunk;
}

export function makePng(width, height, padBytes = 0) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const chunks = [pngChunk("IHDR", ihdr)];
  if (padBytes > 0) chunks.push(pngChunk("tEXt", Buffer.alloc(padBytes, 0x61)));
  chunks.push(pngChunk("IDAT", Buffer.from([0x78, 0x9c, 0x63, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01])));
  chunks.push(pngChunk("IEND", Buffer.alloc(0)));
  return Buffer.concat([PNG_SIGNATURE, ...chunks]);
}

export function makeHeaderOnlyPng(width, height) {
  const header = Buffer.alloc(33);
  PNG_SIGNATURE.copy(header, 0);
  header.writeUInt32BE(13, 8);
  Buffer.from("IHDR").copy(header, 12);
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  header[24] = 8;
  header[25] = 6;
  return header;
}

export function makeJpeg(width, height) {
  const sofData = Buffer.from([
    8,
    (height >>> 8) & 0xff,
    height & 0xff,
    (width >>> 8) & 0xff,
    width & 0xff,
    1,
    1,
    0x11,
    0,
  ]);
  const sosData = Buffer.from([1, 1, 0, 0, 63, 0]);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0, sofData.length + 2]),
    sofData,
    Buffer.from([0xff, 0xda, 0, sosData.length + 2]),
    sosData,
    Buffer.from([0x00, 0xff, 0xd9]),
  ]);
}

function webpChunk(type, data) {
  const padding = data.length % 2 ? Buffer.from([0]) : Buffer.alloc(0);
  const header = Buffer.alloc(8);
  header.write(type, 0, 4, "ascii");
  header.writeUInt32LE(data.length, 4);
  return Buffer.concat([header, data, padding]);
}

function webpFile(chunks) {
  const body = Buffer.concat([Buffer.from("WEBP"), ...chunks]);
  const header = Buffer.alloc(8);
  header.write("RIFF", 0, 4, "ascii");
  header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}

export function makeWebpLossless(width, height) {
  const data = Buffer.alloc(5);
  data[0] = 0x2f;
  data.writeUInt32LE(((height - 1) << 14) | (width - 1), 1);
  return webpFile([webpChunk("VP8L", data)]);
}

export function makeWebpLossy(width, height) {
  const data = Buffer.alloc(10);
  data[3] = 0x9d;
  data[4] = 0x01;
  data[5] = 0x2a;
  data.writeUInt16LE(width & 0x3fff, 6);
  data.writeUInt16LE(height & 0x3fff, 8);
  return webpFile([webpChunk("VP8 ", data)]);
}

export function makeWebpExtended(width, height) {
  const extended = Buffer.alloc(10);
  extended.writeUIntLE(width - 1, 4, 3);
  extended.writeUIntLE(height - 1, 7, 3);
  const image = Buffer.alloc(5);
  image[0] = 0x2f;
  image.writeUInt32LE(((height - 1) << 14) | (width - 1), 1);
  return webpFile([webpChunk("VP8X", extended), webpChunk("VP8L", image)]);
}
