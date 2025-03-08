import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, mkdir } from "node:fs/promises";
import { publish } from "../publish.mjs";
import { filterOutUnwantedDependencies } from "../util.mjs";

/**
 * @typedef {import('../publish.mjs').PublishingDetail} PublishingDetail
 */

/**
 * @typedef {Object} Field
 * @property {string} alias interchangeable field name
 * @property {string} type
 * @property {any} default
 * @property {boolean} mandatory
 */

/**
 * Base Packager
 * @param {Object} properties
 */
export class Packager {
  static get fields() {
    return {};
  }

  /**
   * @return {{named:object,others:string[]}}
   */
  static get workspaceLayout() {
    return {
      named: {
        staging: ""
      },
      others: []
    };
  }

  /**
   * @param {Object} options
   * @param {Object} variant
   * @return {Promise<boolean>}
   */
  static async prepare(options, variant) {
    return false;
  }

  #properties;
  #prepared;

  /**
   * Base Packager
   * @param {Object} properties
   */
  constructor(properties) {
    this.#properties = { ...properties, type: this.constructor.name };
  }

  /**
   * What is the package name in the package eco-system.
   * @param {string} name
   * @return {string} package name in the target eco-system
   */
  packageName(name) {
    const mapping = {
      node: "nodejs"
    };
    return mapping[name] || name;
  }

  makeDepends(dependencies, exp=(name,expression)=>`${name}${expression}`) {
    if(!dependencies) {
      return [];
    }
    
    if(Array.isArray(dependencies)) {
      dependencies = Object.fromEntries(dependencies.map(d => {
        const m = d.match(/^([^=<>]+)(.*)/)
        return [m[1],m[2]];
      }));
    }
    return Object.entries(dependencies)
      .filter(filterOutUnwantedDependencies())
      .map(([name, expression]) => exp(name,expression)
      );
  }

  get fileNameExtension() {
    // @ts-ignore
    return this.constructor.fileNameExtension;
  }

  get fields() {
    // @ts-ignore
    return this.constructor.fields;
  }

  get properties() {
    const properties = this.#properties;

    for (const field of Object.values(this.fields)) {
      if (field.set) {
        if (properties[field.name] !== undefined) {
          properties[field.name] = field.set(properties[field.name]);
        } else if (properties[field.alias] !== undefined) {
          properties[field.alias] = field.set(properties[field.alias]);
        }
      }

      const e = properties[field.alias];

      if (e !== undefined) {
        properties[field.name] = field.set ? field.set(e) : e;
      } else {
        if (field.default !== undefined) {
          const vak = field.alias || field.name;
          if (
            (Array.isArray(properties[vak]) && properties[vak].length === 0) ||
            properties[vak] === undefined
          ) {
            properties[vak] = field.default;
          }
        }
      }
    }

    return properties;
  }

  /**
   * Create tmp directory.
   * @return {Promise<string>} directory path
   */
  get tmpdir() {
    return mkdtemp(join(tmpdir(), this.constructor.name));
  }

  /**
   * Prepares artifact generation.
   * @param {Object} options
   * @param {Object} [publishingDetail]
   * @returns {Promise<{properties:Object, destination:string, tmpdir:string, staging:string}>}
   */
  async prepare(options, publishingDetail) {
    if (this.#prepared) {
      return this.#prepared;
    }

    const tmpdir = await this.tmpdir;

    const out = {
      properties: this.properties,
      destination: options.destination || tmpdir,
      tmpdir,
      staging: tmpdir
    };

    // @ts-ignore
    const l = this.constructor.workspaceLayout;

    const mdo = { recursive: true };

    await Promise.all(l.others.map(d => mkdir(join(tmpdir, d), mdo)));

    for (const nd of Object.entries(l.named).map(([name, d]) => [
      name,
      join(tmpdir, d),
      mkdir(join(tmpdir, d), mdo)
    ])) {
      await nd[2];
      out[nd[0]] = nd[1];
    }

    if (publishingDetail) {
      out.destination =
        publishingDetail.scheme === "file:" ? publishingDetail.url : tmpdir;
      await mkdir(out.destination, mdo);
    }

    this.#prepared = out;
    return out;
  }

  /**
   * Execute package generation.
   * @param {Object} sources
   * @param {Object[]} transformer
   * @param {PublishingDetail[]} publishingDetails
   * @param {Object} options
   * @param {function(string):string?} expander
   * @return {Promise<string>} identifier of the resulting package
   */
  async create(sources, transformer, publishingDetails, options, expander) {
    throw new Error("not implemented");
  }

  async publish(artifact, publishingDetails, logger) {
    return publish(artifact, publishingDetails, this.properties, logger);
  }
}


export const VERSION_FIELD = {
  alias: "version",
  type: "string",
  mandatory: true,
  set: v => v.replace("-semantic-release", "")
};
