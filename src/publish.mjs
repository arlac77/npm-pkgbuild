import { basename } from "path";
import { createReadStream } from "fs";
import fetch from "node-fetch";

export function analysePublish(publish, properties) {
  publish.url = publish.url.replace(
    /\{\{(\w+)\}\}/gm,
    (match, key, offset, string) => properties[key] || "{{" + key + "}}"
  );

  const m = publish.url.match(/^([^:]+:)\/\/(.*)/);

  publish.scheme = m ? m[1] : "file:";

  return publish;
}

export async function publish(fileName, destination, properties) {
  if (!destination) {
    return;
  }

  const publish = analysePublish(destination, properties);

  const url = publish.url + "/" + basename(fileName);

  console.log(`Publishing to ${url}`);

  if (publish.scheme === "http:" || publish.scheme === "https:") {
    const headers = {
      "user-agent": "npm-pkgbuild"
    };

    if (publish.user) {
      headers.authorization =
        "Basic " +
        Buffer.from(publish.user + ":" + publish.password).toString("base64");
    }

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: createReadStream(fileName)
    });

    if (!response.ok) {
      throw new Error(
        `Unable to publish to ${url}: ${response.statusText}(${response.statusCode})`
      );
    }
  }

  /*
    console.log(`#<CI>publish ${fileName}`);
    */
}
