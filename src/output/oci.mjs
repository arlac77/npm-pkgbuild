import { join } from "node:path";
import { createWriteStream } from "node:fs";
import { createGzip } from "node:zlib";
import { aggregateFifo } from "aggregate-async-iterator";
import { Packager } from "./packager.mjs";

function into(buffer, offset, string) {
  for (let i = 0; i < string.length; i++) {
    buffer[offset + i] = string.charCodeAt(i);
  }
}

function intoOctal(buffer, offset, length, number) {
  const string = "000000000000" + Math.floor(number).toString(8);

  length -= 1;
  let n = string.length - length;

  //console.log("octal", string, string.length, length, n);
  for (let i = 0; i < length; i++) {
    buffer[offset + i] = string.charCodeAt(i + n);
  }
}

function chksum(header) {
  let chksum = 0;
  for (let i = 0; i < header.length; i++) {
    if (i < 148 || i > 148 + 8) {
      chksum += header[i];
    }
  }

  return chksum;
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
    into(header, 257, "ustar");
    header[263] = 48 // 0;
    header[264] = 48 // 0;

    intoOctal(header, 108, 8, 0 /* root */);
    intoOctal(header, 116, 8, 3 /* sys */);

    into(header, 265, "root");
    into(header, 297, "sys");

    header[156] = 48; // 0

    for await (const entry of aggregateFifo(sources)) {
      //      const size = await entry.size;
      const buffer = await entry.buffer;
      const size = buffer.length;

      into(header, 0, entry.name);
      intoOctal(header, 100, 8, entry.mode);
      intoOctal(header, 124, 12, size);
      intoOctal(header, 136, 12, await entry.mtime);
      intoOctal(header, 148, 8, chksum(header));

      out.write(header);

      out.write(buffer);

      /*
      const stream = await entry.readStream;
      stream.pipe(out, { end: false });

      await new Promise((resolve, reject) => {
        stream.on("close", resolve);
        stream.on("error", reject);
      });*/

      const allign = 512 - (size % 512);

      //      console.log(entry.name, size, buffer.length,allign);

      if (allign > 0) {
        out.write(new Uint8Array(allign));
      }
    }

    const filler = new Uint8Array(1024*8);
    out.end(filler);

    return packageFile;
  }
}
