import type { ClientSignals } from "./types.ts";

export async function loadClientSignals(): Promise<ClientSignals> {
  if (typeof window === "undefined") {
    return {
      visitor_id: "",
      ua: "",
      webdriver: false,
      tz: "",
      languages: [],
    };
  }

  let visitor_id = "";
  try {
    const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
    const agent = await FingerprintJS.load();
    const result = await agent.get();
    visitor_id = result.visitorId;
  } catch {
    visitor_id = "";
  }

  return {
    visitor_id,
    ua: navigator.userAgent,
    webdriver: Boolean(navigator.webdriver),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    languages: [...navigator.languages].slice(0, 8),
  };
}
