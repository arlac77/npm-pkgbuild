/**
 * Replaces key value pairs in a stream of lines.
 * @param source
 * @param updates
 */
export async function* keyValueTransformer(source, updates) {
  for await (let line of asLines(source)) {
    const m = line.match(/^(\w+):\s+(.*)/);
    if (m) {
      const [k, v] = updates(m[1], m[2]);
      line = `${k}: ${v}`;
    }

    yield line + "\n";
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
