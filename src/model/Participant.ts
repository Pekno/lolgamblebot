import { Side } from '../enum/Side';
import { RiotChampion } from './RiotModels';
import { Summoner } from './Summoner';

export class Participant {
	summoner: Summoner;
	champion: RiotChampion;
	opggWinrate: number;
	side: Side;

	public constructor(init?: Partial<Participant>) {
		Object.assign(this, init);
	}
}
