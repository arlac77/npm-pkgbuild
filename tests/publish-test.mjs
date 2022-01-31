import test from "ava";
import { analysePublish } from "../src/publish.mjs";

test("analysePublish", t => {
  const publish = { url: "http://myserver.com/{{access}}/{{arch}}" };

  analysePublish(publish, { arch: "aarch64", access: "private" });

  t.is(publish.url, "http://myserver.com/private/aarch64");
});
