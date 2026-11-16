import { strict as assert } from "node:assert";
import {
  parseAutoCreatedAddressText,
  findAddressDuplicates,
  AutoAddressParsingError,
} from "../src/lib/addresses/addressCreation";

const cases = [
  ["Columbusstraat 17, 3165 AC Rotterdam, NL", "Columbusstraat 17", "Rotterdam", "3165 AC", "NL"],
  ["Columbusstraat 17, Rotterdam, 3165 AC, NL", "Columbusstraat 17", "Rotterdam", "3165 AC", "NL"],
  ["Columbusstraat 17, Rotterdam 3165 AC, NL", "Columbusstraat 17", "Rotterdam", "3165 AC", "NL"],
  ["A15 Depot, Columbusstraat 17, 3165 AC Rotterdam, NL", "Columbusstraat 17", "Rotterdam", "3165 AC", "NL"],
  ["A15 Depot — Columbusstraat 17, 3165 AC Rotterdam, NL", "Columbusstraat 17", "Rotterdam", "3165 AC", "NL"],
  ["Musterstrasse 12, 55122 Mainz, DE", "Musterstrasse 12", "Mainz", "55122", "DE"],
  ["Duisburg, DE", null, "Duisburg", null, "DE"],
  ["Kwiatowa 8, 02-123 Warszawa, PL", "Kwiatowa 8", "Warszawa", "02-123", "PL"],
] as const;
let passed = 0;
for (const [source, street, city, postalCode, country] of cases) {
  const parsed = parseAutoCreatedAddressText(source);
  assert.equal(parsed.street, street, source);
  assert.equal(parsed.city, city, source);
  assert.equal(parsed.postalCode, postalCode, source);
  assert.equal(parsed.country, country, source);
  passed++;
}
const base = parseAutoCreatedAddressText("A15 Depot — Columbusstraat 17, 3165 AC Rotterdam, NL");
const exact = { id: "existing-1", ...base };
assert.equal(findAddressDuplicates(base, [exact])[0]?.kind, "exact"); passed++;
assert.equal(findAddressDuplicates({...base, name: "Other Depot"}, [exact])[0]?.kind, "possible"); passed++;
assert.equal(findAddressDuplicates({...base, street: "Columbusstraat 18"}, [exact]).length, 0); passed++;
assert.equal(findAddressDuplicates({...base, country: "BE"}, [exact]).length, 0); passed++;
assert.equal(findAddressDuplicates({name: "RWG", street: null, city: "RWG", postalCode: null, country: "NL"}, [
  {id: "legacy", name: "RWG", street: "RWG", city: null, postalCode: null, country: "NL"},
])[0]?.kind, "possible"); passed++;
assert.equal(findAddressDuplicates(base, [{...exact, id: "first"}, {...exact, id: "second"}]).length, 2); passed++;
assert.throws(() => parseAutoCreatedAddressText("Musterstrasse 12, 55122 Mainz"), AutoAddressParsingError); passed++;
assert.throws(() => parseAutoCreatedAddressText("Columbusstraat 17, 3165 AC Rotterdam, DE"), AutoAddressParsingError); passed++;
assert.throws(() => parseAutoCreatedAddressText("Duisburg"), AutoAddressParsingError); passed++;
assert.throws(() => parseAutoCreatedAddressText("Antwerpen"), AutoAddressParsingError); passed++;
console.log(`Task 38.2: ${passed} address creation safeguards passed.`);
