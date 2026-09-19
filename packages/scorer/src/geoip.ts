import type { Lexicons } from "./types.ts";

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) + v;
  }
  return n >>> 0;
}

function parseCidr(cidr: string): { base: number; mask: number } | null {
  const [addr, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  if (!addr || !Number.isInteger(bits) || bits < 0 || bits > 32) return null;
  const base = ipv4ToInt(addr);
  if (base === null) return null;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return { base: base & mask, mask };
}

function inRfc1918(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return false;
  if ((n & 0xff000000) === 0x0a000000) return true; // 10.0.0.0/8
  if ((n & 0xfff00000) === 0xac100000) return true; // 172.16.0.0/12
  if ((n & 0xffff0000) === 0xc0a80000) return true; // 192.168.0.0/16
  return false;
}

function isLoopback(ip: string): boolean {
  if (ip === "::1") return true;
  const n = ipv4ToInt(ip);
  if (n === null) return false;
  return (n & 0xff000000) === 0x7f000000;
}

function longestDatacenterMatch(
  ip: string,
  cidrs: Lexicons["datacenter_cidrs"],
): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return false;
  let bestLen = -1;
  let matched = false;
  for (const { cidr } of cidrs) {
    const parsed = parseCidr(cidr);
    if (!parsed) continue;
    const bits = Number(cidr.split("/")[1]);
    if ((n & parsed.mask) === parsed.base && bits > bestLen) {
      bestLen = bits;
      matched = true;
    }
  }
  return matched;
}

export function classifyIp(
  ip: string,
  cidrs: Lexicons["datacenter_cidrs"],
): "rfc1918" | "loopback" | "datacenter" | "unknown" {
  if (!ip) return "unknown";
  if (isLoopback(ip)) return "loopback";
  if (inRfc1918(ip)) return "rfc1918";
  if (longestDatacenterMatch(ip, cidrs)) return "datacenter";
  return "unknown";
}
