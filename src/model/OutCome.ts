import { Side } from '../enum/Side';
import { MatchData } from './RiotModels';

export class OutCome {
	matchData: MatchData;

	get victorySide(): Side {
		const team = this.matchData.info.teams.find((t) => t.win);
		return team?.teamId as Side;
	}

	public constructor(init?: Partial<OutCome>) {
		Object.assign(this, init);
	}
}
