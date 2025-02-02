import { Summoner } from '../model/Summoner';
import { RiotChampion } from '../model/RiotModels';
import { GameType } from '../enum/GameType';
import { LocaleError, MainApi } from '@pekno/simple-discordbot';

const locales: { [key: string]: string } = {
	AF: 'af_ZA', // Afrikaans (South Africa)
	AM: 'am_ET', // Amharic (Ethiopia)
	AR: 'ar_AE', // Arabic (United Arab Emirates)
	AZ: 'az_AZ', // Azerbaijani (Azerbaijan)
	BE: 'be_BY', // Belarusian (Belarus)
	BG: 'bg_BG', // Bulgarian (Bulgaria)
	BN: 'bn_BD', // Bengali (Bangladesh)
	BS: 'bs_BA', // Bosnian (Bosnia and Herzegovina)
	CA: 'ca_ES', // Catalan (Spain)
	CS: 'cs_CZ', // Czech (Czech Republic)
	DA: 'da_DK', // Danish (Denmark)
	DE: 'de_DE', // German (Germany)
	EL: 'el_GR', // Greek (Greece)
	EN: 'en_US', // English (United States)
	ES: 'es_ES', // Spanish (Spain)
	ET: 'et_EE', // Estonian (Estonia)
	FA: 'fa_IR', // Persian (Iran)
	FI: 'fi_FI', // Finnish (Finland)
	FR: 'fr_FR', // French (France)
	HE: 'he_IL', // Hebrew (Israel)
	HI: 'hi_IN', // Hindi (India)
	HR: 'hr_HR', // Croatian (Croatia)
	HU: 'hu_HU', // Hungarian (Hungary)
	HY: 'hy_AM', // Armenian (Armenia)
	ID: 'id_ID', // Indonesian (Indonesia)
	IS: 'is_IS', // Icelandic (Iceland)
	IT: 'it_IT', // Italian (Italy)
	JA: 'ja_JP', // Japanese (Japan)
	KA: 'ka_GE', // Georgian (Georgia)
	KK: 'kk_KZ', // Kazakh (Kazakhstan)
	KO: 'ko_KR', // Korean (South Korea)
	KY: 'ky_KG', // Kyrgyz (Kyrgyzstan)
	LT: 'lt_LT', // Lithuanian (Lithuania)
	LV: 'lv_LV', // Latvian (Latvia)
	MK: 'mk_MK', // Macedonian (North Macedonia)
	MN: 'mn_MN', // Mongolian (Mongolia)
	MS: 'ms_MY', // Malay (Malaysia)
	NB: 'nb_NO', // Norwegian Bokmål (Norway)
	NL: 'nl_NL', // Dutch (Netherlands)
	PL: 'pl_PL', // Polish (Poland)
	PT: 'pt_PT', // Portuguese (Portugal)
	PT_BR: 'pt_BR', // Portuguese (Brazil)
	RO: 'ro_RO', // Romanian (Romania)
	RU: 'ru_RU', // Russian (Russia)
	SK: 'sk_SK', // Slovak (Slovakia)
	SL: 'sl_SI', // Slovenian (Slovenia)
	SR: 'sr_RS', // Serbian (Serbia)
	SV: 'sv_SE', // Swedish (Sweden)
	TH: 'th_TH', // Thai (Thailand)
	TR: 'tr_TR', // Turkish (Turkey)
	UK: 'uk_UA', // Ukrainian (Ukraine)
	UZ: 'uz_UZ', // Uzbek (Uzbekistan)
	VI: 'vi_VN', // Vietnamese (Vietnam)
	ZH: 'zh_CN', // Chinese (Simplified, China)
	ZH_TW: 'zh_TW', // Chinese (Traditional, Taiwan)
};

export class OPGGApi extends MainApi {
	getSummonerInfo = async (summ: Summoner): Promise<Summoner> => {
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
		throw new LocaleError('error.opgg.no_opggid');
	};

	getChampionList = async (lang: string): Promise<RiotChampion[]> => {
		const response = await this.get(
			`https://lol-web-api.op.gg/api/v1.0/internal/bypass/meta/champions?hl=${locales[lang.toUpperCase()]}`
		);
		return response.data.data.map((x: any) => x as RiotChampion);
	};

	getWinrateByGameType = async (
		summ: Summoner,
		gameType: GameType,
		champion: RiotChampion
	): Promise<number> => {
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
		if (!summonnerStats || !summonnerStats?.champion_stats?.length) return 0.5;
		const championStats = summonnerStats.champion_stats.find(
			(c: any) => c.id === champion.id
		);
		if (championStats) return championStats.win / championStats.play;
		return summonnerStats.win / summonnerStats.play;
	};
}
