import { SpecificRegion } from '../enum/SpecificRegion';
import { Command, CommandList, CommandOption } from '../model/DiscordModels';
import { Bot } from '../services/Bot';
import { Lurker } from '../services/Lurker';
import {  Client, ApplicationCommandOptionType, ChatInputCommandInteraction } from 'discord.js';
import { Logger } from '../services/PinoLogger';
import { MainApi } from '../api/MainApi';

const regionOption = Object.keys(SpecificRegion).map((v, i) => {
    return {
        name: v.replace(/ /g, ''),
        value: Object.values(SpecificRegion)[i]
    }
});

const commandsList = new CommandList();
commandsList.push(new Command({
    name: 'start',
    description: 'Tell the bot to start and notify in this channel',
    execute: async (interaction : ChatInputCommandInteraction, lurker: Lurker, client: Client) => {
        await lurker.start(interaction.channelId);
        await interaction.reply(`Bot will now send notification on this channel`)
    }
}))
commandsList.push(new Command({
    name: 'stop',
    description: 'Tell the bot to stop notification in this channel',
    execute: async (interaction : ChatInputCommandInteraction, lurker: Lurker, client: Client) => {
        await lurker.stop();
        await interaction.reply(`Bot will now stop sending notification on this channel`)
    }
}))
commandsList.push(new Command({
    name: 'add',
    description: 'Add a new summoner to check',
    options: [
        new CommandOption({
            name: 'summoner_region',
            description: 'region of the summoner to be added',
            type: ApplicationCommandOptionType.String,
            choices: regionOption,
            required: true
        }),
        new CommandOption({
            name: 'summoner_name',
            description: 'name of the summoner to be added like <AAAAA#BBB>',
            type: ApplicationCommandOptionType.String,
            required: true
        })
    ],
    execute: async (interaction : ChatInputCommandInteraction, lurker: Lurker, client: Client) => {
        const summonerName = interaction.options.getString('summoner_name');
        const summonerRegion = interaction.options.getString('summoner_region') as SpecificRegion;
        await lurker.addSummoner(summonerName, summonerRegion);
        await interaction.reply(`Added ${summonerName} to the check list`)
    }
}))
commandsList.push(new Command({
    name: 'remove',
    description: 'Remove a summoner from the check list',
    options: [
        new CommandOption({
            name: 'summoner_region',
            description: 'region of the summoner to be removed',
            type: ApplicationCommandOptionType.String,
            choices: regionOption,
            required: true
        }),
        new CommandOption({
            name: 'summoner_name',
            description: 'name of the summoner to be removed like <AAAAA#BBB>',
            type: ApplicationCommandOptionType.String,
            required: true
        })
    ],
    execute: async (interaction : ChatInputCommandInteraction, lurker: Lurker, client: Client) => {
        const summonerName = interaction.options.getString('summoner_name');
        const summonerRegion = interaction.options.getString('summoner_region') as SpecificRegion;
        lurker.removeSummoner(summonerName, summonerRegion);
        await interaction.reply(`Removed ${summonerName} from the check list`)
    }
}))
commandsList.push(new Command({
    name: 'list',
    description: 'Get the summoners from the check list',
    execute: async (interaction : ChatInputCommandInteraction, lurker: Lurker, client: Client) => {
        let summonerText = lurker.getSummoners();
        await interaction.reply(`Watching this Summoners : ${summonerText}`)
    }
}))
commandsList.push(new Command({
    name: 'scoreboard',
    description: 'Get the scoreboard from the bot',
    execute: async (interaction : ChatInputCommandInteraction, lurker: Lurker, client: Client) => {
        await interaction.reply({ embeds: [await lurker.buildEmbedScoreboard(client)]})
    }
}))

const bot = new Bot();
bot.start(commandsList).catch(e => {
    Logger.error(e);
});