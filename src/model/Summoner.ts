import { SpecificRegion } from '../enum/SpecificRegion';
import { Wager } from './Wager';

export class Summoner {
	puuid: string;
	opggid: string;
	gameName: string;
	tagLine: string;
	region: SpecificRegion;
	currentWager: Wager | null;

	get wholeGameName(): string {
		return `${this.gameName}#${this.tagLine}`;
	}

	get LoGLink(): string {
		return `https://www.leagueofgraphs.com/summoner/${this.region.toLocaleLowerCase().replace(/[0-9]/g, '')}/${this.gameName.replace(/ /g, '+')}-${this.tagLine.replace(/ /g, '+')}`;
	}

	get hyperlink(): string {
		return `[${this.wholeGameName}](${this.LoGLink})`;
	}

	public constructor(init?: Partial<Summoner>) {
		Object.assign(this, init);
	}
}
