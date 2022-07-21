import { basename } from "node:path";
import { createReadStream } from "node:fs";
import fetch from "node-fetch";
import { decodePassword } from "./util.mjs";

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

    if (publish.username) {
      headers.authorization =
        "Basic " +
        Buffer.from(publish.username + ":" + publish.password).toString(
          "base64"
        );
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

export function preparePublish(publish = [], env = {}) {
  function vm(k) {
    return env[k] || k;
  }

  const e = env["PKGBUILD_PUBLISH"];
  if (e) {
    publish.push(e);
  }

  return publish.map(value => {
    let values = value.split(/,/);
    if (values.length > 1) {
      values = values.map(v => vm(v));
      return {
        url: values[0],
        user: vm(values[1]),
        password: decodePassword(vm(values[2]))
      };
    }

    try {
      const url = new URL(value);
      let password = decodePassword(vm(url.password));
      let username = vm(url.username);
      url.username = "";
      url.password = "";

      return {
        url: url.href.replace(/%7B/g,'{').replace(/%7D/g,'}'),
        ...(username.length ? { username, password } : {})
      };
    } catch {
      return { url: value };
    }
  });
}
