export class Packager {
  static get fields() {
    return {};
  }

  constructor(source, properties) {
    this.source = source;
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

  get mandatoryProperties() {
    const mandatoryProperties = new Set(
      Object.entries(this.fields)
        .filter(([k, v]) => v.mandatory)
        .map(([k, v]) => k)
    );

    return mandatoryProperties;
  }

  async execute() {}
}
