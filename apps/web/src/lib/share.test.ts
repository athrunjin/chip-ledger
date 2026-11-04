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
  it("支持系统分享时不下载", async () => {
    const click = stubDownload();
    stubShare(() => Promise.resolve());

    await shareFile(blob, "a.json");
    expect(click).not.toHaveBeenCalled();
  });

  it("不支持系统分享时下载", async () => {
    const click = stubDownload();
    vi.stubGlobal("navigator", {});

    await shareFile(blob, "a.json");
    expect(click).toHaveBeenCalledOnce();
  });

  it("系统分享被拒绝时改走下载", async () => {
    const click = stubDownload();
    stubShare(() => Promise.reject(new DOMException("需要用户手势", "NotAllowedError")));

    await shareFile(blob, "a.json");
    expect(click).toHaveBeenCalledOnce();
  });

  it("用户取消分享时不下载，也不报错", async () => {
    const click = stubDownload();
    stubShare(() => Promise.reject(new DOMException("取消", "AbortError")));

    await shareFile(blob, "a.json");
    expect(click).not.toHaveBeenCalled();
  });
});
