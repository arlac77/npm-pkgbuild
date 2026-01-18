import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, mkdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import {
  string_attribute,
  description_attribute,
  version_attribute_writable
} from "pacc";
import { StringContentEntry } from "content-entry";
import { publish } from "../publish.mjs";
import {
  filterOutUnwantedDependencies,
  extractFunctions,
  utf8StreamOptions
} from "../util.mjs";

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
  static attributes = {};

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

  get hookMapping() {
    return {};
  }

  async *hookContent() {
    const properties = this.properties;

    switch (typeof properties.hooks) {
      case "string":
        for await (const f of extractFunctions(
          createReadStream(properties.hooks, utf8StreamOptions)
        )) {
          const name = this.hookMapping[f.name] || f.name;
          if (name) {
            yield new StringContentEntry(
              name,
              undefined,
              f.body.replaceAll(
                /\{\{(\w+)\}\}/gm,
                (match, key, offset, string) =>
                  properties[key] || "{{" + key + "}}"
              )
            );
          }
        }
        break;

      case "object":
        for (const [name, content] of Object.entries(properties.hooks)) {
          yield new StringContentEntry(
            name,
            undefined,
            content.replaceAll(
              /\{\{(\w+)\}\}/gm,
              (match, key, offset, string) =>
                properties[key] || "{{" + key + "}}"
            )
          );
        }
    }
  }

  /**
   * forms an expression string form name and expression.
   * If tere is no valid exression name only is delivered.
   * @param {string} name 
   * @param {string|boolean|undefined} expression 
   * @returns {string}
   */
  dependencyExpression(name, expression) {
    return typeof expression === 'string' ? `${name}${expression}` : name;
  }

  makeDepends(dependencies) {
    if (!dependencies) {
      return [];
    }

    if (Array.isArray(dependencies)) {
      dependencies = Object.fromEntries(
        dependencies.map(d => {
          const m = d.match(/^([^=<>]+)(.*)/);
          return [m[1], m[2]];
        })
      );
    }
    return Object.entries(dependencies)
      .filter(filterOutUnwantedDependencies())
      .map(([name, expression]) => this.dependencyExpression(name, expression));
  }

  get fileNameExtension() {
    // @ts-ignore
    return this.constructor.fileNameExtension;
  }

  get attributes() {
    // @ts-ignore
    return this.constructor.attributes;
  }

  get properties() {
    const properties = this.#properties;

    for (const [name, field] of Object.entries(this.attributes)) {
      if (field.set) {
        if (properties[name] !== undefined) {
          properties[name] = field.set(properties[name]);
        } else if (
          field.alias !== undefined &&
          properties[field.alias] !== undefined
        ) {
          properties[field.alias] = field.set(properties[field.alias]);
        }
      }

      const e = properties[field.alias || name];

      if (e !== undefined) {
        properties[name] = field.set ? field.set(e) : e;
      } else {
        if (field.default !== undefined) {
          const vak = field.alias || name;
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
   * @param {string} [options.staging]
   * @param {string} [options.destination]
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
      staging: options.staging || tmpdir
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

export const pkgbuild_name_attribute = {
  ...string_attribute,
  alias: "name",
  mandatory: true,
  pattern: /^[a-z_][a-z0-9_\-]*$/i
};


export const dependency_type = {
  name: "dependency",
  primitive: false,
  toExternal: (value, attribute) => {

    console.log("TO EXTERN", value);
    switch(typeof value) {
      case 'string':
        return value;
      case 'undefined':
        return value;
    }

    if (value === undefined) {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value.join(attribute.separator);
    }

    return Object.entries(value)
      .map(([name, expression]) => typeof(expression)==='string' ? `${name}${expression}`:name).join(attribute.separator);
  }
};

export const dependency_attribute_collection_writable = {
  ...string_attribute,
  type: dependency_type,
  writable: true,
  collection: true,
  separator: " ",
  pattern: /^[a-z_][a-z0-9_\-]*$/i
};

export const pkgbuild_version_attribute = {
  ...version_attribute_writable,
  alias: "version",
  mandatory: true,
  set: v => v.replace("-semantic-release", "")
};

export const pkgbuild_description_attribute = {
  ...description_attribute,
  alias: "description",
  mandatory: true
};
