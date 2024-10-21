import {
	APIApplicationCommandOptionChoice,
	ApplicationCommandOptionType,
	AutocompleteInteraction,
	BaseInteraction,
	ButtonInteraction,
	CacheType,
	ChatInputCommandInteraction,
	Client,
	CommandInteraction,
	ModalSubmitInteraction,
} from 'discord.js';
import { LocaleError } from './LocalError';
import { Lurker } from '../services/Lurker';

export type AnyCommandInteraction =
	| ChatInputCommandInteraction<CacheType>
	| AutocompleteInteraction<CacheType>
	| ModalSubmitInteraction<CacheType>
	| ButtonInteraction<CacheType>;

export class CommandList {
	private _commands: Map<string, Command<AnyCommandInteraction>> = new Map();
	private _alias: Map<string, string> = new Map();

	push = (command: Command<AnyCommandInteraction>) => {
		this._commands.set(command.name, command);
		if (command.clickAlias) this._alias.set(command.clickAlias, command.name);
	};

	execute = (
		interaction: BaseInteraction,
		client: Client,
		lurker: Lurker,
		commandName?: string,
		byPassParameters?: any
	): Promise<void> => {
		const cmdName =
			commandName ?? (interaction as CommandInteraction).commandName;
		if (!cmdName) throw new LocaleError('error.discord.no_command_name');
		// Try to get alias
		const alias = this._alias.get(cmdName);
		// If no command found, try with alias
		const command =
			this._commands.get(cmdName) ?? (alias ? this._commands.get(alias) : null);
		if (!command) throw new LocaleError('error.discord.command_not_found');

		return command.execute(interaction, client, lurker, byPassParameters);
	};

	build = (): {
		name: string;
		description: string;
		options: CommandOption[];
	}[] => {
		const res = [];
		for (const [, value] of this._commands) {
			if (value.registerPredicate())
				res.push({
					name: value.name,
					description: value.description,
					options: value.options,
				});
		}
		return res;
	};
}

export class Command<T extends AnyCommandInteraction> {
	name: string;
	clickAlias: string;
	description: string;
	options: CommandOption[];
	execute: (
		interaction: any,
		client: Client,
		lurker: Lurker,
		byPassParameters?: any
	) => Promise<void>;

	registerPredicate: () => boolean;

	public constructor(init?: Partial<Command<T>>) {
		this.registerPredicate = () => true;
		Object.assign(this, init);
	}
}

export class ModalSubmitCommand extends Command<
	ModalSubmitInteraction<CacheType>
> {
	constructor(init?: Partial<ModalSubmitCommand>) {
		super(init);
		this.registerPredicate = () => false;
	}
}

export class ButtonCommand extends Command<ButtonInteraction<CacheType>> {
	constructor(init?: Partial<ButtonCommand>) {
		super(init);
		this.registerPredicate = () => false;
	}
}

export class AutoCompleteCommand extends Command<
	AutocompleteInteraction<CacheType>
> {
	constructor(init?: Partial<AutoCompleteCommand>) {
		super(init);
		this.registerPredicate = () => false;
	}
}

export class CommandOption {
	name: string;
	description: string;
	autocomplete: boolean = false;
	required: boolean = false;
	type: ApplicationCommandOptionType;
	choices: APIApplicationCommandOptionChoice[];

	public constructor(init?: Partial<CommandOption>) {
		Object.assign(this, init);
	}
}
