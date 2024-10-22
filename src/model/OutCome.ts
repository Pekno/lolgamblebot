import { Side } from '../enum/Side';
import { EndType } from '../enum/EndType';
import { MatchData } from './RiotModels';

export class OutCome {
	matchData: MatchData;

	get victorySide(): Side {
		const team = this.matchData.info.teams.find((t) => t.win);
		return team?.teamId as Side;
	}

	get endType(): EndType {
		if (this.matchData.info.participants[0].gameEndedInEarlySurrender)
			return EndType.REMAKE;
		if (this.matchData.info.participants[0].gameEndedInSurrender)
			return EndType.SURRENDER;
		return EndType.NORMAL;
	}

	public constructor(init?: Partial<OutCome>) {
		Object.assign(this, init);
	}
}
