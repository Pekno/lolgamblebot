import { Summoner } from '../model/Summoner';
import { RiotChampion } from '../model/RiotModels';
import { GameType } from '../enum/GameType';
import { MainApi } from './MainApi';

export class OPGGApi extends MainApi {
	getSummonerInfo = async (summ: Summoner): Promise<Summoner> => {
		try {
			const region = summ.region.toString().replace(/[0-9]*/g, '');
			const response = await this.get(
				`https://www.op.gg/summoners/${region}/${summ.gameName}-${summ.tagLine}`
			);
			const regex =
				/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/;
			const match = response.data.match(regex);

			if (match && match[1]) {
				const jsonData = JSON.parse(match[1]);
				if (jsonData?.props?.pageProps?.data?.summoner_id) {
					summ.opggid = jsonData.props.pageProps.data.summoner_id;
					return summ;
				}
			}
			throw new Error('Cannot find OPGGId from webpage');
		} catch (error: any) {
			throw new Error(error.message);
		}
	};

	getChampionList = async (lang: string = 'en_US'): Promise<RiotChampion[]> => {
		try {
			const response = await this.get(
				`https://lol-web-api.op.gg/api/v1.0/internal/bypass/meta/champions?hl=${lang}`
			);
			return response.data.data.map((x: any) => x as RiotChampion);
		} catch (error: any) {
			throw new Error(error.message);
		}
	};

	getWinrateByGameType = async (
		summ: Summoner,
		gameType: GameType,
		champion: RiotChampion
	): Promise<number> => {
		try {
			let response;
			const region = summ.region.toString().replace(/[0-9]*/g, '');
			switch (gameType) {
				case GameType.SOLORANKED:
				case GameType.FLEXRANKED:
					response = await this.get(
						`https://lol-web-api.op.gg/api/v1.0/internal/bypass/summoners/${region}/${summ.opggid}/most-champions/rank?game_type=${gameType}&season_id=27`
					);
					break;
				case GameType.ARAM:
					response = await this.get(
						`https://lol-web-api.op.gg/api/v1.0/internal/bypass/summoners/${region}/${summ.opggid}/most-champions/aram?game_type=${gameType}&season_id=27`
					);
					break;
				case GameType.NORMAL:
					response = await this.get(
						`https://lol-web-api.op.gg/api/v1.0/internal/bypass/games/${region}/summoners/${summ.opggid}?game_type=${gameType}`
					);
					break;
			}
			const summonnerStats = response.data.data;
			if (!summonnerStats || !summonnerStats?.champion_stats?.length)
				return 0.5;
			const championStats = summonnerStats.champion_stats.find(
				(c: any) => c.id === champion.id
			);
			if (championStats) return championStats.win / championStats.play;
			return summonnerStats.win / summonnerStats.play;
		} catch (error: any) {
			throw new Error(error.message);
		}
	};
}
