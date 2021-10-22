/**
 * Replaces key value pairs in a stream of lines.
 * @param {AsyncIterator<String>} source
 * @param updates
 */
export async function* keyValueTransformer(source, updates) {
  let key, value;

  function * eject() {
    if (key !== undefined) {
      const [k, v] = updates(key, value);
      if (k !== undefined) {
        yield`${k}: ${v}\n`;
      }
      key = value = undefined;
    }
  }

  for await (const line of asLines(source)) {
    const m = line.match(/^(\w+):\s*(.*)/);
    if (m) {
      yield *eject();
      key = m[1];
      value = m[2];
    } else if (key !== undefined) {
      const m = line.match(/^\s+(.*)/);
      if (m) {
        value += m[1];
      } else {
        yield * eject();
        yield line + "\n";
      }
    } else {
      yield line + "\n";
    }
  }

  yield *eject();
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
