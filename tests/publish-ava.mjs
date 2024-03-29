import test from "ava";
import { createPublishingDetails, publish } from "../src/publish.mjs";

const DESTINATION =
  process.env["PKGBUILD_PUBLISH"] || "http://myserver.com/{{access}}/{{arch}}";

test("createPublishingDetails", t => {
  const properties = {
    arch: "aarch64",
    access: "private"
  };

  const pds = createPublishingDetails(
    ["http://myserver.com/{{access}}/{{arch}}"],
    properties
  );

  t.is(pds[0].url, "http://myserver.com/private/aarch64");

  properties.arch = "x86_64";
  t.is(pds[0].url, "http://myserver.com/private/x86_64");
});

test("createPublishingDetails env type", t => {
  const properties = {
    PKGBUILD_PUBLISH_DEBIAN: "https://myUser@debian.org",
    type: "debian"
  };

  const pds = createPublishingDetails(undefined, properties);

  t.is(pds[0].url, "https://debian.org/");
  t.is(pds[0].username, "myUser");
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
  const [destination] = createPublishingDetails([DESTINATION], properties);

  let url = "";

  properties.type = "debian";
  try {
    url = "not set";
    await publish(file, destination, properties, message => {
      url = message;
    });
  } catch (e) {
    console.log(e);
  }
  t.log(url);
  t.truthy(url.match(/\/debian\/.*\/aarch64\/file1.txt/));

  properties.type = "arch";
  try {
    url = "not set again";
    await publish(file, destination, properties, message => {
      url = message;
    });
  } catch (e) {
    console.log(e);
  }
  t.log(url);
  t.truthy(url.match(/\/arch\/.*\/aarch64\/file1.txt/));
});

test("createPublishingDetails path only", t => {
  t.deepEqual(createPublishingDetails(["/path/to"]), [
    { url: "/path/to", scheme: "file:", properties: undefined }
  ]);
});

test("createPublishingDetails simple", t => {
  t.deepEqual(createPublishingDetails(["http://somewhere.com/"]), [
    { url: "http://somewhere.com/", scheme: "http:", properties: undefined }
  ]);
});

test("createPublishingDetails simple placeholders", t => {
  t.deepEqual(createPublishingDetails(["http://somewhere.com/{{type}}"]), [
    {
      url: "http://somewhere.com/{{type}}",
      scheme: "http:",
      properties: undefined
    }
  ]);
});

test("createPublishingDetails with url credentials", t => {
  t.deepEqual(
    createPublishingDetails(["http://USER:PASSWORD@somewhere.com/"], {
      USER: "myUser",
      PASSWORD: "{BASE64}bXlQYXNzd29yZA=="
    }),
    [
      {
        scheme: "http:",
        username: "myUser",
        password: "myPassword",
        url: "http://somewhere.com/",
        properties: undefined
      }
    ]
  );
});
