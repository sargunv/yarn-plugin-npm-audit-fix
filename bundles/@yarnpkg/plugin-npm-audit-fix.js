/* eslint-disable */
//prettier-ignore
module.exports = {
name: "@yarnpkg/plugin-npm-audit-fix",
factory: function (require) {
var plugin = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined")
      return require.apply(this, arguments);
    throw new Error('Dynamic require of "' + x + '" is not supported');
  });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // sources/index.ts
  var sources_exports = {};
  __export(sources_exports, {
    default: () => sources_default
  });
  var import_cli = __require("@yarnpkg/cli");
  var import_clipanion = __require("clipanion");
  var t = __toESM(__require("typanion"));
  var STRATEGIES = [`TODO`];
  var NpmAuditFixCommand = class extends import_cli.BaseCommand {
    constructor() {
      super(...arguments);
      this.strategy = import_clipanion.Option.String(`--strategy`, `TODO`, {
        description: `Set which strategy to attempt to fix advisories`,
        validator: t.isEnum(STRATEGIES)
      });
    }
    execute() {
      return Promise.resolve(1);
    }
  };
  NpmAuditFixCommand.paths = [[`npm`, `audit`, `fix`]];
  var plugin = {
    commands: [NpmAuditFixCommand]
  };
  var sources_default = plugin;
  return __toCommonJS(sources_exports);
})();
return plugin;
}
};
