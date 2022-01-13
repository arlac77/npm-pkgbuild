import { join, dirname } from "path";
import { mkdir } from "fs/promises";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";

export const utf8StreamOptions = { encoding: "utf8" };

/**
 * Extract shell functions from a given text
 * @param {AsyncIterator<string>} source
 * @return {AsyncIterator<FunctionDecl>}
 */
export async function* extractFunctions(source) {
  let name;
  let body = [];

  for await (const line of asLines(source)) {
    let m;

    if ((m = line.match(/^\s*(function\s*)?([\w_]+)\s*\(\s*\)/))) {
      name = m[2];
      continue;
    }

    if (name) {
      if (line.match(/^}$/)) {
        yield { name, body: body.join("\n")};
        name = undefined;
        body.length = 0;
      }
      else {
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
    buffer = lines.pop();
    for (const line of lines) {
      yield line;
    }
  }

  if (buffer.length > 0) {
    yield buffer;
  }
}

export function quote(v) {
  if (v === undefined) return "";

  if (Array.isArray(v)) {
    return "(" + v.map(x => quote(x)).join(" ") + ")";
  }
  if (typeof v === "number" || v instanceof Number) return v;

  if (typeof v === "string" || v instanceof String)
    return v.match(/^\w+$/) ? v : "'" + v + "'";
}

export function asArray(o) {
  return Array.isArray(o) ? o : [o];
}

/**
 *
 * @param {Object} properties
 * @param {Object} fields
 * @returns {Function}
 */
export function fieldProvider(properties, fields) {
  function av(field, value) {
    return field.type.endsWith("]") ? asArray(value) : value;
  }

  return function* controlProperties(k, v, presentKeys) {
    if (k === undefined) {
      for (const [name, field] of Object.entries(fields)) {
        if (!presentKeys.has(name)) {
          const value = properties[field.alias || name];
          if (value === undefined) {
            if (field.default === undefined) {
              if (field.mandatory) {
                console.log(`Missing value for mandatory field ${name}`);
              }
            } else {
              yield [name, field.default];
            }
          } else {
            yield [name, av(field, value)];
          }
        }
      }
    } else {
      yield [k, av(fields[k], properties[k] || v)];
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
 * @param {AsyncIterator<ContentEntry>} source
 * @param {string} destinationDirectory
 * @param {Expander} expander
 * @param {ContentEntryAttribute[]} attributes
 */
export async function* copyEntries(
  source,
  destinationDirectory,
  expander = v => v
) {
  for await (const entry of source) {
    const name = expander(
      entry.destination === undefined
        ? entry.name
        : entry.destination.endsWith("/")
        ? join(entry.destination, entry.name)
        : entry.destination
    );

    entry.destination = name;
    const destination = join(destinationDirectory, name);
    await mkdir(dirname(destination), { recursive: true });

    const options = { mode: entry.mode };

    await pipeline(
      await entry.readStream,
      createWriteStream(destination, options)
    );

    yield entry;
  }
}
