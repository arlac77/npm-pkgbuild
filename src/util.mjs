import { join, dirname } from "path";
import { mkdir } from "fs/promises";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { iterableStringInterceptor } from "iterable-string-interceptor";
import { ReadableStreamContentEntry } from "content-entry";

export const utf8StreamOptions = { encoding: "utf8" };

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

export function createModeTransformer(mode, match) {
  return {
    name: "mode",
    match,
    transform: async entry => Object.create(entry, { mode: { value: mode } })
  };
}

export function createPropertiesInterceptor(properties) {
  return async function* transformer(expression, remainder, source, cb) {
    const value = properties[expression];
    yield value === undefined ? "" : value;
  };
}

export function createExpressionTransformer(
  properties,
  match = entry =>
    entry.name.match(/\.(conf|json|html|txt|service|socket)$/) ? true : false
) {
  return {
    name: "expression",
    match,
    transform: async entry => {
      //console.log("TRANSFORM",entry.name);
      const ne = new ReadableStreamContentEntry(
        entry.name,
        iterableStringInterceptor(
          await entry.getReadStream(utf8StreamOptions),
          createPropertiesInterceptor(properties)
        )
      );
      ne.destination = entry.destination; // TODO all the other attributes ?
      return ne;
      //return Object.assign(entry,ne);
    }
  };
}

/**
 * Apply transformers.
 * @param {AsyncIterator<ContentEntry>} source
 * @param {Transformer[]} transformers
 * @param {Boolean]} onlyMatching filter out all none matching entries
 */
export async function* transform(source, transformers = [], onlyMatching) {
  const usedTransformers = new Set();

  for await (let entry of source) {
    let didMatch = false;
    for (const t of transformers) {
      //console.log(t.name,entry.name,t.match(entry));
      if (t.match(entry)) {
        didMatch = true;
        entry = await t.transform(entry);
        usedTransformers.add(t);
      }
    }

    if ((onlyMatching && didMatch) || !onlyMatching) {
      yield entry;
    }
  }

  for (const t of transformers) {
    if (!usedTransformers.has(t) && t.createEntryWhenMissing !== undefined) {
      yield t.transform(await t.createEntryWhenMissing());
    }
  }
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
