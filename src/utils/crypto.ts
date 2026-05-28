/**
 * 密码加密工具
 * 使用 Web Crypto API (SHA-256) 进行密码哈希，替代明文存储
 */

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function verifyPassword(input: string, storedHash: string): Promise<boolean> {
  const inputHash = await hashPassword(input);
  return inputHash === storedHash;
}
