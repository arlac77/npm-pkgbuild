
/**
 * Replaces key value pairs in a stream of lines.
 * @param source 
 * @param updates 
 */
export async function* keyValueTransformer(source, updates) {
  let buffer;

  for await (let chunk of source) {
    let li = 0;

    if (buffer !== undefined) {
      chunk = buffer + chunk;
      buffer = undefined;
    }

    function match() {
        const m = chunk.match(/^(\w+):\s+(.*)/);
        if(m) {
            const [k,v] = updates(m[1],m[2]);
            return `${k}: ${v}`;
        }
        return chunk;
    }

    const i = chunk.indexOf('\n',li);

    if(i >= 0) {
        const replace = match();
        chunk = replace + chunk.slice(li, i + 1);
    }
  }
}
