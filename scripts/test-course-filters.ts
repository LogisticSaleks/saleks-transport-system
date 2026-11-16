import { strict as assert } from "node:assert";
import {
  matchesCourseListFilters,
  type CourseListFilters,
  type FilterableCourse,
} from "../src/lib/courses/courseFilters";

const course: FilterableCourse = {
  databaseId: "course-1",
  filterDate: "2026-11-16",
  truckId: "truck-1",
  customerId: "customer-1",
  containerNumber: "ENMU 245381-2",
  settlementStatus: "OK",
};
const empty: CourseListFilters = {
  dateFrom: "",
  dateTo: "",
  truckId: "",
  customerId: "",
  containerSearch: "",
  settlementStatus: "",
};
const check = (overrides: Partial<CourseListFilters>) =>
  matchesCourseListFilters(course, { ...empty, ...overrides });

assert.equal(check({}), true);
assert.equal(check({ dateFrom: "2026-11-16" }), true);
assert.equal(check({ dateTo: "2026-11-16" }), true);
assert.equal(check({ dateFrom: "2026-11-17" }), false);
assert.equal(check({ dateTo: "2026-11-15" }), false);
assert.equal(check({ truckId: "truck-1" }), true);
assert.equal(check({ truckId: "truck-2" }), false);
assert.equal(check({ customerId: "customer-1" }), true);
assert.equal(check({ customerId: "customer-2" }), false);
assert.equal(check({ settlementStatus: "OK" }), true);
assert.equal(check({ settlementStatus: "UNDERPAID" }), false);
assert.equal(check({ containerSearch: "enmu245" }), true);
assert.equal(check({ containerSearch: "ENMU 245381/2" }), true);
assert.equal(check({ containerSearch: "ABCD" }), false);
assert.equal(matchesCourseListFilters({ ...course, databaseId: null }, empty), false);
console.log("Courses UI: 15 filter checks passed.");
