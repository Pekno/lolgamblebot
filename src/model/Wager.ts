import {
	ActionRowBuilder,
	APIEmbedField,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	Message,
} from 'discord.js';
import { CONFIG } from '../config/config';
import { OutCome } from './OutCome';
import { RiotGameData } from './RiotModels';
import { Participant } from './Participant';
import { Payout } from './Payout';
import { Bet } from './Bet';
import { Side, sideToShortText, sideToText } from '../enum/Side';
import { SpecificRegion } from '../enum/SpecificRegion';
import { gameModeToType } from '../enum/GameType';
import i18n from 'i18n';
import { endTypeToText } from '../enum/EndType';

export class Wager {
	gameData: RiotGameData;
	participants: Participant[] = [];
	isGameFinished: boolean = false;
	isWagerLocked: boolean = false;
	outcome: OutCome;
	_message: Message;
	messageId: string;
	payouts: Payout[];
	bettors: Map<string, Bet> = new Map<string, Bet>();

	set message(message: Message) {
		this._message = message;
		this.messageId = message.id;
	}

	get message(): Message {
		return this._message;
	}

	private _lockDelay: NodeJS.Timeout;

	get region(): SpecificRegion {
		return this.participants[0].summoner.region;
	}

	get pot(): number {
		let total = 0;
		for (const [, bet] of this.bettors) {
			total += bet.amount;
		}
		return total;
	}

	get gameId(): number {
		return this.gameData.gameId;
	}

	get completeGameId(): string {
		return `${this.gameData.platformId}_${this.gameData.gameId}`;
	}

	get opggWinrate(): number {
		return (
			this.participants.reduce((acc, current) => acc + current.opggWinrate, 0) /
			this.participants.length
		);
	}

	start = (event: () => void) => {
		const timePassed =
			CONFIG.TIME_BEFORE_BET_LOCK - Math.abs(this.gameData.gameLength);

		// If game is already started
		if (timePassed <= 0) {
			this.isWagerLocked = true;
			event();
			return;
		}

		// if game is new
		const resetInterval = timePassed * 1000;
		this._lockDelay = setTimeout(() => {
			this.isWagerLocked = true;
			event();
			clearInterval(this._lockDelay);
		}, resetInterval);
	};

	bet = (userId: string, amount: number, side: Side): string => {
		if (this.bettors.get(userId)) return `You have already bet on this game`;
		this.bettors.set(
			userId,
			new Bet({
				side: side,
				amount: amount,
			})
		);
		return `You have bet ${amount} ${CONFIG.CURRENCY} on ${sideToText(side)} side, good luck 🤞`;
	};

	close = () => {
		const odds = this.calculateOdds();
		this.payouts = this.getPayouts(odds);
		for (const participant of this.participants) {
			participant.summoner.currentWager = null;
		}
		return this.payouts;
	};

	private calculateOdds = (): [number, number] => {
		const total: any = {};
		total[Side.BLUE] = 0;
		total[Side.RED] = 0;
		const winrate = Math.max(0.01, Math.min(this.opggWinrate, 99.99));

		for (const [, bet] of this.bettors) {
			total[bet.side] = bet.amount;
		}
		if (total[Side.BLUE] === 0) total[Side.BLUE] = 1;
		if (total[Side.RED] === 0) total[Side.RED] = 1;

		const blueWinProbability =
			this.participants[0].side === Side.BLUE ? winrate : 1 - winrate;
		const redWinProbability = 1 - blueWinProbability;

		const blueOdds = 1 / blueWinProbability;
		const redOdds = 1 / redWinProbability;

		const totalBets = total[Side.BLUE] + total[Side.RED];
		const blueBetFraction = total[Side.BLUE] / totalBets;
		const redBetFraction = total[Side.RED] / totalBets;

		const adjustedBlueOdds = Math.min(blueOdds * (1 + redBetFraction), 3);
		const adjustedRedOdds = Math.min(redOdds * (1 + blueBetFraction), 3);

		return [adjustedRedOdds, adjustedBlueOdds];
	};

	private getPayouts = (odds: [number, number]): Payout[] => {
		const winningSide = this.outcome.victorySide;
		const payouts: Payout[] = [];
		for (const [userId, bet] of this.bettors) {
			if (bet.side === winningSide) {
				const payout =
					bet.amount * (winningSide === Side.RED ? odds[0] : odds[1]);
				payouts.push({ userId: userId, amount: Math.trunc(payout) });
			} else {
				payouts.push({ userId: userId, amount: 0 });
			}
		}
		return payouts;
	};

	private formatDuration = (seconds: number): string => {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;

		const formattedMinutes = String(minutes).padStart(2, '0');
		const formattedSeconds = String(remainingSeconds).padStart(2, '0');

		return `${formattedMinutes}:${formattedSeconds}`;
	};

	buildButton = (): ActionRowBuilder<ButtonBuilder> => {
		const total: any = {};
		total[Side.BLUE] = 0;
		total[Side.RED] = 0;
		for (const [, bet] of this.bettors) {
			total[bet.side] = bet.amount;
		}

		const blueSide = new ButtonBuilder()
			.setCustomId(`bet;${Side.BLUE};${this.gameId}`)
			.setLabel(
				`${i18n.__('display.side.blue_side')} | ${total[Side.BLUE]} ${CONFIG.CURRENCY}`
			)
			.setStyle(ButtonStyle.Primary)
			.setDisabled(this.isWagerLocked);

		const redSide = new ButtonBuilder()
			.setCustomId(`bet;${Side.RED};${this.gameId}`)
			.setLabel(
				`${i18n.__('display.side.red_side')} | ${total[Side.RED]} ${CONFIG.CURRENCY}`
			)
			.setStyle(ButtonStyle.Danger)
			.setDisabled(this.isWagerLocked);

		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			blueSide,
			redSide
		);
	};

	buildEmbed = (): EmbedBuilder => {
		const fields: APIEmbedField[] = [];
		for (const p of this.participants) {
			let minionStats = ' ';
			let kdaStats = ' ';
			if (this.isGameFinished && this.outcome) {
				const stats = this.outcome.matchData.info.participants.find(
					(part) => part.puuid === p.summoner.puuid
				);
				if (stats) {
					minionStats = `${stats.totalMinionsKilled} ${i18n.__('display.wager.creeps')}`;
					kdaStats = `${stats.kills}/${stats.deaths}/${stats.assists}`;
				}
			}

			fields.push({
				name: `${p.summoner.wholeGameName}`,
				value: `${p.champion.name} - ${sideToShortText(p.side)}`,
				inline: true,
			});
			fields.push({
				name: i18n.__('display.wager.winrate'),
				value: `${(p.opggWinrate * 100).toFixed(2)}%`,
				inline: true,
			});
			fields.push({ name: kdaStats, value: minionStats, inline: true });
		}

		let title = this.isWagerLocked ? '🔒' : '🔓';
		title += ' ';
		let endText = '';
		let url;
		const region = this.participants[0].summoner.region
			.toString()
			.replace(/[0-9]*/g, '');
		if (this.isGameFinished && this.outcome) {
			title += `${i18n.__('display.wager.game_ended')}${endTypeToText(this.outcome.endType)} - ${i18n.__('display.wager.duration')} : ${this.formatDuration(this.outcome.matchData.info.gameDuration)}`;
			endText += `${i18n.__('display.wager.victory_from')} : **${sideToText(this.outcome.victorySide)}**`;
			url = `https://www.leagueofgraphs.com/match/${region.toLocaleLowerCase()}/${this.gameId}`;
		} else {
			title += `${i18n.__('display.wager.game_started')} ${new Date(this.gameData.gameStartTime).toLocaleString()}`;
			endText += `${i18n.__('display.wager.who_win')}`;
			url = `https://porofessor.gg/live/${region.toLocaleLowerCase()}/${this.participants[0].summoner.gameName.replace(/ /g, '+')}-${this.participants[0].summoner.tagLine.replace(/ /g, '+')}`;
		}

		const odds = this.calculateOdds();

		const embed = new EmbedBuilder()
			.setColor(this.participants[0].side === Side.BLUE ? 0x566bef : 0xd53b3e)
			.setTitle(title)
			.setThumbnail(this.participants[0].champion.image_url)
			.setDescription(
				`${i18n.__(`display.wager.gametype.${gameModeToType(this.gameData.gameMode)}`)} - _${this.completeGameId}_\n~ ${i18n.__('display.wager.known_participants')} :`
			)
			.setAuthor({ name: 'LoLGambleBot' })
			.addFields(fields)
			.addFields({ name: '\u200B', value: '\u200B' })
			.addFields({
				name: `${sideToText(Side.RED)} vs ${sideToText(Side.BLUE)}`,
				value: `-> ${odds[1].toFixed(2)} : ${odds[0].toFixed(2)} <-`,
				inline: true,
			})
			.addFields({
				name: `${i18n.__('display.side.pot')} :`,
				value: `${this.pot} ${CONFIG.CURRENCY}`,
				inline: true,
			})
			.addFields({ name: endText, value: ' ' })
			.setURL(url);

		return embed;
	};

	public constructor(init?: Partial<Wager>) {
		Object.assign(this, init);
	}
}
