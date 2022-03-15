import test from "ava";
import { decodePassword } from "../src/util.mjs";

test("decodePassword", t => {
  t.is(decodePassword("ABC"), "ABC");
  t.is(decodePassword("{BASE64}aGFsbG8="), "hallo");
});
