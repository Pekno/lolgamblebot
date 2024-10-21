import { RiotGameData } from '../model/RiotModels';
import { OutCome } from '../model/OutCome';
import { SpecificRegion } from '../enum/SpecificRegion';
import { Summoner } from '../model/Summoner';
import { RegionMap } from '../config/RegionMap';
import { MainApi } from './MainApi';

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
		throw new Error("Summoner name can't be matched to <gameName>#<tagLine>");
	};

	getSummonerInfo = async (
		summ: Summoner,
		summonerRegion: SpecificRegion
	): Promise<Summoner | null> => {
		try {
			if (!summ.gameName || !summ.tagLine || !summ.region)
				throw new Error("Summoner's Name, Tag or Region is missing");
			const parentRegion = RegionMap[summonerRegion];
			const response = await this.get(
				`https://${parentRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summ.gameName}/${summ.tagLine}`
			);
			summ.puuid = response.data.puuid;
			summ.gameName = response.data.gameName;
			summ.tagLine = response.data.tagLine;
			return summ;
		} catch (error: any) {
			// If status code is 404 in API, then summoner summoner doesn't exist "Data not found - No results found for player with riot id"
			if (error.response?.data?.status?.status_code === 404) return null;
			throw new Error(error.message);
		}
	};

	getFinishedGame = async (
		region: SpecificRegion,
		completeGameId: string
	): Promise<OutCome | null> => {
		try {
			if (!region || !completeGameId)
				throw new Error('Region or GameId is missing');
			const parentRegion = RegionMap[region];
			const response = await this.get(
				`https://${parentRegion}.api.riotgames.com/lol/match/v5/matches/${completeGameId}`
			);
			return new OutCome({
				matchData: response.data,
			});
		} catch (error: any) {
			// If status code is 404 in API, then summoner is not in game
			if (error?.response?.data) {
				const data = error?.response?.data;
				if (data?.status?.status_code === 404) return null;
				if (data?.status && JSON.parse(data)?.status?.status_code === 404)
					return null;
			}
			// If status code is 404 in API, then summoner is not in game
			if (error.response?.data?.status?.status_code === 404)
				throw new Error(error.response?.data?.status?.message);
			throw new Error(error.message);
		}
	};

	getCurrentGame = async (summoner: Summoner): Promise<RiotGameData | null> => {
		try {
			if (!summoner.puuid)
				throw new Error('Summoner puuid is not defined at this stage');
			const response = await this.get(
				`https://${summoner.region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${summoner.puuid}`
			);
			return response.data as RiotGameData;
		} catch (error: any) {
			// If status code is 404 in API, then summoner is not in game
			if (error?.response?.data) {
				const data = error?.response?.data;
				if (data?.status?.status_code === 404) return null;
				if (data?.status && JSON.parse(data)?.status?.status_code === 404)
					return null;
			}
			throw new Error(error.message);
		}
	};
}
