/** 手机上走系统分享，发到微信等 App；不支持时下载到本地。 */
export async function shareFile(blob: Blob, fileName: string) {
  const file = new File([blob], fileName, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
    } catch (error) {
      // 用户取消分享不算失败
      if (error instanceof DOMException && error.name === "AbortError") return;
      throw error;
    }
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
