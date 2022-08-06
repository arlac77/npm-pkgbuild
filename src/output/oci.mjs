import { join } from "node:path";
import { createWriteStream } from "node:fs";
import { createGzip } from 'node:zlib';
import { aggregateFifo } from "aggregate-async-iterator";
import { Packager } from "./packager.mjs";

function into(buffer, string) {
  for (let i = 0; i < string.length; i++) {
    buffer[i] = string.charCodeAt(i);
  }
}

function intoOctal(buffer,number)
{
  const string = Math.floor(number).toString(8);

  for (let i = 0; i < string.length; i++) {
    buffer[i] = string.charCodeAt(i);
  }
}

export class OCI extends Packager {
  static get name() {
    return "oci";
  }

  static get description() {
    return "generate OCI container image";
  }

  static get fileNameExtension() {
    return ".oci.tar.gz";
  }

  static available() {
    return true;
  }

  get packageFileName() {
    const p = this.properties;
    return `${p.name}-${p.version}${this.fileNameExtension}`;
  }

  async execute(sources, transformer, dependencies, options, expander) {
    const { properties, destination } = await this.prepareExecute(options);

    const packageFile = join(destination, this.packageFileName);

    const out = createGzip();
    
    out.pipe(createWriteStream(packageFile));

    console.log(packageFile);

    const header = new Uint8Array(512);
    const ustarField = new Uint8Array(header, 256, 8);
    const sizeField = new Uint8Array(header, 124, 12);
    into(ustarField, "ustar\x0000");
    header[156] = '0'.charCodeAt(0);

    for await (const entry of aggregateFifo(sources)) {
      const size = await entry.size;
      const stream = await entry.readStream;

      console.log(entry.name, size);

      into(header, entry.name);
      intoOctal(sizeField, size);
      out.write(header);

      stream.pipe(out, { end: false });

      await new Promise((resolve, reject) => {
        stream.on("close", resolve);
        stream.on("error", err => reject(err));
      });
    }

    out.close();

    return packageFile;
  }
}
