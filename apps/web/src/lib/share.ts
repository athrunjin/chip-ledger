/** 手机上走系统分享，发到微信等 App；不支持时下载到本地。 */
export async function shareFile(blob: Blob, fileName: string) {
  const file = new File([blob], fileName, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      // 用户取消分享不算失败
      if (error instanceof DOMException && error.name === "AbortError") return;
      // 其他失败（例如 iOS 判定不是用户手势触发）改走下载
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
