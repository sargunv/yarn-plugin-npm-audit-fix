import { PassThrough } from "stream"

import { BaseCommand, WorkspaceRequiredError } from "@yarnpkg/cli"
import {
  Cache,
  Configuration,
  DescriptorHash,
  InstallMode,
  LocatorHash,
  MessageName,
  Plugin,
  Project,
  semverUtils,
  StreamReport,
  structUtils,
} from "@yarnpkg/core"
import * as t from "typanion"

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

class NpmAuditFixCommand extends BaseCommand {
  public static paths = [[`npm`, `audit`, `fix`]]

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
          mode: InstallMode.UpdateLockfile,
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

    const ident = structUtils.parseIdent(advisory.module_name)

    const resolutionsToDelete = new Set<DescriptorHash>()
    const locatorsToDelete = new Set<LocatorHash>()

    for (const descriptor of project.storedDescriptors.values()) {
      if (!structUtils.areIdentsEqual(descriptor, ident)) {
        continue
      }

      const locator = project.storedPackages.get(
        project.storedResolutions.get(descriptor.descriptorHash),
      )

      if (
        !semverUtils.satisfiesWithPrereleases(
          locator.version,
          advisory.vulnerable_versions,
        )
      ) {
        continue
      }

      report.reportInfo(
        MessageName.UNNAMED,
        `Found vulnerable ${structUtils.prettyLocator(
          configuration,
          locator,
        )} (via ${structUtils.prettyRange(configuration, descriptor.range)})`,
      )

      const candidates = await resolver.getCandidates(descriptor, new Map(), {
        project,
        report,
        resolver,
      })
      const preferred = candidates[0]

      if (!preferred) {
        report.reportError(
          MessageName.UNNAMED,
          `No candidates found for ${structUtils.prettyDescriptor(
            configuration,
            descriptor,
          )}`,
        )
        continue
      }

      const pkg = await resolver.resolve(preferred, {
        project,
        report,
        resolver,
      })
      if (
        !semverUtils.satisfiesWithPrereleases(
          pkg.version,
          advisory.patched_versions,
        )
      ) {
        report.reportWarning(
          MessageName.UNNAMED,
          `No compatible patched version found for ${structUtils.prettyDescriptor(
            configuration,
            descriptor,
          )}`,
        )
        continue
      }

      report.reportInfo(
        MessageName.UNNAMED,
        `Attempting to upgrade ${structUtils.prettyDescriptor(
          configuration,
          descriptor,
        )} to ${structUtils.prettyLocator(configuration, pkg)}`,
      )

      // deleting the resolution and locator will cause the project to
      // re-resolve the descriptor on the next install
      resolutionsToDelete.add(descriptor.descriptorHash)
      locatorsToDelete.add(locator.locatorHash)
    }

    resolutionsToDelete.forEach(
      (descriptorHash) => void project.storedResolutions.delete(descriptorHash),
    )

    locatorsToDelete.forEach(
      (locatorHash) => void project.storedPackages.delete(locatorHash),
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

    await this.cli.run([`npm`, `audit`, `-AR`, `--json`], { stdout })
    stdout.end()

    const result = JSON.parse(Buffer.concat(chunks).toString()) as unknown
    if (!isAuditResult(result)) {
      throw new Error(`Unexpected yarn npm audit result`)
    }

    const advisories: Advisory[] = []

    Object.entries(result.advisories).forEach(([_id, advisory]) => {
      advisories.push(advisory)
    })

    return advisories
  }
}

const plugin: Plugin = {
  commands: [NpmAuditFixCommand],
}

export default plugin
