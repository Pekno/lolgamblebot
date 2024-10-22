export enum GameType {
	SOLORANKED = 'SOLORANKED',
	FLEXRANKED = 'FLEXRANKED',
	ARAM = 'ARAM',
	NORMAL = 'normal',
	UNKNOWN = 'unknown',
}

export const gameModeToType = (gameMode: string): GameType => {
	switch (gameMode) {
		case 'CLASSIC':
			return GameType.SOLORANKED;
		case 'ARAM':
			return GameType.ARAM;
		default:
			return GameType.UNKNOWN;
	}
};
