import { join } from "node:path";
import { createWriteStream } from "node:fs";
import { createGzip } from "node:zlib";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { aggregateFifo } from "aggregate-async-iterator";
import { Packager } from "./packager.mjs";

const MEDIA_TYPE_MANIFEST = "application/vnd.oci.image.manifest.v1+json";
const MEDIA_TYPE_CONFIG = "application/vnd.oci.image.config.v1+json";
const MEDI_TYPE_IMAGE_LAYER = "application/vnd.oci.image.layer.v1.tar+gzip";

function into(buffer, offset, length, string) {
  let i = 0;

  for (; i < string.length; i++) {
    buffer[offset + i] = string.charCodeAt(i);
  }

  for (; i < length; i++) {
    buffer[offset + i] = 0;
  }
}

const ZEROS = "0000000000000000000";
const SEVENS = "7777777777777777777";

function encodeOctal(val, n) {
  val = val.toString(8);
  if (val.length > n) return SEVENS.slice(0, n) + " ";
  else return ZEROS.slice(0, n - val.length) + val + " ";
}

function intoOctal(buffer, offset, length, number) {
  const string = "000000000000" + Math.floor(number).toString(8);

  length -= 1;
  let n = string.length - length;

  for (let i = 0; i < length; i++) {
    buffer[offset + i] = string.charCodeAt(i + n);
  }
}

function chksum(header) {
  let chksum = 0;
  for (let i = 0; i < header.length; i++) {
    chksum += i < 148 || i >= 148 + 8 ? header[i] : 32;
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

  static prepare() {
    return true;
  }

  get packageFileName() {
    const p = this.properties;
    return `${p.name}-${p.version}${this.fileNameExtension}`;
  }

  async execute(
    sources,
    transformer,
    dependencies,
    options,
    expander = v => v
  ) {
    const { properties, destination } = await this.prepareExecute(options);
    const packageFile = join(destination, this.packageFileName);

    const meta = {
      schemaVersion: 2,
      mediaType: MEDIA_TYPE_MANIFEST,
      config: {
        mediaType: MEDIA_TYPE_CONFIG,
        size: 7023,
        digest:
          "sha256:b5b2b2c507a0944348e0303114d8d93aaaa081732b86451d9bce1f432a537bc7"
      },
      layers: [],
      annotations: {
        description: properties.description,
        version: properties.version
      }
    };

    const out = createGzip();

    const header = new Uint8Array(512);
    into(header, 257, 6, "ustar");
    header[263] = 32; // 48; // '0';
    header[264] = 32; // 48; // '0';

    intoOctal(header, 108, 8, 0 /* root */);
    intoOctal(header, 116, 8, 3 /* sys */);

    into(header, 265, 32, "root");
    into(header, 297, 32, "sys");

    header[156] = 48; // '0'

    let pos = 0;

    for await (const entry of aggregateFifo(sources)) {
      //      const size = await entry.size;
      const buffer = await entry.buffer;
      const size = buffer.length;

      const destination = entry.destination;

      const name = expander(
        destination === undefined
          ? entry.name
          : destination.endsWith("/")
          ? join(destination, entry.name)
          : destination
      ).replace(/^\//, "");

      into(header, 0, 100, name);
      intoOctal(header, 100, 8, entry.mode);
      into(header, 124, 12, encodeOctal(size, 12));
      into(header, 136, 12, encodeOctal((await entry.mtime).getTime() / 1000, 12));
     // into(header, 148, 8, encodeOctal(chksum(header), 8));
      intoOctal(header, 148, 8, chksum(header));

      console.log(pos, name, size);
      /*
      intoOctal(header, 124, 12, size);
      intoOctal(header, 136, 12, (await entry.mtime).getTime() / 1000);
      intoOctal(header, 148, 8, chksum(header));
*/

      out.write(header);
      out.write(buffer);

      pos += header.length + buffer.length;

      /*
      const stream = await entry.readStream;
      stream.pipe(out, { end: false });

      await new Promise((resolve, reject) => {
        stream.on("close", resolve);
        stream.on("error", reject);
      });*/

      const allign = 512 - (size & 511);      
      //const allign = 512 - (size % 512);

      if (allign > 0) {
        out.write(new Uint8Array(allign));
        pos += allign;
      }
    }

    const hash = createHash("sha256");
    let size = 0;
    out.on("data", chunk => {
      hash.update(chunk);
      size += chunk.length;
    });

    const filler = new Uint8Array(1024);
    out.end(filler);

    await pipeline(out, createWriteStream(packageFile));

    const layer = {
      mediaType: MEDI_TYPE_IMAGE_LAYER,
      size,
      digest: "sha256:" + hash.digest("hex")
    };

    console.log(layer);

    meta.layers.push(layer);

    console.log(packageFile);

    return packageFile;
  }
}
