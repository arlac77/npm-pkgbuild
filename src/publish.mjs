import { basename } from "path";
import { createReadStream } from "fs";
import fetch from "node-fetch";

export async function publish(fileName, destination, properties) {

  if(!destination) {
    return;
  }

  destination = destination.replace(
    /\{\{(\w+)\}\}/m,
    (match, key, offset, string) => properties[key]
  );

  destination = destination + basename(fileName);

  console.log(destination);

  //  const m = destination.match(/^([^:]+):/);

  if (destination.startsWith("http://") || destination.startsWith("https://")) {
    const headers = {};

    if (properties.username) {
      headers.authorization =
        "Basic " +
        Buffer.from(properties.username + ":" + properties.password).toString(
          "base64"
        );

      console.log(headers.authorization);
    }

    const response = await fetch(destination, {
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
