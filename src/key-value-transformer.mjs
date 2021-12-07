

/**
 * @typedef {Function} KeyValueUpdates
 * @param {string} key 
 * @param {string} value
 * @param {Set<string>} presentKeys
 */

/**
 * Replaces key value pairs in a stream of lines.
 * @param {AsyncIterator<String>} source
 * @param {KeyValueUpdates} updates
 */
export async function* keyValueTransformer(source, updates) {
  const presentKeys = new Set();

  let key, value;

  function* eject() {
    if (key !== undefined) {
      for (const [k, v] of updates(key, value, presentKeys)) {
        yield `${k}: ${v}\n`;
      }
      key = value = undefined;
    }
  }

  for await (const line of asLines(source)) {
    const m = line.match(/^(\w+):\s*(.*)/);
    if (m) {
      yield* eject();
      key = m[1];
      value = m[2];
      presentKeys.add(key);
    } else if (key !== undefined) {
      const m = line.match(/^\s+(.*)/);
      if (m) {
        value += m[1];
      } else {
        yield* eject();
        yield line + "\n";
      }
    } else {
      yield line + "\n";
    }
  }

  yield* eject();

  for (const [k, v] of updates(undefined, undefined, presentKeys)) {
    yield `${k}: ${v}\n`;
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
