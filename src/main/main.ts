import { SpecificRegion } from '../enum/SpecificRegion';
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
	GatewayIntentBits,
	MessageFlags,
	ModalSubmitFields,
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import i18n from 'i18n';
import { CONFIG } from '../config/config';
import { Side, sideToText } from '../enum/Side';
import { LurkersService } from '../services/LurkersService';
import {
	ButtonCommand,
	Command,
	CommandList,
	CommandOption,
	LocaleError,
	Loggers,
	ModalSubmitCommand,
	SimpleDiscordBot,
} from '@pekno/simple-discordbot';

const localesPath = path.resolve(__dirname, '../locales');
const files = fs.readdirSync(localesPath);
const localList = files.map((f) => f.replace('.json', '').toLowerCase());

i18n.configure({
	locales: localList,
	directory: localesPath,
	defaultLocale: 'en',
	objectNotation: true,
});
if (!localList.includes(CONFIG.LOCALE.toLowerCase()))
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

const lurkerService = new LurkersService();
const simpleBot = new SimpleDiscordBot<LurkersService>(
	{
		discord_token: CONFIG.DISCORD_TOKEN ?? '',
		discord_id: CONFIG.DISCORD_ID ?? '',
		intents: [GatewayIntentBits.Guilds],
		locale: CONFIG.LOCALE,
		available_locale: localList,
		locale_directory: localesPath,
	},
	lurkerService
);

const simpleCommandsList = new CommandList<LurkersService>();
simpleCommandsList.push(
	new Command({
		name: 'start',
		description: i18n.__('display.command.start.description'),
		execute: async (
			interaction: ChatInputCommandInteraction,
			client: Client,
			lurkerService: LurkersService
		) => {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const lurker = lurkerService.getLurker(interaction);
			await lurker.start(interaction.channelId);
			await interaction.editReply(i18n.__('display.command.start.reply'));
		},
	})
);
simpleCommandsList.push(
	new Command({
		name: 'stop',
		description: i18n.__('display.command.stop.description'),
		execute: async (
			interaction: ChatInputCommandInteraction,
			client: Client,
			lurkerService: LurkersService
		) => {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const lurker = lurkerService.getLurker(interaction);
			await lurker.stop();
			await interaction.editReply(i18n.__('display.command.stop.reply'));
		},
	})
);
simpleCommandsList.push(
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
			lurkerService: LurkersService
		) => {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const lurker = lurkerService.getLurker(interaction);
			const summonerName = interaction.options.getString('summoner_name');
			const summonerRegion = interaction.options.getString(
				'summoner_region'
			) as SpecificRegion;
			const summ = await lurker.addSummoner(summonerName, summonerRegion);
			await interaction.editReply(
				unescapeHTML(
					i18n.__('display.command.add.reply', {
						summonerHyperlink: summ?.hyperlink ?? '??',
					})
				)
			);
		},
	})
);
simpleCommandsList.push(
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
			lurkerService: LurkersService
		) => {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const lurker = lurkerService.getLurker(interaction);
			const summonerName = interaction.options.getString('summoner_name');
			const summonerRegion = interaction.options.getString(
				'summoner_region'
			) as SpecificRegion;
			const summ = lurker.removeSummoner(summonerName, summonerRegion);
			await interaction.editReply(
				unescapeHTML(
					i18n.__('display.command.remove.reply', {
						summonerHyperlink: summ?.hyperlink ?? '??',
					})
				)
			);
		},
	})
);
simpleCommandsList.push(
	new Command({
		name: 'list',
		description: i18n.__('display.command.list.description'),
		execute: async (
			interaction: ChatInputCommandInteraction,
			client: Client,
			lurkerService: LurkersService
		) => {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const lurker = lurkerService.getLurker(interaction);
			const summonerText = lurker.getSummonersHyperlink();
			await interaction.editReply(
				unescapeHTML(
					i18n.__('display.command.list.reply', {
						summonerHyperlink: summonerText,
					})
				)
			);
		},
	})
);
simpleCommandsList.push(
	new Command({
		name: 'scoreboard',
		description: i18n.__('display.command.scoreboard.description'),
		execute: async (
			interaction: ChatInputCommandInteraction,
			client: Client,
			lurkerService: LurkersService
		) => {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const lurker = lurkerService.getLurker(interaction);
			await interaction.editReply({
				embeds: [await lurker.buildEmbedScoreboard(client)],
			});
		},
	})
);
simpleCommandsList.push(
	new ButtonCommand({
		name: 'button_bet',
		execute: async (
			interaction: ButtonInteraction,
			client: Client,
			lurkerService: LurkersService,
			extraInfo: any
		) => {
			const { side, gameId } = extraInfo;
			if (!interaction.user.id)
				throw new LocaleError('error.discord.wrong_userId');
			const lurker = lurkerService.getLurker(interaction);
			const currentScore = lurker.checkScore(interaction.user.id);

			const modal = new ModalBuilder()
				.setCustomId(
					`bet_modal;side:=${side};gameId:=${gameId};currentScore:=${currentScore}`
				)
				.setTitle(
					i18n.__('display.modal.current', {
						side: sideToText(side as Side),
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
simpleCommandsList.push(
	new ModalSubmitCommand({
		name: 'submit_bet_modal',
		execute: async (
			interaction: ModalSubmitInteraction,
			client: Client,
			lurkerService: LurkersService,
			extraInfo: any,
			modalPayload?: ModalSubmitFields
		) => {
			const { side, gameId } = extraInfo;
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			if (!modalPayload) throw new LocaleError('error.lurker.wrong_amount');
			const amount = +modalPayload.getField('amount').value;
			const lurker = lurkerService.getLurker(interaction);
			if (Number.isNaN(amount))
				throw new LocaleError('error.lurker.wrong_amount', {
					amount: `${amount}`,
				});
			if (amount <= 0)
				throw new LocaleError('error.lurker.positive_amount', {
					amount: `${amount}`,
				});
			if (!interaction.user.id)
				throw new LocaleError('error.discord.wrong_userId');
			const wagerText = await lurker.setBet(
				+gameId,
				interaction.user.id,
				amount,
				side as Side
			);
			interaction.editReply({ content: wagerText });
		},
	})
);

lurkerService.start().then(() => {
	simpleBot
		.start(simpleCommandsList)
		.then(async (client) => {
			lurkerService.setClient(client);
			await lurkerService.restoreAll();
		})
		.catch((e: any) => {
			Loggers.get().error(e, e.stack);
		});
});

function unescapeHTML(str: string): string {
	const htmlEntities: { [key: string]: string } = {
		'&#x2F;': '/', // Handle URL forward slash encoded as &#x2F;
		'&lt;': '<', // Less than symbol
		'&gt;': '>', // Greater than symbol
		'&amp;': '&', // Ampersand
		'&quot;': '"', // Double quote
		'&apos;': "'", // Single quote
		// Add other entities if necessary
	};

	// Replace all known HTML entities with their actual characters
	return str.replace(
		/&#x2F;|&lt;|&gt;|&amp;|&quot;|&apos;/g,
		(match) => htmlEntities[match] || match
	);
}
