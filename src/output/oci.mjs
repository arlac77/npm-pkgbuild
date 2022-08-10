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

function into(buffer, offset, string) {
  for (let i = 0; i < string.length; i++) {
    buffer[offset + i] = string.charCodeAt(i);
  }
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

    const meta = {
      schemaVersion: 2,
      mediaType: MEDIA_TYPE_MANIFEST,
      config: {
        mediaType: MEDIA_TYPE_CONFIG,
        size: 7023,
        digest:
          "sha256:b5b2b2c507a0944348e0303114d8d93aaaa081732b86451d9bce1f432a537bc7"
      },
      layers: [
        {
          mediaType: MEDI_TYPE_IMAGE_LAYER,
          size: 73109,
          digest:
            "sha256:ec4b8955958665577945c89419d1af06b5f7636b4ac3da7f12184802ad867736"
        }
      ],
      annotations: {
        description: properties.description,
        version: properties.version
      }
    };

    const out = createGzip();
    const hash = createHash("sha256");

    console.log(packageFile);

    const header = new Uint8Array(512);
    into(header, 257, "ustar");
    header[263] = 48; // 0;
    header[264] = 48; // 0;

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

      if (allign > 0) {
        out.write(new Uint8Array(allign));
      }
    }

    const filler = new Uint8Array(1024 * 8);
    out.end(filler);

    await pipeline(out, createWriteStream(packageFile));

    console.log(hash.digest("base64"));

    return packageFile;
  }
}
