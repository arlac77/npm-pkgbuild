import test from "ava";
import { analysePublish, publish } from "../src/publish.mjs";

test("analysePublish", t => {
  const destination = { url: "http://myserver.com/{{access}}/{{arch}}" };

  analysePublish(destination, { arch: "aarch64", access: "private" });

  t.is(publish.url, "http://myserver.com/private/aarch64");
});

test("publish twice", async t => {
  const file = new URL("fixtures/content/file1.txt", import.meta.url).pathname;

  const properties = { arch: "aarch64", access: "private" };
  const destination = {
    url: "http://myserver.com/{{type}}/{{access}}/{{arch}}"
  };

  try {
    properties.type = "debian";
    await publish(file, destination, properties);
  } catch (e) {
    t.true(e.toString().indexOf("http://myserver.com/debian/private/aarch64/file1.txt") >= 0);
  }

  try {
    properties.type = "arch";
    await publish(file, destination, properties);
  } catch (e) {
    t.true(e.toString().indexOf("http://myserver.com/arch/private/aarch64/file1.txt") >= 0);
  }
});
