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
import { CONFIG } from '../config/config';
import { LocaleError } from '../model/LocalError';
import { Side, sideToText } from '../enum/Side';
import { Loggers } from '../services/LoggerManager';

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
Loggers.get().info(`LOCALE : ${CONFIG.LOCALE.toUpperCase()}`);

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
		description: i18n.__('display.command.start.description'),
		execute: async (
			interaction: ChatInputCommandInteraction,
			client: Client,
			lurker: Lurker
		) => {
			await interaction.deferReply();
			await lurker.start(interaction.channelId);
			await interaction.editReply(i18n.__('display.command.start.reply'));
		},
	})
);
commandsList.push(
	new Command({
		name: 'stop',
		description: i18n.__('display.command.stop.description'),
		execute: async (
			interaction: ChatInputCommandInteraction,
			client: Client,
			lurker: Lurker
		) => {
			await interaction.deferReply();
			await lurker.stop();
			await interaction.editReply(i18n.__('display.command.stop.reply'));
		},
	})
);
commandsList.push(
	new Command({
		name: 'add',
		description: i18n.__('display.command.add.description'),
		options: [
			new CommandOption({
				name: 'summoner_region',
				description: i18n.__('display.command.add.params.summoner_region'),
				type: ApplicationCommandOptionType.String,
				choices: regionOption,
				required: true,
			}),
			new CommandOption({
				name: 'summoner_name',
				description: i18n.__('display.command.add.params.summoner_name'),
				type: ApplicationCommandOptionType.String,
				required: true,
			}),
		],
		execute: async (
			interaction: ChatInputCommandInteraction,
			client: Client,
			lurker: Lurker
		) => {
			await interaction.deferReply();
			const summonerName = interaction.options.getString('summoner_name');
			const summonerRegion = interaction.options.getString(
				'summoner_region'
			) as SpecificRegion;
			await lurker.addSummoner(summonerName, summonerRegion);
			await interaction.editReply(
				i18n.__('display.command.add.reply', {
					summonerName: summonerName ?? '??',
				})
			);
		},
	})
);
commandsList.push(
	new Command({
		name: 'remove',
		description: i18n.__('display.command.remove.description'),
		options: [
			new CommandOption({
				name: 'summoner_region',
				description: i18n.__('display.command.remove.params.summoner_name'),
				type: ApplicationCommandOptionType.String,
				choices: regionOption,
				required: true,
			}),
			new CommandOption({
				name: 'summoner_name',
				description: i18n.__('display.command.remove.params.summoner_name'),
				type: ApplicationCommandOptionType.String,
				required: true,
			}),
		],
		execute: async (
			interaction: ChatInputCommandInteraction,
			client: Client,
			lurker: Lurker
		) => {
			await interaction.deferReply();
			const summonerName = interaction.options.getString('summoner_name');
			const summonerRegion = interaction.options.getString(
				'summoner_region'
			) as SpecificRegion;
			lurker.removeSummoner(summonerName, summonerRegion);
			await interaction.editReply(
				i18n.__('display.command.remove.reply', {
					summonerName: summonerName ?? '??',
				})
			);
		},
	})
);
commandsList.push(
	new Command({
		name: 'list',
		description: i18n.__('display.command.list.description'),
		execute: async (
			interaction: ChatInputCommandInteraction,
			client: Client,
			lurker: Lurker
		) => {
			await interaction.deferReply();
			const summonerText = lurker.getSummoners();
			await interaction.editReply(
				i18n.__('display.command.remove.description', {
					summonerText: summonerText,
				})
			);
		},
	})
);
commandsList.push(
	new Command({
		name: 'scoreboard',
		description: i18n.__('display.command.scoreboard.description'),
		execute: async (
			interaction: ChatInputCommandInteraction,
			client: Client,
			lurker: Lurker
		) => {
			await interaction.deferReply();
			await interaction.editReply({
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
				throw new LocaleError('error.discord.wrong_userId');
			const currentScore = lurker.checkScore(byPassParameters.userId);

			const modal = new ModalBuilder()
				.setCustomId(
					`bet_modal;${byPassParameters.side};${byPassParameters.gameId};${currentScore}`
				)
				.setTitle(
					i18n.__('display.modal.current', {
						side: sideToText(byPassParameters.side),
					})
				);

			const favoriteColorInput = new TextInputBuilder()
				.setCustomId('amount')
				.setLabel(i18n.__('display.modal.label'))
				.setPlaceholder(
					i18n.__('display.modal.current', {
						amount: `${currentScore} ${CONFIG.CURRENCY}`,
					})
				)
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
			await interaction.deferReply({ ephemeral: true });
			if (Number.isNaN(byPassParameters?.amount))
				throw new LocaleError('error.lurker.wrong_amount', {
					amount: `${byPassParameters.amount}`,
				});
			if (byPassParameters?.amount <= 0)
				throw new LocaleError('error.lurker.positive_amount', {
					amount: `${byPassParameters.amount}`,
				});
			if (!byPassParameters?.userId)
				throw new LocaleError('error.discord.wrong_userId');
			const wagerText = await lurker.setBet(
				byPassParameters.gameId,
				byPassParameters.userId,
				byPassParameters.amount,
				byPassParameters.side
			);
			interaction.editReply({ content: wagerText });
		},
	})
);

const bot = new Bot();
bot.start(commandsList).catch((e: any) => {
	Loggers.get().error(e, e.stack);
});
