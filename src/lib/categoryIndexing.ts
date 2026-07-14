const INDEXING_QUERY_KEYS = ["q", "sort", "subcategory"] as const;

export function shouldNoIndexCategorySearchParams(
  input: URLSearchParams | string,
): boolean {
  const params =
    typeof input === "string"
      ? new URLSearchParams(input.startsWith("?") ? input.slice(1) : input)
      : input;

  const query = params.get("q")?.trim();
  const sort = params.get("sort")?.trim();
  const subcategory = params.get("subcategory")?.trim();

  return Boolean(
    query ||
      (sort && sort !== "recommended") ||
      (subcategory && subcategory !== "all"),
  );
}

export function categoryIndexingQueryKeys(): readonly string[] {
  return INDEXING_QUERY_KEYS;
}
