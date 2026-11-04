import { afterEach, describe, expect, it, vi } from "vitest";

import { shareFile } from "./share";

const blob = new Blob(["{}"], { type: "application/json" });

function stubDownload() {
  const click = vi.fn();
  vi.stubGlobal("document", { createElement: () => ({ click }) });
  return click;
}

function stubShare(share: () => Promise<void>) {
  vi.stubGlobal("navigator", { canShare: () => true, share });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shareFile", () => {
  it("does not download when the system share is supported", async () => {
    const click = stubDownload();
    stubShare(() => Promise.resolve());

    await shareFile(blob, "a.json");
    expect(click).not.toHaveBeenCalled();
  });

  it("downloads when the system share is not supported", async () => {
    const click = stubDownload();
    vi.stubGlobal("navigator", {});

    await shareFile(blob, "a.json");
    expect(click).toHaveBeenCalledOnce();
  });

  it("falls back to download when the system share is refused", async () => {
    const click = stubDownload();
    stubShare(() => Promise.reject(new DOMException("needs a user gesture", "NotAllowedError")));

    await shareFile(blob, "a.json");
    expect(click).toHaveBeenCalledOnce();
  });

  it("neither downloads nor reports an error when the user cancels", async () => {
    const click = stubDownload();
    stubShare(() => Promise.reject(new DOMException("cancelled", "AbortError")));

    await shareFile(blob, "a.json");
    expect(click).not.toHaveBeenCalled();
  });
});
