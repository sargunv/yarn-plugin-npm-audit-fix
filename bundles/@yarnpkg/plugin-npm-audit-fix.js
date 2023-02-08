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
  var import_stream = __require("stream");
  var import_cli = __require("@yarnpkg/cli");
  var import_core = __require("@yarnpkg/core");
  var t = __toESM(__require("typanion"));
  var isAuditResult = t.isObject(
    {
      advisories: t.isDict(
        t.isObject(
          {
            module_name: t.isString(),
            vulnerable_versions: t.isString(),
            patched_versions: t.isString()
          },
          { extra: t.isDict(t.isUnknown()) }
        )
      )
    },
    { extra: t.isDict(t.isUnknown()) }
  );
  var NpmAuditFixCommand = class extends import_cli.BaseCommand {
    async execute() {
      const state = await this.initState();
      const { configuration, project, cache } = state;
      const report = await import_core.StreamReport.start(
        {
          configuration,
          stdout: this.context.stdout
        },
        async (report2) => {
          const advisories = await report2.startTimerPromise(
            `Audit step`,
            () => this.getAdvisories()
          );
          for (const advisory of advisories) {
            const fmtName = import_core.structUtils.prettyIdent(
              configuration,
              import_core.structUtils.parseIdent(advisory.module_name)
            );
            const fmtVulnRange = import_core.structUtils.prettyRange(
              configuration,
              advisory.vulnerable_versions
            );
            const fmtPatchRange = import_core.structUtils.prettyRange(
              configuration,
              advisory.patched_versions
            );
            await report2.startTimerPromise(
              `Advisory for ${fmtName} at ${fmtVulnRange}, patched at ${fmtPatchRange}`,
              () => this.handleAdvisory(report2, state, advisory)
            );
          }
          await project.install({
            report: report2,
            cache,
            mode: import_core.InstallMode.UpdateLockfile
          });
        }
      );
      return report.exitCode();
    }
    async handleAdvisory(report, state, advisory) {
      const { configuration, resolver, project } = state;
      const ident = import_core.structUtils.parseIdent(advisory.module_name);
      const resolutionsToDelete = /* @__PURE__ */ new Set();
      const locatorsToDelete = /* @__PURE__ */ new Set();
      for (const descriptor of project.storedDescriptors.values()) {
        if (!import_core.structUtils.areIdentsEqual(descriptor, ident)) {
          continue;
        }
        const locator = project.storedPackages.get(
          project.storedResolutions.get(descriptor.descriptorHash)
        );
        if (!import_core.semverUtils.satisfiesWithPrereleases(
          locator.version,
          advisory.vulnerable_versions
        )) {
          continue;
        }
        report.reportInfo(
          import_core.MessageName.UNNAMED,
          `Found vulnerable ${import_core.structUtils.prettyLocator(
            configuration,
            locator
          )} (via ${import_core.structUtils.prettyRange(configuration, descriptor.range)})`
        );
        const candidates = await resolver.getCandidates(descriptor, /* @__PURE__ */ new Map(), {
          project,
          report,
          resolver
        });
        const preferred = candidates[0];
        if (!preferred) {
          report.reportError(
            import_core.MessageName.UNNAMED,
            `No candidates found for ${import_core.structUtils.prettyDescriptor(
              configuration,
              descriptor
            )}`
          );
          continue;
        }
        const pkg = await resolver.resolve(preferred, {
          project,
          report,
          resolver
        });
        if (!import_core.semverUtils.satisfiesWithPrereleases(
          pkg.version,
          advisory.patched_versions
        )) {
          report.reportWarning(
            import_core.MessageName.UNNAMED,
            `No compatible patched version found for ${import_core.structUtils.prettyDescriptor(
              configuration,
              descriptor
            )}`
          );
          continue;
        }
        report.reportInfo(
          import_core.MessageName.UNNAMED,
          `Attempting to upgrade ${import_core.structUtils.prettyDescriptor(
            configuration,
            descriptor
          )} to ${import_core.structUtils.prettyLocator(configuration, pkg)}`
        );
        resolutionsToDelete.add(descriptor.descriptorHash);
        locatorsToDelete.add(locator.locatorHash);
      }
      resolutionsToDelete.forEach(
        (descriptorHash) => void project.storedResolutions.delete(descriptorHash)
      );
      locatorsToDelete.forEach(
        (locatorHash) => void project.storedPackages.delete(locatorHash)
      );
    }
    async initState() {
      const configuration = await import_core.Configuration.find(
        this.context.cwd,
        this.context.plugins
      );
      const { project, workspace } = await import_core.Project.find(
        configuration,
        this.context.cwd
      );
      const cache = await import_core.Cache.find(configuration);
      if (!workspace)
        throw new import_cli.WorkspaceRequiredError(project.cwd, this.context.cwd);
      await project.restoreInstallState();
      const resolver = configuration.makeResolver();
      return { configuration, workspace, cache, project, resolver };
    }
    async getAdvisories() {
      const stdout = new import_stream.PassThrough();
      const chunks = [];
      stdout.on(`data`, (chunk) => {
        chunks.push(chunk);
      });
      await this.cli.run([`npm`, `audit`, `-AR`, `--json`], { stdout });
      stdout.end();
      const result = JSON.parse(Buffer.concat(chunks).toString());
      if (!isAuditResult(result)) {
        throw new Error(`Unexpected yarn npm audit result`);
      }
      const advisories = [];
      Object.entries(result.advisories).forEach(([_id, advisory]) => {
        advisories.push(advisory);
      });
      return advisories;
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
