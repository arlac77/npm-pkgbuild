import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { execa } from "execa";
import { string_attribute } from "pacc";
import { ContentEntry, IteratorContentEntry } from "content-entry";
import { transform } from "content-entry-transform";
import { aggregateFifo } from "aggregate-async-iterator";
import {
  keyValueTransformer,
  equalSeparatedKeyValuePairOptions,
  Uint8ArraysToLines
} from "key-value-transformer";
import {
  Packager,
  pkgbuild_version_attribute,
  pkgbuild_description_attribute,
  pkgbuild_name_attribute
} from "./packager.mjs";
import {
  fieldProvider,
  copyEntries,
  utf8StreamOptions,
  quote,
  filterOutUnwantedDependencies
} from "../util.mjs";

const DOCKERFILE = "Dockerfile";

function* keyValueLines(key, value, options) {
  if (Array.isArray(value)) {
    value = value.join(".");
  }
  yield `LABEL ${quote(key, '"')}=${quote(value, '"')}${options.lineEnding}`;
}

const labelKeyValuePairs = {
  ...equalSeparatedKeyValuePairOptions,
  keyValueLines
};

const dependenciesToFrom = {
  node: "node",
  "nginx-mainline": "nginx",
  nginx: "nginx"
};

/**
 * docker image build
 */
export class DOCKER extends Packager {
  static get name() {
    return "docker";
  }

  static get description() {
    return `generate container image with ${this.name}`;
  }

  /**
   * @see {@link https://docs.docker.com/engine/reference/builder/}
   */
  static attributes = {
    name: {
      ...pkgbuild_name_attribute,
      set: value => value.toLowerCase()
    },
    version: pkgbuild_version_attribute,
    description: pkgbuild_description_attribute,
    author: { ...string_attribute, alias: "maintainer" },
    workdir: { ...string_attribute, default: "/", mandatory: true }
  };

  /**
   * Check for docker presence.
   * @param {Object} options
   * @param {Object} variant
   * @param {string} variant.arch
   * @returns {Promise<boolean>} true when docker executable is present
   */
  static async prepare(options, variant) {
    try {
      await execa(this.name, ["--version"]);
      return true;
    } catch {}

    return false;
  }

  async create(sources, transformer, options, publishingDetails, expander) {
    const { properties, staging } = await this.prepare(
      options,
      publishingDetails
    );

    async function* headLines() {
      let scratch = true;
      for (const [k, v] of Object.entries({
        ...properties.from,
        ...Object.fromEntries(
          Object.entries(properties.dependencies)
            .filter(filterOutUnwantedDependencies())
            .filter(([k, v]) => dependenciesToFrom[k])
            .map(([k, v]) => [dependenciesToFrom[k], v.replace(/[>=]*/, "")])
        )
      })) {
        scratch = false;
        yield `FROM ${k}:${v}\n`;
      }

      if (scratch) {
        yield "FROM scratch\n";
      }
    }

    async function* trailingLines() {
      yield `WORKDIR ${expander(properties.workdir)}\n`;
      yield "COPY . .\n";
      if (properties.entrypoints) {
        yield `ENTRYPOINT ["node", "${
          Object.values(properties.entrypoints)[0]
        }"]\n`;
      }
    }

    const fp = fieldProvider(properties, this.attributes);

    transformer.push({
      name: DOCKERFILE,
      match: entry => entry.name === DOCKERFILE,
      transform: async entry =>
        new IteratorContentEntry(
          entry.name,
          undefined,
          keyValueTransformer(Uint8ArraysToLines(await entry.stream), fp, {
            ...labelKeyValuePairs,
            headLines,
            trailingLines
          })
        ),
      createEntryWhenMissing: () => new ContentEntry(DOCKERFILE)
    });

    for await (const file of copyEntries(
      transform(
        aggregateFifo((await Array.fromAsync(sources)).flat()),
        transformer
      ),
      staging,
      expander
    )) {
      if (options.verbose) {
        // @ts-ignore
        console.log(file.destination);
      }
    }

    if (options.verbose) {
      console.log(await readFile(join(staging, DOCKERFILE), utf8StreamOptions));
    }

    let tag = `${properties.name}:${properties.version}`;
    let image = "";

    if (!options.dry) {
      const docker = await execa(
        this.constructor.name,
        [
          "buildx",
          "build",
          "--tag",
          tag,
          /*"--output","type=tar,dest=out.tar",*/ staging
        ],
        {
          cwd: staging
        }
      );

      const lines = docker.stderr.split(/\n/);
      const wl = lines.filter(l => l.match(/writing\s+image/));
      if (wl?.[0]) {
        image = wl[0].split(/\s+/)[3];
      }

      if (options.verbose) {
        console.log(docker.stderr);
        console.log(docker.stdout);
      }
    }

    return image;
  }

  async publish(artifact, publishingDetails, logger = console.log) {
    try {
      const url = new URL(publishingDetails.url);
      const repoLocation = `${url.host}/${publishingDetails.username}`;
      const name = `${this.properties.name}:${this.properties.version}`;

      logger(`Publishing to ${repoLocation}`);

      let p1 = await execa(this.constructor.name, [
        "tag",
        artifact,
        `${repoLocation}/${name}`
      ]);
      let p2 = await execa(this.constructor.name, [
        "push",
        `${repoLocation}/${name}`
      ]);

      //console.log(`docker tag ${artifact} ${repoLocation}/${name}`);
      //console.log(`docker push ${repoLocation}/${name}`);
    } catch (e) {
      console.log(e, publishingDetails.url);
    }
  }
}
