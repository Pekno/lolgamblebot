import { ActionRowBuilder, ButtonInteraction, Client, DiscordAPIError, Events, GatewayIntentBits, ModalBuilder, REST, Routes, TextChannel, TextInputBuilder, TextInputStyle } from "discord.js";
import { CommandList } from "../model/DiscordModels";
import { Lurker } from "./Lurker";
import { CONFIG } from "../config/config";
import { RiotAPI } from "../api/RiotApi";
import { OPGGApi } from "../api/OPGGApi";
import fs from "fs";
import path from 'path';
import { Save } from "../model/Save";
import { RiotChampion } from "../model/RiotModels";
import { Side, sideToText } from "../enum/Side";
import { LurkerStatus } from "../enum/LurkerStatus";
import { Logger } from "./PinoLogger";

export class Bot{
    private _lurkers: Map<string, Lurker> = new Map<string, Lurker>();
    private _riotApi: RiotAPI;
    private _opggApi: OPGGApi;
    private _client: Client;
    private _championList: RiotChampion[] = []

    private register = async (commandList: CommandList) => {
        this._client = new Client({ intents: [GatewayIntentBits.Guilds] });
    
        if(!CONFIG.DISCORD_TOKEN) throw new Error("No Discord token configured");
        if(!CONFIG.DISCORD_ID) throw new Error("No Discord id configured");
        
        const rest = new REST({ version: '10' }).setToken(CONFIG.DISCORD_TOKEN);
        try {
            await rest.put(Routes.applicationCommands(CONFIG.DISCORD_ID), { body: commandList.build() });
            Logger.info('Bot : Successfully loaded application (/) commands.');
        } catch (e) {
            Logger.error(e);
        }

        this._client.on(Events.InteractionCreate, async (interaction) => {
            if(!interaction) throw new Error("Cannot find interaction")
            if (!interaction.isModalSubmit()) return;
            try{
                const infos = interaction.customId.split('_');
                const side = parseInt(infos[0]) as Side;
                const gameId = parseInt(infos[1]);
                const userId = infos[2];
                const currentScore = infos[3];
                const amountText = interaction.fields.getTextInputValue('amount');
                let amount = parseInt(amountText);
                if(Number.isNaN(amount))throw new Error(`${amountText} is not a correct number`);
                if(amount <= 0)throw new Error(`${amountText} is not > 0`);
                if(!userId) throw new Error("Cannot find userId on this server");
                let specificLurker = this.getLuker(interaction.guildId);
                let wagerText = await specificLurker.setBet(gameId, userId, amount, side);

                interaction.reply({content: wagerText, ephemeral: true});
            }catch(e: any){
                try{
                    await interaction.reply({content: e.message, ephemeral: true});
                }catch { };
                Logger.error(e);
            }
        });

        this._client.on(Events.InteractionCreate, async (interaction) => {
            if(!interaction) throw new Error("Cannot find interaction")
            if (!interaction.isButton()) return;
            try{
                const infos = interaction.customId.split('_');
                const side = infos[0] === 'redside' ? Side.RED : Side.BLUE;
                const gameId = infos[1];
                const userId = interaction.member?.user.id;

                if(!userId) throw new Error("Cannot find userId on this server");
                let specificLurker = this.getLuker(interaction.guildId);
                let currentScore = specificLurker.checkScore(userId);
                
                const modal = new ModalBuilder()
                    .setCustomId(`${side}_${gameId}_${interaction.member?.user.id}_${currentScore}_modal`)
                    .setTitle(`Wager on ${sideToText(side)}`);

                const favoriteColorInput = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel("What's the amount you want to wager ?")
                    .setPlaceholder(`You currently have ${currentScore} ${CONFIG.CURRENCY}`)
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short);

                const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(favoriteColorInput);
                modal.addComponents(firstActionRow);

                await interaction.showModal(modal);
            }catch(e: any){
                try{
                    await interaction.reply({content: e.message, ephemeral: true});
                }catch { };
                Logger.error(e);
            }
        });

        this._client.on(Events.InteractionCreate, async (interaction) => {
            if(!interaction) throw new Error("Cannot find interaction")
            if (!interaction.isChatInputCommand()) return;
            try{
                if(!interaction.guildId) throw new Error("Command was not sent from a server");
                let specificLurker = this._lurkers.get(interaction.guildId);
                if(!specificLurker){
                    this._lurkers.set(interaction.guildId, this.createAndBindLurker(interaction.guildId));
                    specificLurker = this._lurkers.get(interaction.guildId)
                }
                if(!specificLurker) throw new Error("Could not find a Lurker available for this server");
                await commandList.execute(interaction, specificLurker, this._client);
            }catch(e: any){
                try{
                    await interaction.reply({content: e.message, ephemeral: true});
                }catch { };
                Logger.error(e);
            }
        });
        
        await this._client.login(CONFIG.DISCORD_TOKEN);
    }

    start = async (commandList: CommandList) => {
        // Start bot, then start lurkers
        if(!commandList) throw new Error("No Discord commands configured");
        await this.register(commandList)

        this._championList = await this._opggApi.getChampionList()
        if(!this._championList?.length) throw new Error("No champion list available")
        Logger.info(`Bot : Retrieved all ${this._championList.length} champions`)

        // Recreate Lurkers from save datafile
        const files = fs.readdirSync(CONFIG.SAVED_DATA_PATH);
        for (const file of files.filter(file => path.extname(file).toLowerCase() === '.json')) {
            await this.restore(file.replace('.json',''))
        }
    }

    restore = async (guildId: string) => {
        const data = JSON.parse(fs.readFileSync(`${CONFIG.SAVED_DATA_PATH}/${guildId}.json`, 'utf8')) as Save;
        const lurker = this.createAndBindLurker(data.guildId);
        this._lurkers.set(data.guildId, lurker);
        await lurker.start(data.channelId, data)
    }

    private getLuker = (guildId: string | null) : Lurker => {
        if(!guildId) throw new Error("Command was not sent from a server");
        let specificLurker = this._lurkers.get(guildId);
        if(!specificLurker) throw new Error("Could not find a Lurker available for this server");
        return specificLurker;
    }

    private getChannel = async (lurker: Lurker) : Promise<TextChannel | null> => {
        if(lurker.channelId){
            const channel = await this._client.channels.fetch(lurker.channelId);
            if(channel?.isTextBased){
                return channel as TextChannel;
            }
        }
        return null;
    }

    private createAndBindLurker = (guildId: string) : Lurker => {
        Logger.info(`Bot : Creating new lurker for guildId : ${guildId}`)
        let lurker = new Lurker(guildId, this._riotApi, this._opggApi, this._championList)

        lurker.on('newWager', async (wager) => {
            const channel = await this.getChannel(lurker)
            if(!channel) return;

            wager.message = await channel.send({ embeds: [wager.buildEmbed()], components: [wager.buildButton()] })
        })
        lurker.on('restoreWager', async (wager) => {
            const channel = await this.getChannel(lurker)
            if(!channel) return;

            wager.message = await channel.messages.fetch(wager.messageId);
            if(!wager.message) return;
            await wager.message.edit({ embeds: [wager.buildEmbed()], components: [wager.buildButton()] })
        })
        lurker.on('updateWager', async (wager) => {
            const channel = await this.getChannel(lurker)
            if(!channel) return;

            if(!wager.message) return;
            await wager.message.edit({ embeds: [wager.buildEmbed()], components: [wager.buildButton()] })
        })
        lurker.on('endedWager', async (wager) => {
            const channel = await this.getChannel(lurker)
            if(!channel) return;

            for (const payout of wager.payouts) {
                const user = await this._client.users.fetch(payout.userId);
                const betData = wager.bettors.get(payout.userId)
                if(betData){
                    let wagerInfo = `By wagering ${betData.amount} ${CONFIG.CURRENCY} on ${sideToText(betData.side)} side on this Game : ${wager.message.url}`;
                    if(betData.side === wager.outcome.victorySide){
                        user.send(`🥳 **WON** - ${wagerInfo}, you won ${payout.amount} ${CONFIG.CURRENCY}`);
                    }else{
                        user.send(`😵 **LOST** - ${wagerInfo}`);
                    }
                }
            }

            if(!wager.message) return;
            await wager.message.edit({ embeds: [wager.buildEmbed()]})
        })
        lurker.on('lockedWager', async (wager) => {
            const channel = await this.getChannel(lurker)
            if(!channel) return;

            if(!wager.message) return;
            await wager.message.edit({ embeds: [wager.buildEmbed()], components: [wager.buildButton()] })
        })

        return lurker;
    }

    constructor(){
        if(!CONFIG.RIOT_API_KEY) throw new Error("No RIOT API KEY defined")
            this._riotApi = new RiotAPI(
                {'X-Riot-Token': CONFIG.RIOT_API_KEY},
                CONFIG.RIOT_API_LIMIT_BY_MINUTES
            );
        this._opggApi = new OPGGApi();
        if (!fs.existsSync(CONFIG.SAVED_DATA_PATH)){
            fs.mkdirSync(CONFIG.SAVED_DATA_PATH, { recursive: true });
        }
    }
}