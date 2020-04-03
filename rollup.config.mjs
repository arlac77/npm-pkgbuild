import builtins from "builtin-modules";

import cleanup from "rollup-plugin-cleanup";

import executable from "rollup-plugin-executable";
import commonjs from "@rollup/plugin-commonjs";

import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import { readFileSync } from "fs";