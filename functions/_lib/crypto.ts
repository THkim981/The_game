function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let out = ''
  for (const b of u8) out += b.toString(16).padStart(2, '0')
  return out
}

export function randomHex(byteLength: number): string {
  const u8 = new Uint8Array(byteLength)
  crypto.getRandomValues(u8)
  return toHex(u8)
}

export async function hashPasswordPbkdf2Sha512(password: string, saltHex: string): Promise<string> {
  const passwordBytes = new TextEncoder().encode(password)
  const saltBytes = new Uint8Array(saltHex.match(/.{1,2}/g)?.map((h) => Number.parseInt(h, 16)) ?? [])

  const keyMaterial = await crypto.subtle.importKey('raw', passwordBytes, 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100_000,
      hash: 'SHA-512',
    },
    keyMaterial,
    64 * 8,
  )

  return toHex(bits)
}
