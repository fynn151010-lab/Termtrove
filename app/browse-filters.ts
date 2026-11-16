export const defaultFilters = {
  q: "",
  curriculum: "",
  subject: "",
  status: "available",
  condition: "",
  min: "",
  max: "",
  sort: "recent",
};
export function readBrowseFilters(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const filters: Record<string, string> = { ...defaultFilters };
  for (const key of Object.keys(filters))
    if (params.has(key)) filters[key] = params.get(key) || "";
  filters.q = filters.q.slice(0, 200);
  if (!["", "available", "reserved", "sold"].includes(filters.status))
    filters.status = "available";
  if (!["recent", "low", "high", "az"].includes(filters.sort))
    filters.sort = "recent";
  for (const key of ["min", "max"])
    if (
      filters[key] &&
      (!Number.isFinite(Number(filters[key])) || Number(filters[key]) < 0)
    )
      filters[key] = "";
  return filters;
}
export function browseQuery(filters: Record<string, string>, forApi = false) {
  return new URLSearchParams(
    Object.entries(filters).filter(
      ([key, value]) => !!value || (!forApi && key === "status"),
    ),
  );
}
