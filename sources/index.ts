import { PassThrough } from "node:stream"

import { BaseCommand, WorkspaceRequiredError } from "@yarnpkg/cli"
import {
  Cache,
  Configuration,
  Descriptor,
  InstallMode,
  Locator,
  MessageName,
  Plugin,
  Project,
  semverUtils,
  StreamReport,
  structUtils,
} from "@yarnpkg/core"
import { Command, Option } from "clipanion"
import * as t from "typanion"

class NpmAuditFixCommand extends BaseCommand {
  public static paths = [[`npm`, `audit`, `fix`]]

  public static usage = Command.Usage({
    description: `Attempt to fix advisories reported by the audit`,
    details: `
    This command attempts to resolve security advisories on the packages you use
    by upgrading packages to patched versions if possible while respecting the 
    requested version ranges.

    Most flags do the same as their counterparts in \`yarn npm audit\`.

    The \`--mode\` flag does the same as its counterpart in \`yarn install\`.
    `,
    examples: [[`Attempt to resolve all audit advisories`, `$0 npm audit -AR`]],
  })

  // yarn npm audit flags

  public all = Option.Boolean(`-A,--all`, false, {
    description: `Audit dependencies from all workspaces`,
  })

  public recursive = Option.Boolean(`-R,--recursive`, false, {
    description: `Audit transitive dependencies as well`,
  })

  public environment = Option.String(`--environment`, Environment.All, {
    description: `Which environments to cover`,
    validator: t.isEnum(Environment),
  })

  public severity = Option.String(`--severity`, Severity.Info, {
    description: `Minimal severity requested for packages to be displayed`,
    validator: t.isEnum(Severity),
  })

  public excludes = Option.Array(`--exclude`, [], {
    description: `Array of glob patterns of packages to exclude from audit`,
  })

  public ignores = Option.Array(`--ignore`, [], {
    description: `Array of glob patterns of advisory ID's to ignore in the audit report`,
  })

  // yarn install flags

  public mode = Option.String(`--mode`, {
    description: `Change what artifacts installs generate`,
    validator: t.isEnum(InstallMode),
  })

  public async execute() {
    const state = await this.initState()
    const { configuration, project, cache } = state

    const report = await StreamReport.start(
      {
        configuration,
        stdout: this.context.stdout,
      },
      async (report) => {
        const advisories = await report.startTimerPromise(`Audit step`, () =>
          this.getAdvisories(),
        )

        for (const advisory of advisories) {
          const fmtName = structUtils.prettyIdent(
            configuration,
            structUtils.parseIdent(advisory.module_name),
          )
          const fmtVulnRange = structUtils.prettyRange(
            configuration,
            advisory.vulnerable_versions,
          )
          const fmtPatchRange = structUtils.prettyRange(
            configuration,
            advisory.patched_versions,
          )
          await report.startTimerPromise(
            `Advisory for ${fmtName} at ${fmtVulnRange}, patched at ${fmtPatchRange}`,
            () => this.handleAdvisory(report, state, advisory),
          )
        }

        await project.install({
          report,
          cache,
          mode: this.mode,
        })
      },
    )

    return report.exitCode()
  }

  private async handleAdvisory(
    report: StreamReport,
    state: Awaited<ReturnType<typeof this.initState>>,
    advisory: Advisory,
  ) {
    const { configuration, resolver, project } = state

    const vulnerableIdent = structUtils.parseIdent(advisory.module_name)

    for (const foundDescriptor of project.storedDescriptors.values()) {
      if (!structUtils.areIdentsEqual(foundDescriptor, vulnerableIdent)) {
        continue
      }

      if (structUtils.isVirtualDescriptor(foundDescriptor)) {
        continue
      }

      const foundLocator = project.storedPackages.get(
        project.storedResolutions.get(foundDescriptor.descriptorHash),
      )

      if (
        !foundLocator ||
        !semverUtils.satisfiesWithPrereleases(
          foundLocator.version,
          advisory.vulnerable_versions,
        )
      ) {
        continue
      }

      report.reportInfo(
        MessageName.UNNAMED,
        `Found vulnerable ${structUtils.prettyLocator(
          configuration,
          foundLocator,
        )} (via ${structUtils.prettyRange(
          configuration,
          foundDescriptor.range,
        )})`,
      )

      const canidateLocators = await resolver.getCandidates(
        foundDescriptor,
        new Map(),
        {
          project,
          report,
          resolver,
        },
      )
      const preferredLocator = canidateLocators[0]

      if (!preferredLocator) {
        report.reportError(
          MessageName.UNNAMED,
          `No candidates found for ${structUtils.prettyDescriptor(
            configuration,
            foundDescriptor,
          )}`,
        )
        continue
      }

      const preferredPackage = await resolver.resolve(preferredLocator, {
        project,
        report,
        resolver,
      })
      if (
        !semverUtils.satisfiesWithPrereleases(
          preferredPackage.version,
          advisory.patched_versions,
        )
      ) {
        report.reportWarning(
          MessageName.UNNAMED,
          `No compatible patched version found for ${structUtils.prettyDescriptor(
            configuration,
            foundDescriptor,
          )}`,
        )
        continue
      }

      report.reportInfo(
        MessageName.UNNAMED,
        `Setting resolution for ${structUtils.prettyDescriptor(
          configuration,
          foundDescriptor,
        )} to ${structUtils.prettyLocator(configuration, preferredLocator)}`,
      )

      this.setResolution(state, foundDescriptor, preferredPackage)
    }
  }

  private setResolution(
    state: Awaited<ReturnType<typeof this.initState>>,
    fromDescriptor: Descriptor,
    toLocator: Locator,
  ) {
    const { project } = state

    const toDescriptor = structUtils.convertLocatorToDescriptor(toLocator)

    project.storedDescriptors.set(fromDescriptor.descriptorHash, fromDescriptor)
    project.storedDescriptors.set(toDescriptor.descriptorHash, toDescriptor)

    project.resolutionAliases.set(
      fromDescriptor.descriptorHash,
      toDescriptor.descriptorHash,
    )
  }

  private async initState() {
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins,
    )

    const { project, workspace } = await Project.find(
      configuration,
      this.context.cwd,
    )

    const cache = await Cache.find(configuration)

    if (!workspace)
      throw new WorkspaceRequiredError(project.cwd, this.context.cwd)

    await project.restoreInstallState()

    const resolver = configuration.makeResolver()

    return { configuration, workspace, cache, project, resolver }
  }

  private async getAdvisories() {
    const stdout = new PassThrough()
    const chunks = []
    stdout.on(`data`, (chunk) => {
      chunks.push(chunk)
    })

    const args = [`npm`, `audit`, `-AR`, `--json`]
    if (this.all) args.push(`--all`)
    if (this.recursive) args.push(`--recursive`)
    if (this.environment) args.push(`--environment`, this.environment)
    if (this.severity) args.push(`--severity`, this.severity)
    for (const exclude of this.excludes) args.push(`--exclude`, exclude)
    for (const ignore of this.ignores) args.push(`--ignore`, ignore)

    await this.cli.run(args, { stdout })
    stdout.end()

    const result = JSON.parse(Buffer.concat(chunks).toString()) as unknown
    if (!isAuditResult(result)) {
      throw new Error(`Unexpected yarn npm audit result`)
    }

    const advisories: Advisory[] = []

    for (const [_id, advisory] of Object.entries(result.advisories)) {
      advisories.push(advisory)
    }

    return advisories
  }
}

// type helpers; I can't find docs so these may need modification for optionals

const isAuditResult = t.isObject(
  {
    advisories: t.isDict(
      t.isObject(
        {
          module_name: t.isString(),
          vulnerable_versions: t.isString(),
          patched_versions: t.isString(),
        },
        { extra: t.isDict(t.isUnknown()) },
      ),
    ),
  },
  { extra: t.isDict(t.isUnknown()) },
)

type AuditResult = t.InferType<typeof isAuditResult>
type Advisory = AuditResult[`advisories`][string]

// enums copied from https://github.com/yarnpkg/berry/blob/%40yarnpkg/plugin-npm-cli/3.3.0/packages/plugin-npm-cli/sources/npmAuditTypes.ts

export enum Environment {
  All = `all`,
  Production = `production`,
  Development = `development`,
}

export enum Severity {
  Info = `info`,
  Low = `low`,
  Moderate = `moderate`,
  High = `high`,
  Critical = `critical`,
}

// finally, export the plugin

const plugin: Plugin = {
  commands: [NpmAuditFixCommand],
}

export default plugin
