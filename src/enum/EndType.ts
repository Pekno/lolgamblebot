export enum EndType {
	NORMAL,
	SURRENDER,
	REMAKE,
}

export const endTypeToText = (endType: EndType): string => {
	switch (endType) {
		case EndType.NORMAL:
			return '';
		case EndType.SURRENDER:
			return ` ${i18n.__('display.wager.gameEnd.SURRENDER')}`;
		case EndType.REMAKE:
			return ` ${i18n.__('display.wager.gameEnd.REMAKE')}`;
	}
};
