import { BaseCommand } from "@yarnpkg/cli"
import { Plugin } from "@yarnpkg/core"
import { Option } from "clipanion"

class HelloWorldCommand extends BaseCommand {
  public static paths = [[`hello`, `world`]]

  public name = Option.String(`--name`, `John Doe`, {
    description: `Your name`,
  })

  public execute() {
    console.log(`Hello ${this.name}!`)
    return Promise.resolve()
  }
}

const plugin: Plugin = {
  hooks: {
    afterAllInstalled: () => {
      console.log(`What a great install, am I right?`)
    },
  },
  commands: [HelloWorldCommand],
}

export default plugin
