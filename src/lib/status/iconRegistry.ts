import type { IconType } from "react-icons";
import * as Fa6Icons from "react-icons/fa6";
import * as LuIcons from "react-icons/lu";
import type { TagIconPack } from "@/types/tags";

type IconRegistry = Record<string, IconType>;

const FALLBACK_ICON_NAME_BY_PACK: Record<TagIconPack, string> = {
  lu: "LuTag",
  fa6: "FaTag",
};

const REGISTRIES: Record<TagIconPack, IconRegistry> = {
  lu: LuIcons as unknown as IconRegistry,
  fa6: Fa6Icons as unknown as IconRegistry,
};

function isIconComponent(value: unknown): value is IconType {
  return typeof value === "function";
}

export function getIconComponent(
  iconPack: TagIconPack,
  iconName: string,
): IconType | null {
  const registry = REGISTRIES[iconPack];
  if (!registry) return null;

  const icon = registry[iconName];
  if (isIconComponent(icon)) return icon;

  const fallback = registry[FALLBACK_ICON_NAME_BY_PACK[iconPack]];
  return isIconComponent(fallback) ? fallback : null;
}

export interface IconSearchOption {
  iconPack: TagIconPack;
  iconName: string;
}

export function listIconNamesByPack(iconPack: TagIconPack): string[] {
  const registry = REGISTRIES[iconPack];
  if (!registry) return [];
  return Object.keys(registry).filter((key) => isIconComponent(registry[key]));
}

export function searchIcons(
  query: string,
  options?: { limit?: number; packs?: TagIconPack[] },
): IconSearchOption[] {
  const limit = options?.limit ?? 250;
  const packs = options?.packs ?? ["lu", "fa6"];
  const normalizedQuery = query.trim().toLowerCase();
  const matches: IconSearchOption[] = [];

  for (const pack of packs) {
    const names = listIconNamesByPack(pack);
    for (const name of names) {
      if (
        normalizedQuery.length > 0 &&
        !name.toLowerCase().includes(normalizedQuery)
      ) {
        continue;
      }
      matches.push({ iconPack: pack, iconName: name });
      if (matches.length >= limit) return matches;
    }
  }

  return matches;
}
