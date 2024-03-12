import { basename } from "node:path";
import { createReadStream } from "node:fs";
import { mkdir, copyFile } from "node:fs/promises";
import { decodePassword } from "./util.mjs";

/**
 * @typedef {Object} PublishingDetail
 * @property {string} url
 * @property {Object} properties
 * @property {string} scheme
 * @property {string} [username]
 * @property {string} [password]
 */

/**
 * @param {string[]} locations
 * @param {Object} [properties]
 * @param {string} [properties.PKGBUILD_PUBLISH]
 * @param {string} [properties.arch]
 * @param {string} [properties.access]
 * @param {string} [properties.type]
 * @param {string} [properties.username]
 * @return {PublishingDetail[]}
 */
export function createPublishingDetails(locations = [], properties) {
  locations = [...locations];

  let publishPropertyFound = false;

  for (const s of ["type"]) {
    let key = properties?.[s];
    if (key !== undefined) {
      const envKey = `PKGBUILD_PUBLISH_${key.toUpperCase()}`;
      // @ts-ignore
      const e = properties[envKey];
      if (e) {
        locations.push(e);
        publishPropertyFound = true;
      }
    }
  }

  if (!publishPropertyFound) {
    const e = properties?.PKGBUILD_PUBLISH;
    if (e) {
      locations.push(e);
    }
  }

  const vm = k => properties?.[k] || k;

  return locations.map(location => {
    let url = location;

    const result = {
      set properties(p) {
        properties = p;
      },
      get url() {
        return url.replace(
          /\{\{(\w+)\}\}/gm,
          (match, key, offset, string) => properties?.[key] || "{{" + key + "}}"
        );
      }
    };

    let values = location.split(/,/);

    if (values.length > 1) {
      values = values.map(v => vm(v));
      url = values[0];
      result.username = values[1];
      result.password = decodePassword(vm(values[2]));
    }

    try {
      const l = new URL(location);
      const username = vm(l.username);
      if (username) {
        result.username = username;
        result.password = decodePassword(vm(l.password));
        l.username = "";
        l.password = "";
        url = l.href.replace(/%7B/g, "{").replace(/%7D/g, "}");
      }
    } catch {}

    if (result.username === undefined && properties?.username !== undefined) {
      result.username = properties.username;
    }

    const m = url.match(/^([^:]+:)\/\/(.*)/);
    result.scheme = m ? m[1] : "file:";

    return result;
  });
}

/**
 *
 * @param {string} artifactIdentifier
 * @param {PublishingDetail} [publishingDetail]
 * @param {Object} [properties]
 * @param {function(any):void} logger
 */
export async function publish(
  artifactIdentifier,
  publishingDetail,
  properties,
  logger = console.log
) {
  if (!publishingDetail) {
    return;
  }

  publishingDetail.properties = properties;

  const url = publishingDetail.url + "/" + basename(artifactIdentifier);

  logger(`Publishing to ${url}`);

  switch (publishingDetail.scheme) {
    case "file:":
      //console.log(typeof url, publishingDetail.url, url, artifactIdentifier);
      if (url.pathname !== artifactIdentifier) {
        await mkdir(publishingDetail.url, { recursive: true });
        await copyFile(artifactIdentifier, url);
      }
      break;
    case "http:":
    case "https:": {
      const headers = {
        "user-agent": properties["user-agent"] || "npm-pkgbuild"
      };

      if (publishingDetail.username) {
        headers.authorization =
          "Basic " +
          Buffer.from(
            publishingDetail.username + ":" + publishingDetail.password
          ).toString("base64");
      }

      const response = await fetch(url, {
        method: "PUT",
        headers,
        duplex: "half",
        body: createReadStream(artifactIdentifier)
      });

      if (!response.ok) {
        throw new Error(
          `Unable to publish to ${url}: ${response.statusText}(${response.status})`
        );
      }
    }
  }
}
