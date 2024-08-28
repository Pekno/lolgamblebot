import { APIApplicationCommandOptionChoice, ApplicationCommandOptionType, ChatInputCommandInteraction, Client} from "discord.js";
import { Lurker } from "../services/Lurker";

export class CommandList{
    private _commands: Map<string, Command> = new Map<string, Command>();

    set = (commands: Command[]) => {
        for (const command of commands) {
            this.push(command);
        }
    }

    push = (command: Command) => {
        this._commands.set(command.name, command)
    }

    execute = (interaction: ChatInputCommandInteraction, lurker: Lurker, client: Client) : Promise<void> => {
        if(!interaction?.commandName) throw new Error('No command name given');
        const command = this._commands.get(interaction.commandName);
        if(!command) throw new Error('Command not found');

        return command.execute(interaction, lurker, client);
    }

    build = () : any => {
        const res = []
        for (const [key, value] of this._commands) {
            res.push({ 
                name: value.name,
                description: value.description,
                options: value.options
            })
        }
        return res;
    }
}

export class Command{
    name: string;
    description: string;
    options: CommandOption[]
    execute: (interaction: ChatInputCommandInteraction, lurker: Lurker, client: Client) => Promise<void>

    public constructor(init?: Partial<Command>) {
        Object.assign(this, init);
    }
}

export class CommandOption{
    
    name: string;
    description: string;
    required: boolean = false;
    type: ApplicationCommandOptionType;
    choices: APIApplicationCommandOptionChoice[];

    public constructor(init?: Partial<CommandOption>) {
        Object.assign(this, init);
    }
}