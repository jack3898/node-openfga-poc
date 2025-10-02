export type FgaType = "user" | "tenant" | "site" | "vehicle";

export function identify(id: FgaType, query: any): string {
  return `${id}:${query}`;
}
