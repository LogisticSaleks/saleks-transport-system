/** UI-only filtering of saved Courses. Never changes DB rows or pricing. */
export type FilterableCourse = {
  databaseId: string | null;
  filterDate: string;
  truckId: string;
  customerId: string;
  containerNumber: string;
  settlementStatus: string;
};

export type CourseListFilters = {
  dateFrom: string;
  dateTo: string;
  truckId: string;
  customerId: string;
  containerSearch: string;
  settlementStatus: string;
};

export function matchesCourseListFilters(
  row: FilterableCourse,
  filters: CourseListFilters,
): boolean {
  if (row.databaseId === null) return false;
  if (filters.dateFrom && row.filterDate < filters.dateFrom) return false;
  if (filters.dateTo && row.filterDate > filters.dateTo) return false;
  if (filters.truckId && row.truckId !== filters.truckId) return false;
  if (filters.customerId && row.customerId !== filters.customerId) return false;
  if (
    filters.settlementStatus &&
    row.settlementStatus !== filters.settlementStatus
  ) return false;

  const query = normalizeContainerSearch(filters.containerSearch);
  if (query && !normalizeContainerSearch(row.containerNumber).includes(query)) {
    return false;
  }
  return true;
}

function normalizeContainerSearch(value: string): string {
  return value.normalize("NFKC").replace(/[\s\-_/]/g, "").toUpperCase();
}
