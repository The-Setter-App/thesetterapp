// Saves text the page already holds as a file on the visitor's device.
export function downloadTextFile(
  fileName: string,
  content: string,
  mimeType: string,
): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  // Released on the next tick, after the browser has started the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
