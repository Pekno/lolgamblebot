import { SpecificRegion } from '../enum/SpecificRegion';
import { GameType } from '../enum/GameType';

/**
 * Base URLs for different API domains used in the application
 * These are extracted to avoid duplication and enable easier changes
 */
export const API_BASE_URLS = {
	OPGG: {
		WEB: 'https://www.op.gg',
		API: 'https://lol-web-api.op.gg/api/v1.0/internal/bypass',
	},
	RIOT: (region: string) => `https://${region}.api.riotgames.com`,
};

/**
 * Season ID used for API requests
 * Extracted as a constant to make it easier to update when seasons change
 */
export const CURRENT_SEASON_ID = 27;

/**
 * Enum for OPGG API endpoint paths
 * Contains path templates that can be used with the URL builders
 */
export enum OPGGEndpointPath {
	// Summoner related endpoints
	SUMMONER_INFO = '/summoners/{region}/{gameName}-{tagLine}',

	// Champion related endpoints
	CHAMPION_LIST = '/meta/champions',

	// Game statistics endpoints
	CHAMPION_RANKED_STATS = '/summoners/{region}/{summonerId}/most-champions/rank',
	CHAMPION_ARAM_STATS = '/summoners/{region}/{summonerId}/most-champions/aram',
	CHAMPION_NORMAL_STATS = '/games/{region}/summoners/{summonerId}',
}

/**
 * Enum for Riot API endpoint paths
 * Contains path templates that can be used with the URL builders
 */
export enum RiotEndpointPath {
	// Account related endpoints
	ACCOUNT_BY_RIOT_ID = '/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}',

	// Match related endpoints
	MATCH_BY_ID = '/lol/match/v5/matches/{gameId}',

	// Spectator related endpoints
	ACTIVE_GAME_BY_SUMMONER = '/lol/spectator/v5/active-games/by-summoner/{puuid}',
}

/**
 * Interface for URL builder parameters for OPGG API
 */
export interface OPGGUrlParams {
	region?: string;
	gameName?: string;
	tagLine?: string;
	summonerId?: string;
	gameType?: GameType;
	seasonId?: number;
	lang?: string;
}

/**
 * Interface for URL builder parameters for Riot API
 */
export interface RiotUrlParams {
	parentRegion?: string;
	gameName?: string;
	tagLine?: string;
	gameId?: string;
	puuid?: string;
}

/**
 * Builds a complete OPGG Web URL from a path template and parameters
 *
 * @param path - The endpoint path template
 * @param params - The parameters to substitute in the template
 * @returns A complete URL string
 */
export function buildOPGGWebUrl(
	path: OPGGEndpointPath,
	params: OPGGUrlParams = {}
): string {
	// Start with the base URL
	let url = `${API_BASE_URLS.OPGG.WEB}${path}`;

	// Replace path parameters
	if (params.region) url = url.replace('{region}', params.region);
	if (params.gameName && params.tagLine) {
		url = url.replace(
			'{gameName}-{tagLine}',
			`${params.gameName}-${params.tagLine}`
		);
	}

	return url;
}

/**
 * Builds a complete OPGG API URL from a path template and parameters
 *
 * @param path - The endpoint path template
 * @param params - The parameters to substitute in the template
 * @returns A complete URL string
 */
export function buildOPGGApiUrl(
	path: OPGGEndpointPath,
	params: OPGGUrlParams = {}
): string {
	// Start with the base URL
	let url = `${API_BASE_URLS.OPGG.API}${path}`;

	// Replace path parameters
	if (params.region) url = url.replace('{region}', params.region);
	if (params.summonerId) url = url.replace('{summonerId}', params.summonerId);

	// Add query parameters
	const queryParams: string[] = [];

	if (params.gameType !== undefined) {
		queryParams.push(`game_type=${params.gameType}`);
	}

	if (params.seasonId !== undefined) {
		queryParams.push(`season_id=${params.seasonId}`);
	}

	if (params.lang !== undefined) {
		queryParams.push(`hl=${params.lang}`);
	}

	// Append query parameters if any exist
	if (queryParams.length > 0) {
		url += `?${queryParams.join('&')}`;
	}

	return url;
}

/**
 * Builds a complete Riot API URL from a region, path template, and parameters
 *
 * @param parentRegion - The parent region for the Riot API
 * @param path - The endpoint path template
 * @param params - The parameters to substitute in the template
 * @returns A complete URL string
 */
export function buildRiotApiUrl(
	parentRegion: string,
	path: RiotEndpointPath,
	params: RiotUrlParams = {}
): string {
	// Start with the base URL for the specified region
	let url = `${API_BASE_URLS.RIOT(parentRegion)}${path}`;

	// Replace path parameters
	if (params.gameName) url = url.replace('{gameName}', params.gameName);
	if (params.tagLine) url = url.replace('{tagLine}', params.tagLine);
	if (params.gameId) url = url.replace('{gameId}', params.gameId);
	if (params.puuid) url = url.replace('{puuid}', params.puuid);

	return url;
}

/**
 * Helper function to get parent region from specific region
 * This should be used with your existing RegionMap
 *
 * @param specificRegion - The specific region
 * @param regionMap - The region mapping object
 * @returns The parent region string
 */
export function getParentRegion(
	specificRegion: SpecificRegion,
	regionMap: Record<SpecificRegion, string>
): string {
	return regionMap[specificRegion];
}
