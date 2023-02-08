import { BaseCommand } from "@yarnpkg/cli"
import { type Plugin } from "@yarnpkg/core"
import { Option } from "clipanion"
import * as t from "typanion"

const STRATEGIES = [`TODO`] as const

class NpmAuditFixCommand extends BaseCommand {
  public static paths = [[`npm`, `audit`, `fix`]]

  public strategy = Option.String(`--strategy`, `TODO`, {
    description: `Set which strategy to attempt to fix advisories`,
    validator: t.isEnum(STRATEGIES),
  })

  public execute() {
    return Promise.resolve(1)
  }
}

const plugin: Plugin = {
  commands: [NpmAuditFixCommand],
}

export default plugin
