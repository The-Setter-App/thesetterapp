import { useEffect, useState } from "react";
import {
  type AiTagCatalogEntry,
  buildAiTagLookup,
  loadInboxAiTagsCatalog,
} from "@/lib/inbox/clientAiTagsCatalog";

export default function useInboxAiTagsCatalog(): Record<
  string,
  AiTagCatalogEntry
> {
  const [aiTagLookup, setAiTagLookup] = useState<
    Record<string, AiTagCatalogEntry>
  >({});

  useEffect(() => {
    let active = true;
    loadInboxAiTagsCatalog()
      .then((entries) => {
        if (active) setAiTagLookup(buildAiTagLookup(entries));
      })
      .catch((error) =>
        console.error("[useInboxAiTagsCatalog] Failed to load:", error),
      );
    return () => {
      active = false;
    };
  }, []);

  return aiTagLookup;
}
