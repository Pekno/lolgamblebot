import { CONFIG } from "../config/config";
import { Participant } from "../model/Participant";
import { OPGGApi } from "../api/OPGGApi";
import { RiotAPI } from "../api/RiotApi";
import { Save, WagerSave } from "../model/Save";
import fs from "fs";
import { APIEmbedField, Client, EmbedBuilder, userMention } from "discord.js";
import { RiotChampion, RiotGameData, RiotParticipant } from "../model/RiotModels";
import { Wager } from "../model/Wager";
import { Summoner } from "../model/Summoner";
import { Side, sideToShortText } from "../enum/Side";
import { SpecificRegion } from "../enum/SpecificRegion";
import { LurkerStatus } from "../enum/LurkerStatus";
import { Logger } from "./PinoLogger";
import { gameModeToType, GameType } from "../enum/GameType";

export class Lurker {
    private _wagerList: Map<number, Wager> = new Map<number, Wager>();
    scoreBoard: Map<string, number> = new Map<string, number>();
    guildId: string;
    channelId: string | null;
    status: LurkerStatus = LurkerStatus.CREATED;
    private _summoners: Summoner[] = []
    private _riotApi: RiotAPI;
    private _opggApi: OPGGApi;
    private _championList: RiotChampion[];
    private _events: Map<string, (wager: Wager) => Promise<void>> = new Map<string, (wager: Wager) => Promise<void>>();

    constructor(guildId: string, riotApi: RiotAPI, opggApi: OPGGApi, championList: RiotChampion[]){
        this.guildId = guildId;
        this._riotApi = riotApi;
        this._opggApi = opggApi;
        this._championList = championList;
    }

    on = (event: string, listener: (wager: Wager) => Promise<void>) => {
        this._events.set(event, listener)
    }

    private dispatch = async (event: string, wager: Wager) => {
        let listener = this._events.get(event);
        if(!listener) throw new Error('Listener not registered');
        Logger.info(`Lurker ${this.guildId} : GameId ${wager.gameData.platformId}_${wager.gameId} EVENT - "${event}" triggered`)
        this.save();
        await listener(wager);
    }

    getWager = (gameId: number) : Wager | undefined => {
        return this._wagerList.get(gameId);
    }

    setBet = async (gameId: number, userId: string, amount: number, side: Side) : Promise<string> => {
        let wager = this._wagerList.get(gameId);
        if(!wager) throw new Error("No wager was found on this GameId");
        let currentScore = this.scoreBoard.get(userId);
        if(!currentScore) throw new Error("This user can't wager");
        if(currentScore < amount) throw new Error("You can't wager more than you own");
        const betText = wager.bet(userId, amount, side);
        this.scoreBoard.set(userId, currentScore - amount);
        Logger.info(`Lurker ${this.guildId} : GameId ${wager.gameData.platformId}_${wager.gameId} IN PROGRESS - Discord user ${userId} has bet ${amount} for ${sideToShortText(side)}`)
        await this.dispatch('updateWager', wager);
        return betText;
    }
 
    addSummoner = async (summonerName: string | null, summonerRegion: SpecificRegion, byPassSave: boolean = false) : Promise<Summoner> => {
        if(!summonerName) throw new Error('No summoner name given');
        let summ = this._riotApi.cleanupSummonerName(summonerName, summonerRegion);
        let exactSumm = this._summoners.findIndex(s => s.gameName === summ.gameName && s.tagLine === summ.tagLine && s.region === summ.region);
        if(exactSumm !== -1) throw new Error('Summoner already added');
        summ = await this._riotApi.getSummonerInfo(summ, summonerRegion);
        if(!summ) throw new Error('Can`t retrive summoner from Riot API');
        const compSumm = await this._opggApi.getSummonerInfo(summ)
        if(!compSumm) throw new Error('Can`t retrive summoner from OPGG API');
        Logger.info(`Lurker ${this.guildId} : Adding ${compSumm.wholeGameName} to checkList`);
        this._summoners.push(compSumm);
        if(!byPassSave) this.save();
        return compSumm;
    }

    addSummoners = async (summoners: {wholeGameName: string, region: SpecificRegion}[], byPassSave: boolean = false): Promise<Summoner[]> => {
        return Promise.all(summoners.map(snms => this.addSummoner(snms.wholeGameName, snms.region, byPassSave)))
    }

    getSummoners = (): string => {
        return this._summoners.map(s => `${s.wholeGameName}`).join(', ')
    }

    buildEmbedScoreboard = async (client: Client) : Promise<EmbedBuilder> => {
        const fields : APIEmbedField[] = [];
        const medals : string[] = ['🥇', '🥈', '🥉']
        const scoreboard = [];
        for(const [key, value] of this.scoreBoard) {
            let discordUser = await client.users.fetch(key)
            scoreboard.push({user: discordUser, amount: value})
        }
        scoreboard.sort((a, b) => b.amount - a.amount);
        for (const [i, score] of scoreboard.entries()) {
            const medal = medals[i];
            if(medal){
                fields.push({ name: medal, value: ' ', inline: true})
                fields.push({ name: `${score.user.displayName}`, value: `${score.amount} ${CONFIG.CURRENCY}`, inline: true })
                fields.push({ name: ' ', value: ' ', inline: true})
            }else{
                fields.push({ name: `${score.user.displayName}`, value: `${score.amount} ${CONFIG.CURRENCY}`, inline: true })
            }
        }

        let embed = new EmbedBuilder()            
        .setTitle('Scoreboard :')
        .setAuthor({ name: 'LoLGambleBot' })
        .addFields(fields);

        return embed;
    }

    distributeReward = (wager: Wager) => {
        if(wager.payouts) return;
        let payouts = wager.close();
        for (const payout of payouts) {
            if(this.scoreBoard.has(payout.userId)){
                let score = this.scoreBoard.get(payout.userId) ?? 0;
                this.scoreBoard.set(payout.userId, Math.trunc(score + payout.amount));
            }
        }
        this.save();
        this._wagerList.delete(wager.gameId);
    }

    checkScore = (userId: string): number => {
        let score = this.scoreBoard.get(userId);
        if(!score){
            if(score === 0){
                score = 1;
            }else{
                score = CONFIG.START_AMOUNT;
            }
            this.scoreBoard.set(userId, score);
        }
        return score;
    }

    removeSummoner = (summonerName: string | null, summonerRegion: SpecificRegion) => {
        if(!summonerName) throw new Error('No summoner name given');
        let summ = this._riotApi.cleanupSummonerName(summonerName, summonerRegion);
        let exactSumm = this._summoners.findIndex(s => s.gameName === summ.gameName && s.tagLine === summ.tagLine && s.region === summ.region);
        if(exactSumm === -1) throw new Error('Summoner is not present in the check list');
        this._summoners.splice(exactSumm, 1);
        Logger.info(`Lurker ${this.guildId} : Removing ${summ.wholeGameName} to checkList`)
        this.save();
    }

    checkWagersGame = async () => {
        if(!this.channelId) return;
        if(this.status !== LurkerStatus.RUNNING) return;
        Logger.debug(`Lurker ${this.guildId} : Checking if one of ${this._wagerList.size} wagers ended`);
        for (const [gameId, wager] of this._wagerList) {
            let outcome = await this._riotApi.getFinishedGame(wager.region, wager.completeGameId);
            if(!outcome) return; // Game is not finished
            wager.isGameFinished = true;
            wager.outcome = outcome;
            this.distributeReward(wager);
            await this.dispatch('endedWager', wager);
            Logger.info(`Lurker ${this.guildId} : GameId ${wager.completeGameId} ENDED at ${new Date(wager.gameData.gameStartTime + outcome.matchData.info.gameDuration).toLocaleString()}`)
        }
    }

    checkSummonersGame = async () => {
        if(!this.channelId) return;
        if(this.status !== LurkerStatus.RUNNING) return;
        const notInGameSummoner = this._summoners.filter(s => !s.currentWager);
        Logger.debug(`Lurker ${this.guildId} : Checking if one of ${notInGameSummoner.length} summoners that are not already in games are playing`);
        for (const summoner of notInGameSummoner) {
            try{
                let currentGame = await this._riotApi.getCurrentGame(summoner);
                if(currentGame){
                    Logger.debug(`Lurker ${this.guildId} :`)
                    Logger.debug(currentGame)

                    // Skip this game if already bet is created
                    let alreadyListedWager = this._wagerList.get(currentGame.gameId);
                    if(alreadyListedWager) return;

                    let newWager = new Wager({
                        gameData: currentGame,
                        participants: []
                    });

                    Logger.info(`Lurker ${this.guildId} : GameId ${newWager.completeGameId} STARTED at ${new Date(currentGame.gameStartTime).toLocaleString()}`)
                    await this.setParticipantsInfo(currentGame.participants, newWager)

                    this._wagerList.set(currentGame.gameId, newWager);
                    await this.dispatch('newWager', newWager);
                    newWager.start(async () => {
                        await this.dispatch('lockedWager', newWager);
                    });

                    Logger.debug(`Lurker ${this.guildId} :`)
                    Logger.debug(newWager);
                }
            }catch(e){
                Logger.error(e);
            }
        }
    }

    private setParticipantsInfo = async (participants: RiotParticipant[], wager: Wager) => {
        for (const participant of participants) {
            const participatingSummoner = this._summoners.find(s => s.puuid === participant.puuid)
            if(!participatingSummoner) continue //This summoner is not in checklist
            participatingSummoner.currentWager = wager;

            let summChampion = this._championList.find(c => c.id === participant.championId);
            if(!summChampion) continue // Cannot find summoner's current champion

            let winrate = await this._opggApi.getWinrateByGameType(participatingSummoner, gameModeToType(wager.gameData.gameMode), summChampion)

            let newParticipant = new Participant({
                summoner: participatingSummoner,
                champion: summChampion,
                opggWinrate: winrate,
                side: participant.teamId
            })

            wager.participants.push(newParticipant)
            Logger.info(`Lurker ${this.guildId} : GameId ${wager.completeGameId} IN PROGRESS - Summoner "${participatingSummoner.wholeGameName}" is playing : ${summChampion.id} - ${summChampion.name}`)
        }
    }

    restoreWager = async (wagerSave: WagerSave) => {
        const now = Date.now();
        let newWager = new Wager({
            messageId: wagerSave.messageId,
            participants: [],
            gameData: new RiotGameData({
                gameLength: Math.trunc((now - wagerSave.gameData.gameStartTime)/1000),
                gameMode: wagerSave.gameData.gameMode,
                gameStartTime: wagerSave.gameData.gameStartTime,
                gameId: wagerSave.gameData.gameId,
                platformId: wagerSave.gameData.platformId
            })
        });
        Logger.info(`Lurker ${this.guildId} : GameId ${newWager.completeGameId} RESTORING from save file`)
        let riotParticipants = [];
        for (const participant of wagerSave.participants) {
            riotParticipants.push(new RiotParticipant({
                puuid: participant.puuid,
                teamId: participant.teamId,
                championId: participant.championId
            }))
        }
        await this.setParticipantsInfo(riotParticipants, newWager);
        for (const bettor of wagerSave.bettors) {
            newWager.bet(bettor.userId, bettor.amount, bettor.side)
        }
        this._wagerList.set(newWager.gameId, newWager);
        await this.dispatch('restoreWager', newWager);
        newWager.start(async () => {
            await this.dispatch('lockedWager', newWager);
        });
    }

    stop = () => {
        this.channelId = null;
        this.status = LurkerStatus.STOPPED;
        this.save();
    }

    start = async (channelId: string | null, fromSave?: Save) => {
        this.channelId = channelId;
        if(this.status === LurkerStatus.RUNNING) throw new Error("Lurker already running")

        if(fromSave){
            Logger.info(`Lurker ${this.guildId} : Restoring lurker data from save`)
            await this.addSummoners(fromSave.summoners, true)
            for (const score of fromSave.scoreboard) {
                this.scoreBoard.set(score.userId, score.amount)
            }
            for (const wagerSave of fromSave.inProgressWagers) {
                this.restoreWager(wagerSave);
            }
        }

        Logger.debug(`Lurker ${this.guildId} :`)
        Logger.debug(this._summoners)
        await this.checkSummonersGame()
        setInterval(async () => {
            await this.checkSummonersGame()
            await this.checkWagersGame()
        }, 1000 * CONFIG.CHECK_INTERVAL);

        this.status = LurkerStatus.RUNNING;
        this.save();
    }

    private save = () : Save => {
        const flatScoreboard = [];
        for (const [key, element] of this.scoreBoard) {
            flatScoreboard.push({userId: key, amount: element})
        }
        // Form wager data to be saved
        const wagers = [];
        for (const [key, wager] of this._wagerList) {
            const bettors = [];
            for (const [key, bettor] of wager.bettors) {
                bettors.push({
                    userId: key,
                    amount: bettor.amount,
                    side: bettor.side,
                });
            }
            wagers.push(new WagerSave(
                {
                    messageId: wager.message.id,
                    bettors: bettors,
                    gameData: {
                        gameId: wager.gameId,
                        platformId: wager.gameData.platformId,
                        region: wager.region,
                        gameMode: wager.gameData.gameMode,
                        gameStartTime: wager.gameData.gameStartTime
                    },
                    participants: wager.participants.map(p => { return {
                        puuid: p.summoner.puuid,
                        teamId: p.side,
                        championId: p.champion.id
                    }}),
                })
            )
        }
        const save = new Save({
            guildId: this.guildId,
            channelId: this.channelId,
            status: this.status,
            summoners: this._summoners.map(s => { return {
                wholeGameName: s.wholeGameName,
                region: s.region
            }}),
            inProgressWagers: wagers,
            scoreboard: flatScoreboard
        })
        fs.writeFileSync(`${CONFIG.SAVED_DATA_PATH}/${this.guildId}.json`, JSON.stringify(save))
        Logger.info(`Lurker ${this.guildId} : Saved data on ${CONFIG.SAVED_DATA_PATH}/${this.guildId}.json`)
        return save;
    }
}