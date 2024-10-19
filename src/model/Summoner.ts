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

	public constructor(init?: Partial<Summoner>) {
		Object.assign(this, init);
	}
}
