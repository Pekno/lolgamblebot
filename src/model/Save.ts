import { SpecificRegion } from '../enum/SpecificRegion';
import { LurkerStatus } from '../enum/LurkerStatus';
import { Side } from '../enum/Side';

export class WagerSave {
	messageId: string;
	gameData: {
		gameMode: string;
		region: SpecificRegion;
		platformId: string;
		gameId: number;
		gameStartTime: number;
	};
	participants: {
		puuid: string;
		teamId: number;
		championId: number;
	}[];
	bettors: {
		userId: string;
		amount: number;
		side: Side;
	}[];

	public constructor(init?: Partial<WagerSave>) {
		Object.assign(this, init);
	}
}

export class Save {
	guildId: string;
	channelId: string | null;
	status: LurkerStatus;
	summoners: {
		wholeGameName: string;
		region: SpecificRegion;
	}[];
	scoreboard: {
		userId: string;
		amount: number;
	}[];
	inProgressWagers: WagerSave[];

	public constructor(init?: Partial<Save>) {
		Object.assign(this, init);
	}
}
