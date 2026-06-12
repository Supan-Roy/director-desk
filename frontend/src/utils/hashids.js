// Reversible project ID obfuscation utility.
// Multiplier must be coprime to MODULUS (2^32 = 4294967296).
const MULTIPLIER = 1254893n;
const MODULUS = 4294967296n;
const INVERSE = 3380150245n; // (MULTIPLIER * INVERSE) % MODULUS === 1n

/**
 * Obfuscate a numeric project ID into a base36 string of at least 6 characters.
 * @param {number|bigint} projectId 
 * @returns {string}
 */
export function encodeId(projectId) {
  if (projectId === undefined || projectId === null) return '';
  const pId = BigInt(projectId);
  let obfuscated = (pId * MULTIPLIER) % MODULUS;
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = [];
  let val = obfuscated;
  
  while (val > 0n) {
    result.push(chars[Number(val % 36n)]);
    val = val / 36n;
  }
  
  while (result.length < 6) {
    result.push("a");
  }
  
  return result.reverse().join("");
}

/**
 * Revert an obfuscated base36 string back to the numeric project ID.
 * @param {string} hashStr 
 * @returns {number}
 */
export function decodeId(hashStr) {
  if (!hashStr) return 0;
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const charMap = {};
  for (let i = 0; i < chars.length; i++) {
    charMap[chars[i]] = i;
  }
  
  let obfuscated = 0n;
  for (let i = 0; i < hashStr.length; i++) {
    const char = hashStr[i];
    if (char in charMap) {
      obfuscated = obfuscated * 36n + BigInt(charMap[char]);
    }
  }
  
  return Number((obfuscated * INVERSE) % MODULUS);
}

/**
 * Decode a URL parameter project ID.
 * Supports legacy purely numeric IDs (for backward compatibility)
 * and new obfuscated/hashed string IDs.
 * @param {string} paramId 
 * @returns {number}
 */
export function decodeProjectRouteId(paramId) {
  if (/^\d+$/.test(paramId)) {
    return Number(paramId);
  }
  return decodeId(paramId);
}
