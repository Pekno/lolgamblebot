import {
	Client,
	Events,
	GatewayIntentBits,
	REST,
	Routes,
	TextChannel,
} from 'discord.js';
import { CommandList } from '../model/DiscordModels';
import { Lurker } from './Lurker';
import { CONFIG } from '../config/config';
import { RiotAPI } from '../api/RiotApi';
import { OPGGApi } from '../api/OPGGApi';
import fs from 'fs';
import path from 'path';
import { Save } from '../model/Save';
import { RiotChampion } from '../model/RiotModels';
import { Side, sideToText } from '../enum/Side';
import { Logger } from './LoggerService';
import { LocaleError } from '../model/LocalError';

export class Bot {
	private _lurkers: Map<string, Lurker> = new Map<string, Lurker>();
	private _riotApi: RiotAPI;
	private _opggApi: OPGGApi;
	private _client: Client;
	private _championList: RiotChampion[] = [];

	private register = async (commandList: CommandList) => {
		this._client = new Client({ intents: [GatewayIntentBits.Guilds] });

		if (!CONFIG.DISCORD_TOKEN) throw new Error('No Discord token configured');
		if (!CONFIG.DISCORD_ID) throw new Error('No Discord id configured');

		const rest = new REST({ version: '10' }).setToken(CONFIG.DISCORD_TOKEN);
		try {
			await rest.put(Routes.applicationCommands(CONFIG.DISCORD_ID), {
				body: commandList.build(),
			});
			Logger.info('Bot : Successfully loaded application (/) commands.');
		} catch (e: any) {
			Logger.error(e, e.stack);
		}

		this._client.on(Events.InteractionCreate, async (interaction) => {
			if (!interaction) throw new LocaleError('error.discord.no_interaction');
			if (!interaction.guildId)
				throw new LocaleError('error.discord.no_guild_id');
			try {
				let action;
				let payload;
				if (interaction.isAutocomplete()) {
					action = `${interaction.commandName}_autocomplete`;
				} else if (interaction.isStringSelectMenu()) {
					action = interaction.customId.replace('suno_optionselect_', '');
					payload = interaction.values[0];
				} else if (interaction.isButton()) {
					if (
						interaction.customId === 'prev' ||
						interaction.customId === 'next'
					)
						return;
					const [command, side, gameId] = interaction.customId.split(';');
					action = command;
					payload = {
						side: parseInt(side) as Side,
						gameId: parseInt(gameId),
						userId: interaction.member?.user.id,
					};
				} else if (interaction.isModalSubmit()) {
					const [command, side, gameId] = interaction.customId.split(';');
					action = `submit_${command}`;
					payload = {
						side: parseInt(side) as Side,
						gameId: parseInt(gameId),
						userId: interaction.member?.user.id,
						amount: parseInt(interaction.fields.getTextInputValue('amount')),
					};
				} else if (!interaction.isChatInputCommand()) {
					return;
				}
				// Check lurker
				if (!interaction.guildId)
					throw new Error('Command was not sent from a server');
				let specificLurker = this._lurkers.get(interaction.guildId);
				if (!specificLurker) {
					this._lurkers.set(
						interaction.guildId,
						this.createAndBindLurker(interaction.guildId)
					);
					specificLurker = this._lurkers.get(interaction.guildId);
				}
				if (!specificLurker)
					throw new Error('Could not find a Lurker available for this server');

				await commandList.execute(
					interaction,
					this._client,
					specificLurker,
					action,
					payload
				);
			} catch (e: any) {
				Logger.error(e, e.stack);
				if (e.code !== 10062) {
					if ('deferred' in interaction && interaction.deferred) {
						await interaction.editReply({
							content: `⚠️ __${e.message.substring(0, 1_500)}__ ⚠️`,
						});
					} else {
						if ('reply' in interaction)
							await interaction.reply({
								content: `⚠️ __${e.message.substring(0, 1_500)}__ ⚠️`,
								ephemeral: true,
							});
					}
				}
			}
		});
		await this._client.login(CONFIG.DISCORD_TOKEN);
	};

	start = async (commandList: CommandList) => {
		// Start bot, then start lurkers
		if (!commandList) throw new Error('No Discord commands configured');
		await this.register(commandList);

		this._championList = await this._opggApi.getChampionList();
		if (!this._championList?.length)
			throw new Error('No champion list available');
		Logger.info(`Bot : Retrieved all ${this._championList.length} champions`);

		// Recreate Lurkers from save datafile
		const files = fs.readdirSync(CONFIG.SAVED_DATA_PATH);
		const filteredFiles = files.filter(
			(file) => path.extname(file).toLowerCase() === '.json'
		);
		Logger.info(
			`Bot : Restoring ${filteredFiles.length} lurkers from save file`
		);
		for (const file of filteredFiles) {
			await this.restore(file.replace('.json', ''));
		}
	};

	restore = async (guildId: string) => {
		const data = JSON.parse(
			fs.readFileSync(`${CONFIG.SAVED_DATA_PATH}/${guildId}.json`, 'utf8')
		) as Save;
		const lurker = this.createAndBindLurker(data.guildId);
		this._lurkers.set(data.guildId, lurker);
		await lurker.start(data.channelId, data);
	};

	private getChannel = async (lurker: Lurker): Promise<TextChannel | null> => {
		if (lurker.channelId) {
			const channel = await this._client.channels.fetch(lurker.channelId);
			if (channel?.isTextBased) {
				return channel as TextChannel;
			}
		}
		return null;
	};

	private createAndBindLurker = (guildId: string): Lurker => {
		Logger.info(`Bot : Creating new lurker for guildId : ${guildId}`);
		const lurker = new Lurker(
			guildId,
			this._riotApi,
			this._opggApi,
			this._championList
		);

		lurker.on('newWager', async (wager) => {
			const channel = await this.getChannel(lurker);
			if (!channel) return;

			wager.message = await channel.send({
				embeds: [wager.buildEmbed()],
				components: [wager.buildButton()],
			});
		});
		lurker.on('restoreWager', async (wager) => {
			const channel = await this.getChannel(lurker);
			if (!channel) return;
			if (!wager.messageId) return;

			wager.message = await channel.messages.fetch(wager.messageId);
			if (!wager.message) return;
			await wager.message.edit({
				embeds: [wager.buildEmbed()],
				components: [wager.buildButton()],
			});
		});
		lurker.on('updateWager', async (wager) => {
			const channel = await this.getChannel(lurker);
			if (!channel) return;

			if (!wager.message) return;
			await wager.message.edit({
				embeds: [wager.buildEmbed()],
				components: [wager.buildButton()],
			});
		});
		lurker.on('endedWager', async (wager) => {
			const channel = await this.getChannel(lurker);
			if (!channel) return;

			for (const payout of wager.payouts) {
				const user = await this._client.users.fetch(payout.userId);
				const betData = wager.bettors.get(payout.userId);
				if (betData) {
					const wagerInfo = `By wagering ${betData.amount} ${CONFIG.CURRENCY} on ${sideToText(betData.side)} side on this Game : ${wager.message.url}`;
					if (betData.side === wager.outcome.victorySide) {
						user.send(
							`🥳 **WON** - ${wagerInfo}, you won ${payout.amount} ${CONFIG.CURRENCY}`
						);
					} else {
						user.send(`😵 **LOST** - ${wagerInfo}`);
					}
				}
			}

			if (!wager.message) return;
			await wager.message.edit({ embeds: [wager.buildEmbed()] });
		});
		lurker.on('lockedWager', async (wager) => {
			const channel = await this.getChannel(lurker);
			if (!channel) return;

			if (!wager.message) return;
			await wager.message.edit({
				embeds: [wager.buildEmbed()],
				components: [wager.buildButton()],
			});
		});

		return lurker;
	};

	constructor() {
		if (!CONFIG.RIOT_API_KEY) throw new Error('No RIOT API KEY defined');
		this._riotApi = new RiotAPI(
			{ 'X-Riot-Token': CONFIG.RIOT_API_KEY },
			CONFIG.RIOT_API_LIMIT_BY_MINUTES
		);
		this._opggApi = new OPGGApi();
		if (!fs.existsSync(CONFIG.SAVED_DATA_PATH)) {
			fs.mkdirSync(CONFIG.SAVED_DATA_PATH, { recursive: true });
		}
	}
}
