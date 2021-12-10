import { join } from "path";
import { tmpdir } from "os";
import { mkdtemp } from "fs/promises";


/**
 * @typedef {Object} Field
 * @property {string} alias interchangeable field name
 * @property {string} type
 * @property {any} default
 * @property {boolean} mandatory 
 */
 
/**
 * @param {Object} properties
 */
export class Packager {
  static get fields() {
    return {};
  }

  constructor(properties) {
    this._properties = properties;
  }

  get fields() {
    return this.constructor.fields;
  }

  get properties() {
    const properties = this._properties;

    Object.entries(this.fields).forEach(([k, v]) => {
      const e = properties[v.alias];
      if (e !== undefined) {
        properties[k] = e;
      } else {
        if (v.default !== undefined) {
          properties[v.alias] = v.default;
        }
      }
    });

    return properties;
  }

  /**
   * @return {Set<string,Field>} mandatory fields
   */
  get mandatoryFields() {
    const mandatoryFields = new Set(
      Object.entries(this.fields)
        .filter(([k, v]) => v.mandatory)
        .map(([k, v]) => k)
    );

    return mandatoryFields;
  }

  /**
   * Create tmp directory.
   * @return {Promise<string>} directory path
   */
  get tmpdir()
  {
    return mkdtemp(join(tmpdir(), this.constructor.name));
  }

  /**
   * Execute package generation
   */
  async execute(sources,options) {}
}
