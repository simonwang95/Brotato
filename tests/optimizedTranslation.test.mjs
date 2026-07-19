import assert from "node:assert/strict";
import {
  getUncompressedOptimizedMessage,
  godotOptimizedHash,
} from "../scripts/optimized-translation.mjs";

assert.equal(
  godotOptimizedHash(0, "CHAL_STAT_DESC"),
  1389618726,
  "Godot optimized-translation hash should match the official algorithm",
);

{
  const key = "CHAL_TEST_DESC";
  const firstHash = godotOptimizedHash(0, key);
  const secondHash = godotOptimizedHash(1, key);
  const hashTable = Array(7).fill(0xffffffff);
  hashTable[firstHash % hashTable.length] = 0;
  const message = Buffer.from("达到{0}幸运\0", "utf8");
  const translation = {
    hashTable,
    bucketTable: [1, 1, secondHash, 0, message.length, message.length],
    strings: message,
  };

  assert.equal(
    getUncompressedOptimizedMessage(translation, key),
    "达到{0}幸运",
    "uncompressed PHashTranslation messages should be read by key",
  );
  assert.equal(
    getUncompressedOptimizedMessage(translation, "CHAL_MISSING_DESC"),
    null,
    "missing PHashTranslation keys should stay unresolved",
  );
}

console.log("optimized translation tests passed");
