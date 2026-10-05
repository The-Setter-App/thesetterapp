const MAX_PAGE_BUTTONS = 5;

// The page numbers to offer as buttons: up to five, kept centred on the
// current page and clamped to the first and last pages.
export function getPageWindow(page: number, pageCount: number): number[] {
  const length = Math.max(0, Math.min(pageCount, MAX_PAGE_BUTTONS));

  return Array.from({ length }, (_, index) => {
    if (pageCount <= MAX_PAGE_BUTTONS) return index + 1;
    if (page <= 3) return index + 1;
    if (page >= pageCount - 2) return pageCount - 4 + index;
    return page - 2 + index;
  });
}
