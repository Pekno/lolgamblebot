import { SpecificRegion } from '../enum/SpecificRegion';
import {
	ButtonCommand,
	Command,
	CommandList,
	CommandOption,
	ModalSubmitCommand,
} from '../model/DiscordModels';
import { Bot } from '../services/Bot';
import { Lurker } from '../services/Lurker';
import {
	Client,
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	ModalSubmitInteraction,
	ButtonInteraction,
	TextInputStyle,
	ActionRowBuilder,
	TextInputBuilder,
	ModalBuilder,
} from 'discord.js';
import path from 'path';
import i18n from 'i18n';
import { Logger } from '../services/LoggerService';
import { CONFIG } from '../config/config';
import { LocaleError } from '../model/LocalError';
import { Side, sideToText } from '../enum/Side';

i18n.configure({
	locales: CONFIG.AVAILABLE_LOCAL,
	directory: path.resolve(__dirname, '../locales'),
	defaultLocale: 'en',
	objectNotation: true,
});
if (!CONFIG.AVAILABLE_LOCAL.includes(CONFIG.LOCALE.toLowerCase()))
	throw new LocaleError('error._default', {
		message: `LOCALE env var not recognized`,
	});
i18n.setLocale(CONFIG.LOCALE.toLowerCase());
Logger.info(`LOCALE : ${CONFIG.LOCALE.toUpperCase()}`);

const regionOption = Object.keys(SpecificRegion).map((v, i) => {
	return {
		name: v.replace(/ /g, ''),
		value: Object.values(SpecificRegion)[i],
	};
});

const commandsList = new CommandList();
commandsList.push(
	new Command({
		name: 'start',
		description: 'Tell the bot to start and notify in this channel',
		execute: async (
			interaction: ChatInputCommandInteraction,
			client: Client,
			lurker: Lurker
		) => {
			await lurker.start(interaction.channelId);
			await interaction.reply(`Bot will now send notification on this channel`);
		},
	})
);
commandsList.push(
	new Command({
		name: 'stop',
		description: 'Tell the bot to stop notification in this channel',
		execute: async (
			interaction: ChatInputCommandInteraction,
			client: Client,
			lurker: Lurker
		) => {
			await lurker.stop();
			await interaction.reply(
				`Bot will now stop sending notification on this channel`
			);
		},
	})
);
commandsList.push(
	new Command({
		name: 'add',
		description: 'Add a new summoner to check',
		options: [
			new CommandOption({
				name: 'summoner_region',
				description: 'region of the summoner to be added',
				type: ApplicationCommandOptionType.String,
				choices: regionOption,
				required: true,
			}),
			new CommandOption({
				name: 'summoner_name',
				description: 'name of the summoner to be added like <AAAAA#BBB>',
				type: ApplicationCommandOptionType.String,
				required: true,
			}),
		],
		execute: async (
			interaction: ChatInputCommandInteraction,
			client: Client,
			lurker: Lurker
		) => {
			const summonerName = interaction.options.getString('summoner_name');
			const summonerRegion = interaction.options.getString(
				'summoner_region'
			) as SpecificRegion;
			await lurker.addSummoner(summonerName, summonerRegion);
			await interaction.reply(`Added ${summonerName} to the check list`);
		},
	})
);
commandsList.push(
	new Command({
		name: 'remove',
		description: 'Remove a summoner from the check list',
		options: [
			new CommandOption({
				name: 'summoner_region',
				description: 'region of the summoner to be removed',
				type: ApplicationCommandOptionType.String,
				choices: regionOption,
				required: true,
			}),
			new CommandOption({
				name: 'summoner_name',
				description: 'name of the summoner to be removed like <AAAAA#BBB>',
				type: ApplicationCommandOptionType.String,
				required: true,
			}),
		],
		execute: async (
			interaction: ChatInputCommandInteraction,
			client: Client,
			lurker: Lurker
		) => {
			const summonerName = interaction.options.getString('summoner_name');
			const summonerRegion = interaction.options.getString(
				'summoner_region'
			) as SpecificRegion;
			lurker.removeSummoner(summonerName, summonerRegion);
			await interaction.reply(`Removed ${summonerName} from the check list`);
		},
	})
);
commandsList.push(
	new Command({
		name: 'list',
		description: 'Get the summoners from the check list',
		execute: async (
			interaction: ChatInputCommandInteraction,
			client: Client,
			lurker: Lurker
		) => {
			const summonerText = lurker.getSummoners();
			await interaction.reply(`Watching this Summoners : ${summonerText}`);
		},
	})
);
commandsList.push(
	new Command({
		name: 'scoreboard',
		description: 'Get the scoreboard from the bot',
		execute: async (
			interaction: ChatInputCommandInteraction,
			client: Client,
			lurker: Lurker
		) => {
			await interaction.reply({
				embeds: [await lurker.buildEmbedScoreboard(client)],
			});
		},
	})
);
commandsList.push(
	new ButtonCommand({
		name: 'button_bet',
		execute: async (
			interaction: ButtonInteraction,
			client: Client,
			lurker: Lurker,
			byPassParameters: {
				side: Side;
				gameId: number;
				userId: string;
			}
		) => {
			if (!byPassParameters?.userId)
				throw new Error('Cannot find userId on this server');
			const currentScore = lurker.checkScore(byPassParameters.userId);

			const modal = new ModalBuilder()
				.setCustomId(
					`bet_modal;${byPassParameters.side};${byPassParameters.gameId};${currentScore}`
				)
				.setTitle(`Wager on ${sideToText(byPassParameters.side)}`);

			const favoriteColorInput = new TextInputBuilder()
				.setCustomId('amount')
				.setLabel("What's the amount you want to wager ?")
				.setPlaceholder(`You currently have ${currentScore} ${CONFIG.CURRENCY}`)
				.setRequired(true)
				.setStyle(TextInputStyle.Short);

			const firstActionRow =
				new ActionRowBuilder<TextInputBuilder>().addComponents(
					favoriteColorInput
				);
			modal.addComponents(firstActionRow);

			await interaction.showModal(modal);
		},
	})
);
commandsList.push(
	new ModalSubmitCommand({
		name: 'submit_bet_modal',
		execute: async (
			interaction: ModalSubmitInteraction,
			client: Client,
			lurker: Lurker,
			byPassParameters: {
				side: Side;
				gameId: number;
				userId: string;
				amount: number;
			}
		) => {
			if (Number.isNaN(byPassParameters?.amount))
				throw new Error(`${byPassParameters.amount} is not a correct number`);
			if (byPassParameters?.amount <= 0)
				throw new Error(`${byPassParameters.amount} is not > 0`);
			if (!byPassParameters?.userId)
				throw new Error('Cannot find userId on this server');
			const wagerText = await lurker.setBet(
				byPassParameters.gameId,
				byPassParameters.userId,
				byPassParameters.amount,
				byPassParameters.side
			);
			interaction.reply({ content: wagerText, ephemeral: true });
		},
	})
);

const bot = new Bot();
bot.start(commandsList).catch((e: any) => {
	Logger.error(e, e.stack);
});
