import i18n from 'i18n';

export enum Side {
	BLUE = 100,
	RED = 200,
}

export const sideToText = (side: Side): string => {
	return side === Side.RED
		? `🔴 ${i18n.__('display.side.red_side_caps')}`
		: `🔵 ${i18n.__('display.side.blue_side_caps')}`;
};

export const sideToShortText = (side: Side): string => {
	return side === Side.RED ? '🔴' : '🔵';
};
