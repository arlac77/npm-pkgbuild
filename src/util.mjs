import fs, { createReadStream, createWriteStream, constants } from "fs";
import { join, dirname } from "path";
import globby from "globby";
import packlist from "npm-packlist";

import { iterableStringInterceptor } from "iterable-string-interceptor";

export const utf8StreamOptions = { encoding: "utf8" };

const { mkdir, copyFile } = fs.promises;

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

export async function* copyFiles(source, dest, pattern) {
  for await (const name of globby.stream(asArray(pattern), {
    cwd: source
  })) {
    const d = join(dest, name);
    await mkdir(dirname(d), { recursive: true });
    await copyFile(join(source, name), d, constants.COPYFILE_FICLONE);
    yield d;
  }
}

export async function* npmPack(context, source, dest) {
  const files = await packlist({ path: source });

  for (const file of files) {
    yield file;
  }
}

export async function copyTemplate(context, source, dest) {
  async function* expressionEval(
    expression,
    chunk,
    source,
    cb,
    leadIn,
    leadOut
  ) {
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
