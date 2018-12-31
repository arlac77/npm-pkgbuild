import { iterableStringInterceptor } from "iterable-string-interceptor";
import { createReadStream, createWriteStream } from "fs";

export function quote(v) {
  if (v === undefined) return "";

  if (Array.isArray(v)) {
    return "(" + v.map(x => quote(x)).join(" ") + ")";
  }
  if (typeof v === "number" || v instanceof Number) return v;

  return v.match(/^\w+$/) ? v : "'" + v + "'";
}

export function asArray(o) {
  return Array.isArray(o) ? o : [o];
}

export async function copyTemplate(source, dest, properties) {
  const streamOptions = { encoding: "utf8" };

  async function* expressionEval(expression, remainder, cb, leadIn, leadOut) {
    const replace = properties[expression];
    if (replace == undefined) {
      console.log(`not found ${expression}`);
      yield leadIn + expression + leadOut;
    } else {
      yield replace;
    }
  }

  console.log(`cp ${source} ${dest}`);

  const out = createWriteStream(dest, streamOptions);

  for await (const chunk of iterableStringInterceptor(
    createReadStream(source, streamOptions),
    expressionEval
  )) {
    out.write(chunk);
  }
  out.end();
}
