import { basename } from "path";
import { createReadStream } from "fs";
import fetch from "node-fetch";

export function analysePublish(publish, properties) {
  publish.url = publish.url.replace(
    /\{\{(\w+)\}\}/m,
    (match, key, offset, string) => properties[key] || '{{' + key + '}}'
  );

  const m = publish.url.match(/^([\w_\+]+:)\/\/(.*)/);

  publish.scheme = m ? m[1] : "file:";

  return publish;
}

export async function publish(fileName, destination, properties) {
  if (!destination) {
    return;
  }

  const publish = analysePublish(destination, properties);

  publish.url = publish.url + "/" + basename(fileName);

  console.log(publish.url);

  if (publish.scheme === "http:" || publish.scheme === "https:") {
    const headers = {};

    if (publish.username) {
      headers.authorization =
        "Basic " +
        Buffer.from(publish.username + ":" + publish.password).toString(
          "base64"
        );
    }

    const response = await fetch(publish.url, {
      method: "PUT",
      headers,
      body: createReadStream(fileName)
    });

    console.log(response);

    return;
  }

  /*
    console.log(`#<CI>publish ${fileName}`);
    */
}
