import assert from "node:assert/strict";
import {
  comparePtvAddress,
  selectPtvGeocodingLocation,
  type AddressForGeocoding,
  type PtvGeocodedLocation,
} from "../src/lib/addresses/ptvAddressValidation";

const saved: AddressForGeocoding = {
  name: "A15 Depot",
  street: "Columbusstraat 17",
  city: "Rotterdam",
  postalCode: "3165 AC",
  country: "NL",
};
const matching: PtvGeocodedLocation = {
  formattedAddress: "Columbusstraat 17, 3165 AC Rotterdam, Netherlands",
  roadAccessPosition: { latitude: 51.92, longitude: 4.22 },
  address: {
    countryCode: "NLD",
    city: "Rotterdam",
    postalCode: "3165AC",
    street: "Columbusstraat",
    houseNumber: "17",
  },
};
const wrongPostal: PtvGeocodedLocation = {
  ...matching,
  address: { ...matching.address, postalCode: "6413 TM", city: "Heerlen" },
};

assert.deepEqual(comparePtvAddress(saved, matching.address), []);
assert.equal(selectPtvGeocodingLocation(saved, [matching]).kind, "match");
assert.equal(selectPtvGeocodingLocation(saved, [wrongPostal]).kind, "error");
assert.equal(selectPtvGeocodingLocation(saved, [wrongPostal, matching]).kind, "match");

const mismatch = selectPtvGeocodingLocation(saved, [wrongPostal]);
assert.equal(mismatch.kind, "error");
if (mismatch.kind === "error") {
  assert.equal(mismatch.status, 409);
  assert.match(mismatch.message, /Postal code mismatch/);
  assert.match(mismatch.message, /No coordinates were saved/);
}

assert.ok(comparePtvAddress(saved, { ...matching.address, countryCode: "DEU" }).some(x => x.startsWith("Country")));
assert.ok(comparePtvAddress(saved, { ...matching.address, street: "Different street" }).some(x => x.startsWith("Street")));
assert.ok(comparePtvAddress(saved, { ...matching.address, houseNumber: "19" }).some(x => x.startsWith("House")));
assert.ok(comparePtvAddress(saved, { ...matching.address, city: "Utrecht" }).some(x => x.startsWith("City")));
assert.ok(comparePtvAddress(saved, undefined).length > 0);
assert.deepEqual(comparePtvAddress(saved, { ...matching.address, countryCode: undefined, countryName: "The Netherlands" }), []);
assert.deepEqual(comparePtvAddress({ ...saved, city: "Maasvlakte Rotterdam" }, matching.address), []);
assert.equal(selectPtvGeocodingLocation({ ...saved, postalCode: null, street: null }, [matching]).kind, "error");
assert.equal(selectPtvGeocodingLocation(saved, [{ ...matching, roadAccessPosition: { latitude: 100, longitude: 4 } }]).kind, "error");
assert.equal(selectPtvGeocodingLocation(saved, []).kind, "error");

console.log("Task 38.1: 15 PTV geocoding safeguards passed.");
