import test from "ava";
import { analysePublish, publish, preparePublish } from "../src/publish.mjs";

test("analysePublish", t => {
  const destination = { url: "http://myserver.com/{{access}}/{{arch}}" };

  const publish = analysePublish(destination, {
    arch: "aarch64",
    access: "private"
  });

  t.is(publish.url, "http://myserver.com/private/aarch64");
});

test("publish nowhere", async t => {
  await publish(
    new URL("fixtures/content/file1.txt", import.meta.url).pathname
  );
  t.true(true, "does not fail");
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
    t.true(
      e
        .toString()
        .indexOf("http://myserver.com/debian/private/aarch64/file1.txt") >= 0
    );
  }

  try {
    properties.type = "arch";
    await publish(file, destination, properties);
  } catch (e) {
    t.true(
      e
        .toString()
        .indexOf("http://myserver.com/arch/private/aarch64/file1.txt") >= 0
    );
  }
});

test("preparePublish path only", t => {
  t.deepEqual(preparePublish(["/path/to"]), [
    { url: "/path/to" }
  ]);
});

test("preparePublish simple", t => {
  t.deepEqual(preparePublish(["http://somewhere.com/"]), [
    { url: "http://somewhere.com/" }
  ]);
});

test("preparePublish simple placeholders", t => {
  t.deepEqual(preparePublish(["http://somewhere.com/{{type}}"]), [
    { url: "http://somewhere.com/{{type}}" }
  ]);
});

test("preparePublish with url credentials", t => {
  t.deepEqual(
    preparePublish(["http://USER:PASSWORD@somewhere.com/"], {
      USER: "myUser",
      PASSWORD: "{BASE64}bXlQYXNzd29yZA=="
    }),
    [{ username: "myUser", password: "myPassword", url: "http://somewhere.com/" }]
  );
});
