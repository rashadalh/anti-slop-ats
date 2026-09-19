/** Browser stub so @anti-slop/scorer can load; webhook HMAC is not used in the SPA. */
export function createHmac(
  _algo: string,
  _secret: string | ArrayBufferView,
): { update: (d: string) => { digest: (enc: string) => string } } {
  return {
    update: () => ({
      digest: () => "",
    }),
  };
}

export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}
