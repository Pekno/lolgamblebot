import { CONFIG } from '../config/config';
import { Participant } from '../model/Participant';
import { OPGGApi } from '../api/OPGGApi';
import { RiotAPI } from '../api/RiotApi';
import { Save, WagerSave } from '../model/Save';
import fs from 'fs';
import { APIEmbedField, Client, EmbedBuilder } from 'discord.js';
import {
	RiotChampion,
	RiotGameData,
	RiotParticipant,
} from '../model/RiotModels';
import { Wager } from '../model/Wager';
import { Summoner } from '../model/Summoner';
import { Side, sideToShortText } from '../enum/Side';
import { SpecificRegion } from '../enum/SpecificRegion';
import { LurkerStatus } from '../enum/LurkerStatus';
import { gameModeToType } from '../enum/GameType';
import { LocaleError, Loggers } from '@pekno/simple-discordbot';

export class Lurker {
	private _wagerList: Map<number, Wager> = new Map<number, Wager>();
	scoreBoard: Map<string, number> = new Map<string, number>();
	guildId: string;
	channelId: string | null;
	status: LurkerStatus = LurkerStatus.CREATED;
	private _summoners: Summoner[] = [];
	private _riotApi: RiotAPI;
	private _opggApi: OPGGApi;
	private _championList: RiotChampion[];
	private _events: Map<string, (wager: Wager) => Promise<void>> = new Map<
		string,
		(wager: Wager) => Promise<void>
	>();

	constructor(
		guildId: string,
		riotApi: RiotAPI,
		opggApi: OPGGApi,
		championList: RiotChampion[]
	) {
		this.guildId = guildId;
		this._riotApi = riotApi;
		this._opggApi = opggApi;
		this._championList = championList;
	}

	on = (event: string, listener: (wager: Wager) => Promise<void>) => {
		this._events.set(event, listener);
	};

	private dispatch = async (event: string, wager: Wager) => {
		const listener = this._events.get(event);
		if (!listener) throw new LocaleError('error.lurker.no_listener');
		Loggers.get(this.guildId).info(
			`Lurker ${this.guildId} : GameId ${wager.gameData.platformId}_${wager.gameId} EVENT - "${event}" triggered`
		);
		await listener(wager);
		this.save();
	};

	getWager = (gameId: number): Wager | undefined => {
		return this._wagerList.get(gameId);
	};

	setBet = async (
		gameId: number,
		userId: string,
		amount: number,
		side: Side
	): Promise<string> => {
		const wager = this._wagerList.get(gameId);
		if (!wager) throw new LocaleError('error.lurker.no_wage_on_gameId');
		const currentScore = this.scoreBoard.get(userId);
		if (!currentScore) throw new LocaleError('error.lurker.cannot_wager');
		if (currentScore < amount)
			throw new LocaleError('error.lurker.cannot_wager_amount');
		const betText = wager.bet(userId, amount, side);
		this.scoreBoard.set(userId, currentScore - amount);
		Loggers.get(this.guildId).info(
			`Lurker ${this.guildId} : GameId ${wager.gameData.platformId}_${wager.gameId} IN PROGRESS - Discord user ${userId} has bet ${amount} for ${sideToShortText(side)}`
		);
		await this.dispatch('updateWager', wager);
		return betText;
	};

	addSummoner = async (
		summonerName: string | null,
		summonerRegion: SpecificRegion,
		byPassSave: boolean = false
	) => {
		if (!summonerName) throw new LocaleError('error.lurker.no_summoner');
		const summ = this._riotApi.cleanupSummonerName(
			summonerName,
			summonerRegion
		);
		const exactSumm = this._summoners.findIndex(
			(s) =>
				s.gameName === summ.gameName &&
				s.tagLine === summ.tagLine &&
				s.region === summ.region
		);
		if (exactSumm !== -1) throw new LocaleError('error.lurker.summoner_exists');
		const summFromOnline = await this._riotApi.getSummonerInfo(
			summ,
			summonerRegion
		);
		if (!summFromOnline) {
			this.removeSummoner(summonerName, summonerRegion);
			Loggers.get(this.guildId).info(
				`Lurker ${this.guildId} : Can't retrive summoner from Riot API, deleted if already existed`
			);
			return;
		}
		const compSumm = await this._opggApi.getSummonerInfo(summFromOnline);
		if (!compSumm) throw new LocaleError('error.opgg.no_summoner');
		Loggers.get(this.guildId).info(
			`Lurker ${this.guildId} : Adding ${compSumm.wholeGameName} to checkList`
		);
		this._summoners.push(compSumm);
		if (!byPassSave) this.save();
	};

	addSummoners = async (
		summoners: { wholeGameName: string; region: SpecificRegion }[],
		byPassSave: boolean = false
	) => {
		for (const summoner of summoners) {
			try {
				await this.addSummoner(
					summoner.wholeGameName,
					summoner.region,
					byPassSave
				);
			} catch (e) {
				Loggers.get().error(
					`Cannot add this summoner : ${summoner.wholeGameName} : ${e}`
				);
			}
		}
	};

	getSummoners = (): string => {
		return this._summoners.map((s) => `${s.wholeGameName}`).join(', ');
	};

	buildEmbedScoreboard = async (client: Client): Promise<EmbedBuilder> => {
		const fields: APIEmbedField[] = [];
		const medals: string[] = ['🥇', '🥈', '🥉'];
		const scoreboard = [];
		for (const [key, value] of this.scoreBoard) {
			const discordUser = await client.users.fetch(key);
			scoreboard.push({ user: discordUser, amount: value });
		}
		scoreboard.sort((a, b) => b.amount - a.amount);
		for (const [i, score] of scoreboard.entries()) {
			const medal = medals[i];
			if (medal) {
				fields.push({ name: medal, value: ' ', inline: true });
				fields.push({
					name: `${score.user.displayName}`,
					value: `${score.amount} ${CONFIG.CURRENCY}`,
					inline: true,
				});
				fields.push({ name: ' ', value: ' ', inline: true });
			} else {
				fields.push({
					name: `${score.user.displayName}`,
					value: `${score.amount} ${CONFIG.CURRENCY}`,
					inline: true,
				});
			}
		}

		const embed = new EmbedBuilder()
			.setTitle('Scoreboard :')
			.setAuthor({ name: 'LoLGambleBot' })
			.addFields(fields);

		return embed;
	};

	distributeReward = (wager: Wager) => {
		if (wager.payouts) return;
		const payouts = wager.close();
		for (const payout of payouts) {
			if (this.scoreBoard.has(payout.userId)) {
				const score = this.scoreBoard.get(payout.userId) ?? 0;
				this.scoreBoard.set(payout.userId, Math.trunc(score + payout.amount));
			}
		}
		this.save();
		this._wagerList.delete(wager.gameId);
	};

	checkScore = (userId: string): number => {
		let score = this.scoreBoard.get(userId);
		if (!score) {
			if (score === 0) {
				score = 1;
			} else {
				score = CONFIG.START_AMOUNT;
			}
			this.scoreBoard.set(userId, score);
		}
		return score;
	};

	removeSummoner = (
		summonerName: string | null,
		summonerRegion: SpecificRegion
	) => {
		if (!summonerName) throw new LocaleError('error.lurker.no_summoner');
		const summ = this._riotApi.cleanupSummonerName(
			summonerName,
			summonerRegion
		);
		const exactSumm = this._summoners.findIndex(
			(s) =>
				s.gameName === summ.gameName &&
				s.tagLine === summ.tagLine &&
				s.region === summ.region
		);
		if (exactSumm === -1) {
			Loggers.get(this.guildId).info(
				`Lurker ${this.guildId} : Summoner ${summ.wholeGameName} is not present in the check list`
			);
			return;
		}
		this._summoners.splice(exactSumm, 1);
		Loggers.get(this.guildId).info(
			`Lurker ${this.guildId} : Removing ${summ.wholeGameName} to checkList`
		);
		this.save();
	};

	checkWagersGame = async () => {
		if (!this.channelId) return;
		if (this.status !== LurkerStatus.RUNNING) return;
		Loggers.get(this.guildId).info(
			`Lurker ${this.guildId} : Checking if one of ${this._wagerList.size} wagers ended`
		);
		for (const [, wager] of this._wagerList) {
			const outcome = await this._riotApi.getFinishedGame(
				wager.region,
				wager.completeGameId
			);
			if (!outcome) return; // Game is not finished
			wager.isGameFinished = true;
			wager.outcome = outcome;
			this.distributeReward(wager);
			await this.dispatch('endedWager', wager);
			Loggers.get(this.guildId).info(
				`Lurker ${this.guildId} : GameId ${wager.completeGameId} ENDED at ${new Date(wager.gameData.gameStartTime + outcome.matchData.info.gameDuration).toLocaleString()}`
			);
		}
	};

	checkSummonersGame = async () => {
		if (!this.channelId) return;
		if (this.status !== LurkerStatus.RUNNING) return;
		const notInGameSummoner = this._summoners.filter((s) => !s.currentWager);
		Loggers.get(this.guildId).info(
			`Lurker ${this.guildId} : Checking if one of ${notInGameSummoner.length} summoners that are not already in games are playing`
		);
		for (const summoner of notInGameSummoner) {
			try {
				const currentGame = await this._riotApi.getCurrentGame(summoner);
				if (currentGame) {
					Loggers.get(this.guildId).info(
						`Lurker ${this.guildId} : Game Found => ${currentGame.gameId}`
					);

					// Skip this game if already bet is created
					const alreadyListedWager = this._wagerList.get(currentGame.gameId);
					if (alreadyListedWager) return;

					const newWager = new Wager({
						gameData: currentGame,
						participants: [],
					});

					Loggers.get(this.guildId).info(
						`Lurker ${this.guildId} : GameId ${newWager.completeGameId} STARTED at ${new Date(currentGame.gameStartTime).toLocaleString()}`
					);
					await this.setParticipantsInfo(currentGame.participants, newWager);

					this._wagerList.set(currentGame.gameId, newWager);
					await this.dispatch('newWager', newWager);
					newWager.start(async () => {
						await this.dispatch('lockedWager', newWager);
					});

					Loggers.get(this.guildId).info(`Lurker ${this.guildId} :`);
				}
			} catch (e: any) {
				Loggers.get(this.guildId).error(e, e.stack);
			}
		}
	};

	private setParticipantsInfo = async (
		participants: RiotParticipant[],
		wager: Wager
	) => {
		for (const participant of participants) {
			const participatingSummoner = this._summoners.find(
				(s) => s.puuid === participant.puuid
			);
			if (!participatingSummoner) continue; //This summoner is not in checklist
			participatingSummoner.currentWager = wager;

			const summChampion = this._championList.find(
				(c) => c.id === participant.championId
			);
			if (!summChampion) continue; // Cannot find summoner's current champion

			const winrate = await this._opggApi.getWinrateByGameType(
				participatingSummoner,
				gameModeToType(wager.gameData.gameMode),
				summChampion
			);

			const newParticipant = new Participant({
				summoner: participatingSummoner,
				champion: summChampion,
				opggWinrate: winrate,
				side: participant.teamId,
			});

			wager.participants.push(newParticipant);
			Loggers.get(this.guildId).info(
				`Lurker ${this.guildId} : GameId ${wager.completeGameId} IN PROGRESS - Summoner "${participatingSummoner.wholeGameName}" is playing : ${summChampion.id} - ${summChampion.name}`
			);
		}
	};

	restoreWager = async (wagerSave: WagerSave) => {
		if (!wagerSave?.messageId) return;
		const now = Date.now();
		const newWager = new Wager({
			messageId: wagerSave.messageId,
			participants: [],
			gameData: new RiotGameData({
				gameLength: Math.trunc((now - wagerSave.gameData.gameStartTime) / 1000),
				gameMode: wagerSave.gameData.gameMode,
				gameStartTime: wagerSave.gameData.gameStartTime,
				gameId: wagerSave.gameData.gameId,
				platformId: wagerSave.gameData.platformId,
			}),
		});
		Loggers.get(this.guildId).info(
			`Lurker ${this.guildId} : GameId ${newWager.completeGameId} RESTORING from save file`
		);
		const riotParticipants = [];
		for (const participant of wagerSave.participants) {
			riotParticipants.push(
				new RiotParticipant({
					puuid: participant.puuid,
					teamId: participant.teamId,
					championId: participant.championId,
				})
			);
		}
		await this.setParticipantsInfo(riotParticipants, newWager);
		for (const bettor of wagerSave.bettors) {
			newWager.bet(bettor.userId, bettor.amount, bettor.side);
		}
		this._wagerList.set(newWager.gameId, newWager);
		await this.dispatch('restoreWager', newWager);
		newWager.start(async () => {
			await this.dispatch('lockedWager', newWager);
		});
	};

	stop = () => {
		this.channelId = null;
		this.status = LurkerStatus.STOPPED;
		this.save();
	};

	start = async (channelId: string | null, fromSave?: Save) => {
		this.channelId = channelId;
		if (this.status === LurkerStatus.RUNNING)
			throw new LocaleError('error.lurker.lurker_running');

		if (fromSave) {
			Loggers.get(this.guildId).info(
				`Lurker ${this.guildId} : Restoring lurker data from save`
			);
			await this.addSummoners(fromSave.summoners, true);
			if (fromSave?.scoreboard)
				for (const score of fromSave.scoreboard) {
					this.scoreBoard.set(score.userId, score.amount);
				}
			if (fromSave?.inProgressWagers)
				for (const wagerSave of fromSave.inProgressWagers) {
					await this.restoreWager(wagerSave);
				}
		}

		Loggers.get(this.guildId).info(`Lurker ${this.guildId} :`);
		Loggers.get(this.guildId).info(
			this._summoners.map((s) => s.wholeGameName).join(', ')
		);
		await this.checkSummonersGame();
		setInterval(async () => {
			Loggers.get(this.guildId).info(
				`Lurker ${this.guildId} : Scheduled Check`
			);
			await this.checkSummonersGame();
			await this.checkWagersGame();
		}, 1000 * CONFIG.CHECK_INTERVAL);

		this.status = LurkerStatus.RUNNING;
		this.save();
	};

	private save = (): Save => {
		const flatScoreboard = [];
		for (const [key, element] of this.scoreBoard) {
			flatScoreboard.push({ userId: key, amount: element });
		}
		// Form wager data to be saved
		const wagers = [];
		for (const [, wager] of this._wagerList) {
			const bettors = [];
			for (const [key, bettor] of wager.bettors) {
				bettors.push({
					userId: key,
					amount: bettor.amount,
					side: bettor.side,
				});
			}
			if (wager?.message?.id)
				wagers.push(
					new WagerSave({
						messageId: wager?.message?.id,
						bettors: bettors,
						gameData: {
							gameId: wager.gameId,
							platformId: wager.gameData.platformId,
							region: wager.region,
							gameMode: wager.gameData.gameMode,
							gameStartTime: wager.gameData.gameStartTime,
						},
						participants: wager.participants.map((p) => {
							return {
								puuid: p.summoner.puuid,
								teamId: p.side,
								championId: p.champion.id,
							};
						}),
					})
				);
		}
		const save = new Save({
			guildId: this.guildId,
			channelId: this.channelId,
			status: this.status,
			summoners: this._summoners.map((s) => {
				return {
					wholeGameName: s.wholeGameName,
					region: s.region,
				};
			}),
			inProgressWagers: wagers,
			scoreboard: flatScoreboard,
		});
		fs.writeFileSync(
			`${CONFIG.SAVED_DATA_PATH}/${this.guildId}.json`,
			JSON.stringify(save)
		);
		Loggers.get(this.guildId).info(
			`Lurker ${this.guildId} : Saved data on ${CONFIG.SAVED_DATA_PATH}/${this.guildId}.json`
		);
		return save;
	};
}
