export enum GameType {
	SOLORANKED = 'SOLORANKED',
	FLEXRANKED = 'FLEXRANKED',
	ARAM = 'ARAM',
	NORMAL = 'normal',
}

export const gameModeToType = (gameMode: string): GameType => {
	switch (gameMode) {
		case 'CLASSIC':
			return GameType.SOLORANKED;
		case 'ARAM':
			return GameType.ARAM;
	}
	throw new Error(`Cannot find this GameMode : ${gameMode}`);
};
