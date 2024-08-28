import { ActionRowBuilder, APIEmbed, APIEmbedField, ButtonBuilder, ButtonStyle, EmbedBuilder, JSONEncodable, Message } from "discord.js";
import { CONFIG } from "../config/config";
import { OutCome } from "./OutCome";
import { RiotGameData } from "./RiotModels";
import { Participant } from "./Participant";
import { Payout } from "./Payout";
import { Bet } from "./Bet";
import { Side, sideToShortText, sideToText } from "../enum/Side";
import { SpecificRegion } from "../enum/SpecificRegion";
import { gameModeToType } from "../enum/GameType";
import { Logger } from "../services/PinoLogger";

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

    get message(): Message{
        return this._message;
    }

    private _lockDelay: NodeJS.Timeout;

    get region(): SpecificRegion {
        return this.participants[0].summoner.region
    }

    get pot(): number {
        let total = 0;
        for (const [userId, bet] of this.bettors) {
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
        return this.participants.reduce((acc, current) => acc + current.opggWinrate, 0) / this.participants.length;
    }

    start = (event: () => void) => {
        const timePassed = CONFIG.TIME_BEFORE_BET_LOCK - (this.gameData.gameLength)

        // If game is already started
        if(timePassed <= 0){
            this.isWagerLocked = true;
            return;
        }

        // if game is new
        const resetInterval = timePassed * 1000;
        this._lockDelay = setInterval(() => {
            this.isWagerLocked = true;
            event();
            clearInterval(this._lockDelay)
        }, resetInterval);
    }

    bet = (userId: string, amount: number, side: Side) : string => {
        if(this.bettors.get(userId)) throw new Error("This user already betted on this game");
        this.bettors.set(userId, new Bet({
            side: side,
            amount: amount
        }));
        return `You have bet ${amount} ${CONFIG.CURRENCY} on ${sideToText(side)} side, good luck 🤞`
    }

    close = () => {
        const odds = this.calculateOdds();
        this.payouts = this.getPayouts(odds);
        for (const participant of this.participants) {
            participant.summoner.currentWager = null;
        }
        return this.payouts;
    }

    private calculateOdds = (): [number, number] => {
        let total : any = {};
        total[Side.BLUE] = 0;
        total[Side.RED] = 0;
        let winrate = Math.max(0.01, Math.min(this.opggWinrate, 99.99));
      
        for (const [userId, bet] of this.bettors) {
            total[bet.side] = bet.amount;
        }
        if(total[Side.BLUE] === 0) total[Side.BLUE] = 1;
        if(total[Side.RED] === 0) total[Side.RED] = 1;
      
        const blueWinProbability = this.participants[0].side === Side.BLUE ? winrate : 1 - winrate;
        const redWinProbability = 1 - blueWinProbability;
      
        const blueOdds = 1 / blueWinProbability;
        const redOdds = 1 / redWinProbability;
      
        const totalBets = total[Side.BLUE] + total[Side.RED];
        const blueBetFraction = total[Side.BLUE] / totalBets;
        const redBetFraction = total[Side.RED] / totalBets;
      
        const adjustedBlueOdds = blueOdds * (1 + redBetFraction);
        const adjustedRedOdds = redOdds * (1 + blueBetFraction);
      
        return [adjustedRedOdds, adjustedBlueOdds]
    }

    private getPayouts = (odds: [number, number]): Payout[] => {
        const winningSide = this.outcome.victorySide;
        if(!winningSide) throw new Error("Can't distribute reward because of a missing winning side")
        const payouts : Payout[] = [] 
        for (const [userId, bet] of this.bettors) {
            if (bet.side === winningSide) {
                const payout = bet.amount * (winningSide === Side.RED ? odds[0] : odds[1]);
                payouts.push({ userId: userId, amount: Math.trunc(payout) });
            } else {
                payouts.push({ userId: userId, amount: 0 });
            }
        }
        return payouts;
    }

    private formatDuration = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(remainingSeconds).padStart(2, '0');
        
        return `${formattedMinutes}:${formattedSeconds}`;
    }

    buildButton = () : ActionRowBuilder<ButtonBuilder> => {
        let total : any = {};
        total[Side.BLUE] = 0;
        total[Side.RED] = 0;
        for (const [userId, bet] of this.bettors) {
            total[bet.side] = bet.amount;
        }

        const blueSide = new ButtonBuilder()
			.setCustomId(`blueside_${this.gameId}`)
			.setLabel(`Blue Side | ${total[Side.BLUE]} ${CONFIG.CURRENCY}`)
			.setStyle(ButtonStyle.Primary)
            .setDisabled(this.isWagerLocked);

		const redSide = new ButtonBuilder()
			.setCustomId(`redside_${this.gameId}`)
			.setLabel(`Red Side | ${total[Side.RED]} ${CONFIG.CURRENCY}`)
			.setStyle(ButtonStyle.Danger)
            .setDisabled(this.isWagerLocked);
        
        return new ActionRowBuilder<ButtonBuilder>()
			.addComponents(blueSide, redSide);
    }

    buildEmbed = () : EmbedBuilder => {
        const fields : APIEmbedField[] = [];
        for(const p of this.participants) {
            let minionStats = " "
            let kdaStats = " "
            if(this.isGameFinished && this.outcome){
                let stats = this.outcome.matchData.info.participants.find(part => part.puuid === p.summoner.puuid)
                if(stats){
                    minionStats = `${stats.totalMinionsKilled} cs`
                    kdaStats = `${stats.kills}/${stats.deaths}/${stats.assists}`
                }
            }

            fields.push({ name: `${p.summoner.wholeGameName}`, value: `${p.champion.name} - ${sideToShortText(p.side)}`, inline: true })
            fields.push({ name: 'Winrate', value: `${(p.opggWinrate*100).toFixed(2)}%`, inline: true})
            fields.push({ name: kdaStats, value: minionStats, inline: true})
        }

        let title = this.isWagerLocked ? "🔒" : "🔓";
        title += " ";
        let endText = ""
        let url;
        const region = this.participants[0].summoner.region.toString().replace(/[0-9]*/g, '')
        if(this.isGameFinished && this.outcome){
            title += `Game Ended - Duration : ${this.formatDuration(this.outcome.matchData.info.gameDuration)}`
            endText += `Victory from : **${sideToText(this.outcome.victorySide)}** side`;
            url = `https://www.leagueofgraphs.com/match/${region.toLocaleLowerCase()}/${this.gameId}`
        }else{
            title += `Game Started at ${new Date(this.gameData.gameStartTime).toLocaleString()}`
            endText += `Who's gonna win ?`;
            url = `https://porofessor.gg/live/${region.toLocaleLowerCase()}/${this.participants[0].summoner.gameName.replace(/ /g, '+')}-${this.participants[0].summoner.tagLine.replace(/ /g, '+')}`
        }

        let odds = this.calculateOdds()

        let embed = new EmbedBuilder()
            .setColor(this.participants[0].side === Side.BLUE ?  0x566BEF : 0xD53B3E)
            .setTitle(title)
            .setThumbnail(this.participants[0].champion.image_url)
            .setDescription(`${gameModeToType(this.gameData.gameMode)}\n~ Known participants :`)
            .setAuthor({ name: 'LoLGambleBot' })
            .addFields(fields)
            .addFields({ name: '\u200B', value: '\u200B' })
            .addFields({ name: `RED vs BLUE`, value: `-> ${odds[1].toFixed(2)} : ${odds[0].toFixed(2)} <-`, inline: true })
            .addFields({ name: `POT :`, value: `${this.pot} ${CONFIG.CURRENCY}` , inline: true})
            .addFields({ name: endText, value: ' ' })
            .setURL(url)
            //.setTimestamp()
            //.setFooter({ text: 'Made by LoLGambleBot' });
        
        return embed;
    }

    public constructor(init?: Partial<Wager>) {
        Object.assign(this, init);
    }
}