import { join, dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createWriteStream } from "node:fs";
import { toExternal } from "pacc";
import { ContentEntry } from "content-entry";

/**
 * @type {BufferEncoding}
 */
export const utf8StreamOptions = "utf8";

export function filterOutUnwantedDependencies() {
  return ([name, version]) => version !== "-";
}

export function normalizeExpression(e) {
  if(typeof e === 'string') {
    e = e.replace(/\-([\w\d]+)$/, "");
    if (e.match(/^\d+/)) {
      return `>=${e}`;
    }
  }
  return e;
}

export function mergeDependencies(a, b) {
  if (!b) {
    return a;
  }
  if (!a) {
    return b;
  }

  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  const result = {};

  for (const key of keys) {
    if (a[key] !== "-" && b[key] !== "-") {
      result[key] = a[key] || b[key];
    }
  }

  return result;
}

/**
 * Decode a password
 * @param {string} password
 * @returns {string} plaintext password
 */
export function decodePassword(password) {
  const m = password.match(/\{([^\}]+)\}(.*)/);
  if (m) {
    switch (m[1]) {
      case "BASE64":
        return Buffer.from(m[2], "base64").toString("utf8");
      default:
        throw new Error(`Unknown algorithm ${m[1]}`);
    }
  }
  return password;
}

/**
 * @typedef {Object} FunctionDecl
 * @property {string} name
 * @property {string} body
 */

/**
 * Extract shell functions from a given text.
 * @param {AsyncIterable<string>} source
 * @return {AsyncIterable<FunctionDecl>}
 */
export async function* extractFunctions(source) {
  let name;
  let insideBody;
  const body = [];

  for await (const line of asLines(source)) {
    let m;

    if ((m = line.match(/^\s*(function\s*)?([\w_]+)\s*\(\s*\)\s*(\{)?/))) {
      name = m[2];
      insideBody = m[3] ? true : false;
      continue;
    }

    if (name) {
      if (line.match(/^\s*{\s*$/)) {
        if (insideBody) {
          body.push(line);
        } else {
          insideBody = true;
        }
      } else if (line.match(/^}$/)) {
        yield { name, body: body.join("\n") };
        name = undefined;
        body.length = 0;
      } else {
        body.push(line);
      }
    }
  }
}

async function* asLines(source) {
  let buffer = "";

  for await (let chunk of source) {
    buffer += chunk.toString();
    const lines = buffer.split(/\n\r?/);
    // @ts-ignore
    buffer = lines.length ? lines.pop() : "";
    for (const line of lines) {
      yield line;
    }
  }

  if (buffer.length > 0) {
    yield buffer;
  }
}

export function quote(v, qc = "'") {
  if (v === undefined) return "";

  if (Array.isArray(v)) {
    return "(" + v.map(x => quote(x, qc)).join(" ") + ")";
  }
  if (typeof v === "number" || v instanceof Number) return v;

  if (typeof v === "string" || v instanceof String)
    return v.match(/^\w+$/) ? v : qc + v + qc;
}

export function asArray(o) {
  return Array.isArray(o) ? o : o ? [o] : [];
}

/**
 *
 * @param {Object} properties
 * @param {Object} attributes
 * @returns {Function}
 */
export function fieldProvider(properties, attributes) {
  function av(attribute, value) {
    return attribute.collection ? asArray(value) : value;
  }

  return function* controlProperties(k, v, presentKeys) {
    if (k === undefined) {
      for (const [name, attribute] of Object.entries(attributes)) {
        if (!presentKeys.has(name)) {
          let value = properties[attribute.alias || name];
          if (value === undefined) {
            if (attribute.default === undefined) {
              if (attribute.mandatory) {
                console.error(`Missing value for mandatory attribute ${name}`);
              }
            } else {
              yield [name, toExternal(attribute.default, attribute)];
            }
          } else {
            if (attribute.mapping) {
              const mappedValue = attribute.mapping[value];
              if (mappedValue) {
                value = mappedValue;
              }
            }

            yield [name, av(attribute, toExternal(value, attribute))];
          }
        }
      }
    } else {
      const attribute = attributes[k];
      yield [k, av(attribute, toExternal(properties[k] || v, attribute))];
    }
  };
}

/**
 * @typedef {Function} Expander
 * @param {string} path
 * @return {string}
 */

/**
 * Copy content from source into destinationDirectory.
 * Destination paths a generated without leading '/' (as for entry names too).
 * @param {AsyncIterable<ContentEntry>} source
 * @param {string} destinationDirectory
 * @param {Expander} expander
 */
export async function* copyEntries(
  source,
  destinationDirectory,
  expander = v => v
) {
  for await (const entry of source) {
    if (entry) {
      // @ts-ignore
      const d = entry.destination;

      const name = expander(
        d === undefined
          ? entry.name
          : d.isCollection || d.endsWith("/")
          ? join(d, entry.name)
          : d
      ).replace(/^\//, "");

      // @ts-ignore
      entry.destination = name;
      const destination = join(destinationDirectory, name);

      if (entry.isCollection) {
        await mkdir(destination, { recursive: true, mode: await entry.mode });
      } else {
        await mkdir(dirname(destination), { recursive: true });

        await pipeline(
          Readable.fromWeb(await entry.stream),
          createWriteStream(
            destination,
            entry.mode ? { mode: await entry.mode } : undefined
          )
        );
      }

      yield entry;
    }
  }
}
