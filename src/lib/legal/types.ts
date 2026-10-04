// Content model for the public legal pages. The documents are plain data so
// the wording lives in one place and the page component only decides how each
// kind of block looks.

// A run of text, or an email address rendered as a mailto link.
export type LegalInline = string | { email: string };

export interface LegalListItem {
  // Optional lead-in shown in bold, e.g. "Account Information".
  label?: string;
  text: string;
}

export type LegalBlock =
  | { type: "paragraph"; content: LegalInline[] }
  | { type: "subheading"; text: string }
  | { type: "list"; items: LegalListItem[] };

export interface LegalSection {
  // Shown with its position in the document, e.g. "3. Data Retention".
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  intro: LegalBlock[];
  sections: LegalSection[];
  // Closing lines such as the company name and copyright notice.
  footer: string[];
}

export function paragraph(...content: LegalInline[]): LegalBlock {
  return { type: "paragraph", content };
}

export function subheading(text: string): LegalBlock {
  return { type: "subheading", text };
}

export function list(...items: (string | LegalListItem)[]): LegalBlock {
  return {
    type: "list",
    items: items.map((item) =>
      typeof item === "string" ? { text: item } : item,
    ),
  };
}
