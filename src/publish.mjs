import { basename } from "path";
import { createReadStream } from "fs";
import fetch from "node-fetch";

export function analysePublish(publish, properties) {
  publish = publish.replace(
    /\{\{(\w+)\}\}/m,
    (match, key, offset, string) => properties[key]
  );

  const m = publish.match(/^([\w_\+]+:)\/\/(.*)/);
  const scheme = m ? m[0] : "file:";

  return { publish, scheme };
}

export async function publish(fileName, destination, properties) {
  if (!destination) {
    return;
  }

  let { publish, scheme } = analysePublish(destination, properties);

  publish = publish + "/" + basename(fileName);

  console.log(publish);

  if (scheme === "http:" || scheme === "https:") {
    const headers = {};

    if (properties.username) {
      headers.authorization =
        "Basic " +
        Buffer.from(properties.username + ":" + properties.password).toString(
          "base64"
        );
    }

    const response = await fetch(publish, {
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
