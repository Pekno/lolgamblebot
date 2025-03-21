import { RiotGameData } from '../model/RiotModels';
import { OutCome } from '../model/OutCome';
import { SpecificRegion } from '../enum/SpecificRegion';
import { Summoner } from '../model/Summoner';
import { RegionMap } from '../config/RegionMap';
import { LocaleError, MainApi } from '@pekno/simple-discordbot';
import { buildRiotApiUrl, RiotEndpointPath } from '../constants/endpoints';

export class RiotAPI extends MainApi {
	cleanupSummonerName = (
		summonerName: string,
		summonerRegion: SpecificRegion
	): Summoner => {
		const regex = /^(.+)#(.+)$/;
		const match = summonerName.match(regex);
		if (match) {
			return new Summoner({
				gameName: match[1],
				tagLine: match[2],
				region: summonerRegion,
			});
		}
		throw new LocaleError('error.riot.no_summoner_match');
	};

	getSummonerInfo = async (
		summ: Summoner,
		summonerRegion: SpecificRegion
	): Promise<Summoner | null> => {
		try {
			if (!summ.gameName || !summ.tagLine || !summ.region)
				throw new LocaleError('error.riot.missing_summoner_field');
			const parentRegion = RegionMap[summonerRegion];

			// Use the endpoint builder to create the URL
			const url = buildRiotApiUrl(
				parentRegion,
				RiotEndpointPath.ACCOUNT_BY_RIOT_ID,
				{
					gameName: summ.gameName,
					tagLine: summ.tagLine,
				}
			);
			const response = await this.get(url);

			summ.puuid = response.data.puuid;
			summ.gameName = response.data.gameName;
			summ.tagLine = response.data.tagLine;
			return summ;
		} catch (error: any) {
			// If status code is 404 in API, then summoner summoner doesn't exist "Data not found - No results found for player with riot id"
			if (error.response?.data?.status?.status_code === 404) return null;
			throw error;
		}
	};

	getFinishedGame = async (
		region: SpecificRegion,
		completeGameId: string
	): Promise<OutCome | null> => {
		try {
			if (!region || !completeGameId)
				throw new LocaleError('error.riot.no_region_or_gameid');
			const parentRegion = RegionMap[region];

			// Use the endpoint builder to create the URL
			const url = buildRiotApiUrl(parentRegion, RiotEndpointPath.MATCH_BY_ID, {
				gameId: completeGameId,
			});
			const response = await this.get(url);

			return new OutCome({
				matchData: response.data,
			});
		} catch (error: any) {
			// If status code is 404 in API, then match file not found
			if (error?.response?.data) {
				const data = error?.response?.data;
				if (data?.httpStatus === 404) return null;
				if (data?.status && JSON.parse(data)?.status?.status_code === 404)
					return null;
			}
			throw error;
		}
	};

	getCurrentGame = async (summoner: Summoner): Promise<RiotGameData | null> => {
		try {
			if (!summoner.puuid)
				new LocaleError('error.riot.missing_summorner_puuid');

			// Use the endpoint builder to create the URL
			const url = buildRiotApiUrl(
				summoner.region,
				RiotEndpointPath.ACTIVE_GAME_BY_SUMMONER,
				{
					puuid: summoner.puuid,
				}
			);
			const response = await this.get(url);

			return response.data as RiotGameData;
		} catch (error: any) {
			// If status code is 404 in API, then summoner is not in game
			if (error?.response?.data) {
				const data = error?.response?.data;
				if (data?.httpStatus === 404) return null;
			}
			throw error;
		}
	};
}
