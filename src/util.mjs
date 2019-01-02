import { iterableStringInterceptor } from "iterable-string-interceptor";
import { createReadStream, createWriteStream } from "fs";
import { join } from "path";

export const utf8StreamOptions = { encoding: "utf8" };

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

export async function copyTemplate(context, source, dest) {
  async function* expressionEval(expression, remainder, cb, leadIn, leadOut) {
    const replace = context.evaluate(expression);
    if (replace === undefined) {
      yield leadIn + expression + leadOut;
    } else {
      yield replace;
    }
  }

  console.log(`cp ${source} ${dest}`);

  const out = createWriteStream(dest, utf8StreamOptions);

  for await (const chunk of iterableStringInterceptor(
    createReadStream(source, utf8StreamOptions),
    expressionEval
  )) {
    out.write(chunk);
  }

  return new Promise((resolve, reject) => {
    out.end();
    out.on("finish", () => resolve());
  });
}
