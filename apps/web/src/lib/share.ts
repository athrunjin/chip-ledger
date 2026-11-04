/** Uses the system share on phones to reach apps like WeChat, and downloads the file where that is not supported. */
export async function shareFile(blob: Blob, fileName: string) {
  const file = new File([blob], fileName, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      // A cancelled share is not a failure
      if (error instanceof DOMException && error.name === "AbortError") return;
      // Other failures (e.g. iOS deciding it was not a user gesture) fall back to download
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
