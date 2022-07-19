import { basename } from "node:path";
import { createReadStream } from "node:fs";
import fetch from "node-fetch";
import { decodePassword} from "./util.mjs";

export function analysePublish(publish, properties) {
  publish = Object.assign({}, publish);

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
      "user-agent": properties["user-agent"] || "npm-pkgbuild"
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


export function preparePublish(publish=[], env) {
  const e = env && env["PKGBUILD_PUBLISH"]
  if(e) {
    publish.push(e);
  }

  return publish.map(value => {
    let values = value.split(/,/);
    if (values.length > 1) {
      values = values.map(v => process.env[v] || v);
      return {
        url: values[0],
        user: values[1],
        password: decodePassword(values[2])
      };
    }

    return { url: value };
  });
}
