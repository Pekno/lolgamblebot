export const CONFIG = {
	LOCALE: process.env.LOCALE ?? 'en',
	DISCORD_ID: process.env.DISCORD_ID,
	DISCORD_TOKEN: process.env.DISCORD_TOKEN,
	RIOT_API_KEY: process.env.RIOT_API_KEY,
	RIOT_API_LIMIT_BY_MINUTES: parseInt(
		process.env.RIOT_API_LIMIT_BY_MINUTES ?? '100'
	),
	CHECK_INTERVAL: parseInt(process.env.CHECK_INTERVAL ?? '60'),
	TIME_BEFORE_BET_LOCK: parseInt(process.env.TIME_BEFORE_BET_LOCK ?? '180'),
	START_AMOUNT: parseInt(process.env.START_AMOUNT ?? '100'),
	CURRENCY: process.env.CURRENCY ?? '🪙',
	SAVED_DATA_PATH: process.env.SAVED_DATA_PATH ?? './data',
	LOG_LEVEL: process.env.LOG_LEVEL?.toLowerCase() ?? 'warning',
};
