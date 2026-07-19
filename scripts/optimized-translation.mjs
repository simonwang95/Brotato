const PHASH_CLASS_NAME = Buffer.from("PHashTranslation\0");
const EMPTY_BUCKET = 0xffffffff;
const GODOT_HASH_PRIME = 0x1000193;

export function godotOptimizedHash(seed, text) {
  let hash = seed || GODOT_HASH_PRIME;
  for (const byte of Buffer.from(text, "utf8")) {
    hash = (Math.imul(hash, GODOT_HASH_PRIME) ^ byte) >>> 0;
  }
  return hash;
}

export function parseOptimizedTranslation(resource) {
  const classOffset = resource.indexOf(PHASH_CLASS_NAME, 100);
  if (classOffset === -1) {
    throw new Error("Missing PHashTranslation object");
  }

  let offset = classOffset + PHASH_CLASS_NAME.length;
  const propertyCount = resource.readUInt32LE(offset);
  offset += 4;
  const properties = {};

  for (let propertyIndex = 0; propertyIndex < propertyCount; propertyIndex += 1) {
    const nameIndex = resource.readUInt32LE(offset);
    offset += 4;
    const type = resource.readUInt32LE(offset);
    offset += 4;

    if (type === 5) {
      const byteLength = resource.readUInt32LE(offset);
      offset += 4;
      properties[nameIndex] = resource
        .subarray(offset, offset + byteLength)
        .toString("utf8")
        .replace(/\0+$/, "");
      offset += byteLength;
    } else if (type === 32) {
      const length = resource.readUInt32LE(offset);
      offset += 4;
      properties[nameIndex] = Array.from({ length }, (_, index) =>
        resource.readUInt32LE(offset + index * 4),
      );
      offset += length * 4;
    } else if (type === 31) {
      const byteLength = resource.readUInt32LE(offset);
      offset += 4;
      properties[nameIndex] = resource.subarray(offset, offset + byteLength);
      offset += byteLength;
    } else {
      throw new Error(`Unsupported PHashTranslation property type ${type}`);
    }
  }

  const hashTable = properties[4];
  const bucketTable = properties[5];
  const strings = properties[6];
  if (!Array.isArray(hashTable) || !Array.isArray(bucketTable) || !Buffer.isBuffer(strings)) {
    throw new Error("Incomplete PHashTranslation tables");
  }

  return { hashTable, bucketTable, strings };
}

export function getUncompressedOptimizedMessage(translation, key) {
  if (!translation || !key || !translation.hashTable.length) return null;

  const firstHash = godotOptimizedHash(0, key);
  const bucketOffset = translation.hashTable[firstHash % translation.hashTable.length];
  if (bucketOffset === EMPTY_BUCKET) return null;

  const bucketSize = translation.bucketTable[bucketOffset];
  const hashSeed = translation.bucketTable[bucketOffset + 1];
  const messageHash = godotOptimizedHash(hashSeed, key);

  for (let index = 0; index < bucketSize; index += 1) {
    const entryOffset = bucketOffset + 2 + index * 4;
    if (translation.bucketTable[entryOffset] !== messageHash) continue;

    const stringOffset = translation.bucketTable[entryOffset + 1];
    const compressedSize = translation.bucketTable[entryOffset + 2];
    const uncompressedSize = translation.bucketTable[entryOffset + 3];
    if (compressedSize !== uncompressedSize) return null;

    return translation.strings
      .subarray(stringOffset, stringOffset + uncompressedSize)
      .toString("utf8")
      .replace(/\0+$/, "");
  }

  return null;
}
