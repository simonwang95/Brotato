const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function hasBytes(bytes, offset, expected) {
  if (offset < 0 || offset + expected.length > bytes.length) return false;
  return expected.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes, offset, length) {
  if (offset < 0 || offset + length > bytes.length) return "";
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function uint16Be(bytes, offset) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function uint16Le(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function uint24Le(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function uint32Be(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
}

function uint32Le(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true);
}

let crcTable;

function pngCrc(bytes, start, end) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let value = 0; value < 256; value += 1) {
      let crc = value;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
      }
      crcTable[value] = crc >>> 0;
    }
  }

  let crc = 0xffffffff;
  for (let index = start; index < end; index += 1) {
    crc = crcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function validPngColorMode(bitDepth, colorType) {
  const allowedDepths = {
    0: [1, 2, 4, 8, 16],
    2: [8, 16],
    3: [1, 2, 4, 8],
    4: [8, 16],
    6: [8, 16],
  };
  return allowedDepths[colorType]?.includes(bitDepth) === true;
}

function parsePng(bytes) {
  if (bytes.length < 57 || !hasBytes(bytes, 0, PNG_SIGNATURE)) return null;

  let offset = 8;
  let dimensions = null;
  let sawIdat = false;
  let sawIend = false;
  let chunkIndex = 0;

  while (offset + 12 <= bytes.length) {
    const length = uint32Be(bytes, offset);
    const typeOffset = offset + 4;
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + length;
    const chunkEnd = dataEnd + 4;
    if (dataEnd < dataOffset || chunkEnd > bytes.length) return null;

    const type = ascii(bytes, typeOffset, 4);
    if (!/^[A-Za-z]{4}$/.test(type)) return null;
    if (pngCrc(bytes, typeOffset, dataEnd) !== uint32Be(bytes, dataEnd)) return null;

    if (chunkIndex === 0) {
      if (type !== "IHDR" || length !== 13) return null;
      const width = uint32Be(bytes, dataOffset);
      const height = uint32Be(bytes, dataOffset + 4);
      const bitDepth = bytes[dataOffset + 8];
      const colorType = bytes[dataOffset + 9];
      const compression = bytes[dataOffset + 10];
      const filter = bytes[dataOffset + 11];
      const interlace = bytes[dataOffset + 12];
      if (
        width < 1 ||
        height < 1 ||
        !validPngColorMode(bitDepth, colorType) ||
        compression !== 0 ||
        filter !== 0 ||
        ![0, 1].includes(interlace)
      ) {
        return null;
      }
      dimensions = { width, height };
    } else if (type === "IHDR") {
      return null;
    }

    if (type === "IDAT") sawIdat = true;
    if (type === "IEND") {
      if (length !== 0 || !sawIdat) return null;
      sawIend = true;
      offset = chunkEnd;
      break;
    }

    offset = chunkEnd;
    chunkIndex += 1;
  }

  return sawIend && offset === bytes.length ? dimensions : null;
}

function isJpegSof(marker) {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    ![0xc4, 0xc8, 0xcc].includes(marker)
  );
}

function parseJpeg(bytes) {
  if (bytes.length < 14 || !hasBytes(bytes, 0, [0xff, 0xd8])) return null;

  let offset = 2;
  let dimensions = null;
  let sawScan = false;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return null;
    const marker = bytes[offset];
    offset += 1;

    if (marker === 0x00 || marker === 0xd8) return null;
    if (marker === 0xd9) return sawScan && dimensions && offset === bytes.length ? dimensions : null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;

    const segmentLength = uint16Be(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    const segmentData = offset + 2;

    if (isJpegSof(marker)) {
      if (segmentLength < 8) return null;
      const height = uint16Be(bytes, segmentData + 1);
      const width = uint16Be(bytes, segmentData + 3);
      if (width < 1 || height < 1) return null;
      dimensions = { width, height };
    }

    offset += segmentLength;
    if (marker !== 0xda) continue;
    if (!dimensions) return null;
    sawScan = true;

    // 熵编码区允许 0xFF00 转义和重启 marker；只在真正的 EOI 结束。
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      let markerOffset = offset + 1;
      while (markerOffset < bytes.length && bytes[markerOffset] === 0xff) markerOffset += 1;
      if (markerOffset >= bytes.length) return null;
      const scanMarker = bytes[markerOffset];
      if (scanMarker === 0x00 || (scanMarker >= 0xd0 && scanMarker <= 0xd7)) {
        offset = markerOffset + 1;
        continue;
      }
      if (scanMarker === 0xd9) {
        return markerOffset + 1 === bytes.length ? dimensions : null;
      }
      // 渐进 JPEG 可能有多个 scan；回到外层解析下一个有长度的 marker。
      offset = markerOffset - 1;
      break;
    }
  }

  return null;
}

function parseVp8Dimensions(bytes, dataOffset, size) {
  if (size < 10 || !hasBytes(bytes, dataOffset + 3, [0x9d, 0x01, 0x2a])) return null;
  const width = uint16Le(bytes, dataOffset + 6) & 0x3fff;
  const height = uint16Le(bytes, dataOffset + 8) & 0x3fff;
  return width > 0 && height > 0 ? { width, height } : null;
}

function parseVp8lDimensions(bytes, dataOffset, size) {
  if (size < 5 || bytes[dataOffset] !== 0x2f) return null;
  const bits = uint32Le(bytes, dataOffset + 1);
  return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
}

function parseWebp(bytes) {
  if (
    bytes.length < 20 ||
    ascii(bytes, 0, 4) !== "RIFF" ||
    ascii(bytes, 8, 4) !== "WEBP" ||
    uint32Le(bytes, 4) + 8 !== bytes.length
  ) {
    return null;
  }

  let offset = 12;
  let dimensions = null;
  let canvasDimensions = null;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4);
    const size = uint32Le(bytes, offset + 4);
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + size;
    const chunkEnd = dataEnd + (size % 2);
    if (dataEnd < dataOffset || chunkEnd > bytes.length) return null;

    if (type === "VP8X") {
      if (size !== 10 || (bytes[dataOffset] & 0x02) !== 0) return null; // 不接受动画 WebP
      canvasDimensions = {
        width: uint24Le(bytes, dataOffset + 4) + 1,
        height: uint24Le(bytes, dataOffset + 7) + 1,
      };
    } else if (type === "VP8L") {
      dimensions = parseVp8lDimensions(bytes, dataOffset, size);
      if (!dimensions) return null;
    } else if (type === "VP8 ") {
      dimensions = parseVp8Dimensions(bytes, dataOffset, size);
      if (!dimensions) return null;
    }

    offset = chunkEnd;
  }

  if (offset !== bytes.length || !dimensions) return null;
  if (
    canvasDimensions &&
    (canvasDimensions.width !== dimensions.width || canvasDimensions.height !== dimensions.height)
  ) {
    return null;
  }
  return canvasDimensions ?? dimensions;
}

const PARSERS = { png: parsePng, jpeg: parseJpeg, webp: parseWebp };

export function readImageDimensions(input, subtype) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return PARSERS[subtype]?.(bytes) ?? null;
}
