import { Lurker } from './Lurker';
import { CONFIG } from '../config/config';
import { RiotAPI } from '../api/RiotApi';
import { OPGGApi } from '../api/OPGGApi';
import fs from 'fs';
import path from 'path';
import { Save } from '../model/Save';
import { RiotChampion } from '../model/RiotModels';
import { sideToText } from '../enum/Side';
import i18n from 'i18n';
import { Client, Interaction, TextChannel } from 'discord.js';
import { LocaleError, Loggers } from '@pekno/simple-discordbot';

export class LurkersService {
	private _lurkers: Map<string, Lurker> = new Map<string, Lurker>();
	private _riotApi: RiotAPI;
	private _opggApi: OPGGApi;
	private _client: Client;
	private _championList: RiotChampion[] = [];

	start = async () => {
		// Getting updated champion list
		this._championList = await this._opggApi.getChampionList(CONFIG.LOCALE);
		if (!this._championList?.length)
			throw new LocaleError('error.opgg.no_champions_list');
		Loggers.get().info(
			`Bot : Retrieved all ${this._championList.length} champions`
		);
	};

	public restoreAll = async () => {
		// Recreate Lurkers from save datafile
		const files = fs.readdirSync(CONFIG.SAVED_DATA_PATH);
		const filteredFiles = files.filter(
			(file) => path.extname(file).toLowerCase() === '.json'
		);
		Loggers.get().info(
			`Bot : Restoring ${filteredFiles.length} lurkers from save file`
		);
		for (const file of filteredFiles) {
			await this.restore(file.replace('.json', ''));
		}
	};

	private restore = async (guildId: string) => {
		const data = JSON.parse(
			fs.readFileSync(`${CONFIG.SAVED_DATA_PATH}/${guildId}.json`, 'utf8')
		) as Save;
		const lurker = this.createAndBindLurker(data.guildId);
		this._lurkers.set(data.guildId, lurker);
		await lurker.start(data.channelId, data);
	};

	public getLurker = (interaction: Interaction) => {
		if (!interaction) throw new LocaleError('error.discord.no_interaction');
		if (!interaction.guildId)
			throw new LocaleError('error.discord.no_guild_id');
		let specificLurker = this._lurkers.get(interaction.guildId);
		if (!specificLurker) {
			this._lurkers.set(
				interaction.guildId,
				this.createAndBindLurker(interaction.guildId)
			);
			specificLurker = this._lurkers.get(interaction.guildId);
		}
		if (!specificLurker) throw new LocaleError('error.lurker.no_server_lurker');
		return specificLurker;
	};

	public setClient = (client: Client) => {
		this._client = client;
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
		Loggers.get().info(`Bot : Creating new lurker for guildId : ${guildId}`);
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

			try {
				wager.message = await channel.messages.fetch(wager.messageId);
				if (!wager.message) return;
				await wager.message.edit({
					embeds: [wager.buildEmbed()],
					components: [wager.buildButton()],
				});
			} catch (e) {
				// if message have been deleted, resend one
				Loggers.get().warn(e);
				wager.message = await channel.send({
					embeds: [wager.buildEmbed()],
					components: [wager.buildButton()],
				});
			}
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
					const wagerInfo = `${i18n.__('display.wager.result.you_bet', {
						amount: `${betData.amount} ${CONFIG.CURRENCY}`,
						side: sideToText(betData.side),
					})} ${wager.message.url}`;
					if (betData.side === wager.outcome.victorySide) {
						user.send(
							`🥳 **${i18n.__('display.wager.result.win')}** - ${wagerInfo}, ${i18n.__('display.wager.result.you_won', { amount: `${payout.amount} ${CONFIG.CURRENCY}` })}`
						);
					} else {
						user.send(
							`😵 **${i18n.__('display.wager.result.loose')}** - ${wagerInfo}`
						);
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
		if (!CONFIG.RIOT_API_KEY) throw new LocaleError('error.riot.no_api_key');
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
