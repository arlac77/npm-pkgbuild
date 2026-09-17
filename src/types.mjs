import {
  types,
  primitive_type,
  string_collection_attribute_writable,
  name_attribute,
  description_attribute,
  version_attribute_writable,
  string_attribute_writable
} from "pacc";

export const dependency_type = {
  ...primitive_type,
  name: "dependency",
  toExternal: (value, attribute) => {
    switch (typeof value) {
      case "string":
      case "undefined":
        return value;
    }

    if (Array.isArray(value)) {
      if (value.length === 0 && attribute.skipEmpty) {
        return undefined;
      }

      return value;
    }

    return Object.entries(value).map(([name, expression]) =>
      typeof expression === "string" ? `${name}${expression}` : name
    );
  }
};

export const architecture_type = {
  ...primitive_type,
  name: "architecture",

  toInternal: (value, attribute) => {
    return value;
  },

  toExternal: (value, attribute) => {
    return attribute.mapping?.[value] ?? value;
  }
};

export const arch_attribute_writable = {
  ...string_attribute_writable,
  name: "arch",
  default: "all",
  mandatory: true,
  type: architecture_type
};

export const pkgbuild_name_attribute = {
  ...name_attribute,
  mandatory: true,
  pattern: /^[a-z_][a-z0-9_\-]*$/i
};

export const dependency_attribute_collection_writable = {
  ...string_collection_attribute_writable,
  type: dependency_type,
  separator: undefined,
  pattern: /^[a-z_][a-z0-9_\-]*$/i
};

export const pkgbuild_version_attribute = {
  ...version_attribute_writable,
  mandatory: true,
  type: {
    ...types.string,
    toExternal: (value, attribute) => {
      return value.replace("-semantic-release", "");
    }
  }
};

export const pkgbuild_description_attribute = {
  ...description_attribute,
  mandatory: true
};
