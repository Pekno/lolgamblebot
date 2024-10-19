export class RiotGameData {
	gameId: number;
	mapId: number;
	gameMode: string;
	gameType: string;
	gameQueueConfigId: number;
	participants: RiotParticipant[];
	observers: RiotObservers;
	platformId: string;
	bannedChampions: BannedChampion[];
	gameStartTime: number;
	gameLength: number;

	public constructor(init?: Partial<RiotGameData>) {
		Object.assign(this, init);
	}
}

export class RiotPerks {
	perkIds: number[];
	perkStyle: number;
	perkSubStyle: number;

	public constructor(init?: Partial<RiotPerks>) {
		Object.assign(this, init);
	}
}

export class RiotObservers {
	encryptionKey: string;

	public constructor(init?: Partial<RiotObservers>) {
		Object.assign(this, init);
	}
}

export class RiotParticipant {
	puuid: string;
	teamId: number;
	spell1Id: number;
	spell2Id: number;
	championId: number;
	profileIconId: number;
	riotId: string;
	bot: boolean;
	summonerId: string;
	gameCustomizationObjects: any[];
	perks: RiotPerks;

	public constructor(init?: Partial<RiotParticipant>) {
		Object.assign(this, init);
	}
}

export class BannedChampion {
	championId: number;
	teamId: number;
	pickTurn: number;

	public constructor(init?: Partial<BannedChampion>) {
		Object.assign(this, init);
	}
}

export class RiotChampion {
	id: number;
	key: string;
	name: string;
	image_url: string;
	evolve: any[];
	blurb: string;
	tags: string[];
	lore: string;
	partype: string;
	info: {
		attack: number;
		defense: number;
		magic: number;
		difficulty: number;
	};
	stats: {
		hp: number;
		hpperlevel: number;
		mp: number;
		mpperlevel: number;
		movespeed: number;
		armor: number;
		armorperlevel: number;
		spellblock: number;
		spellblockperlevel: number;
		attackrange: number;
		hpregen: number;
		hpregenperlevel: number;
		mpregen: number;
		mpregenperlevel: number;
		crit: number;
		critperlevel: number;
		attackdamage: number;
		attackdamageperlevel: number;
		attackspeed: number;
		attackspeedperlevel: number;
	};
	enemy_tips: string[];
	ally_tips: string[];
	skins: {
		id: number;
		champion_id: number;
		name: string;
		has_chromas: boolean;
		splash_image: string;
		loading_image: string;
		tiles_image: string;
		centered_image: string;
		skin_video_url: string | null;
		prices: { currency: string; cost: number }[] | null;
		sales: any | null;
		release_date: string | null;
	}[];
	passive: {
		name: string;
		description: string;
		image_url: string;
		video_url: string;
	};
	spells: {
		key: string;
		name: string;
		description: string;
		max_rank: number;
		range_burn: number[];
		cooldown_burn: number[];
		cooldown_burn_float: number[];
		cost_burn: number[];
		tooltip: string;
		image_url: string;
		video_url: string;
	}[];

	public constructor(init?: Partial<RiotChampion>) {
		Object.assign(this, init);
	}
}

export class MatchData {
	metadata: {
		dataVersion: string;
		matchId: string;
		participants: string[];
	};
	info: {
		endOfGameResult: string;
		gameCreation: number;
		gameDuration: number;
		gameEndTimestamp: number;
		gameId: number;
		gameMode: string;
		gameName: string;
		gameStartTimestamp: number;
		gameType: string;
		gameVersion: string;
		mapId: number;
		participants: {
			allInPings: number;
			assistMePings: number;
			assists: number;
			baronKills: number;
			basicPings: number;
			bountyLevel: number;
			challenges: {
				'12AssistStreakCount': number;
				InfernalScalePickup: number;
				SWARM_DefeatAatrox: number;
				SWARM_DefeatBriar: number;
				SWARM_DefeatMiniBosses: number;
				SWARM_EvolveWeapon: number;
				SWARM_Have3Passives: number;
				SWARM_KillEnemy: number;
				SWARM_PickupGold: number;
				SWARM_ReachLevel50: number;
				SWARM_Survive15Min: number;
				SWARM_WinWith5EvolvedWeapons: number;
				abilityUses: number;
				acesBefore15Minutes: number;
				alliedJungleMonsterKills: number;
				baronTakedowns: number;
				blastConeOppositeOpponentCount: number;
				bountyGold: number;
				buffsStolen: number;
				completeSupportQuestInTime: number;
				controlWardTimeCoverageInRiverOrEnemyHalf: number;
				controlWardsPlaced: number;
				damagePerMinute: number;
				damageTakenOnTeamPercentage: number;
				dancedWithRiftHerald: number;
				deathsByEnemyChamps: number;
				dodgeSkillShotsSmallWindow: number;
				doubleAces: number;
				dragonTakedowns: number;
				earliestDragonTakedown: number;
				earlyLaningPhaseGoldExpAdvantage: number;
				effectiveHealAndShielding: number;
				elderDragonKillsWithOpposingSoul: number;
				elderDragonMultikills: number;
				enemyChampionImmobilizations: number;
				enemyJungleMonsterKills: number;
				epicMonsterKillsNearEnemyJungler: number;
				epicMonsterKillsWithin30SecondsOfSpawn: number;
				epicMonsterSteals: number;
				epicMonsterStolenWithoutSmite: number;
				firstTurretKilled: number;
				fistBumpParticipation: number;
				flawlessAces: number;
				fullTeamTakedown: number;
				gameLength: number;
				getTakedownsInAllLanesEarlyJungleAsLaner: number;
				goldPerMinute: number;
				hadOpenNexus: number;
				immobilizeAndKillWithAlly: number;
				initialBuffCount: number;
				initialCrabCount: number;
				jungleCsBefore10Minutes: number;
				junglerTakedownsNearDamagedEpicMonster: number;
				kTurretsDestroyedBeforePlatesFall: number;
				kda: number;
				killAfterHiddenWithAlly: number;
				killParticipation: number;
				killedChampTookFullTeamDamageSurvived: number;
				killingSprees: number;
				killsNearEnemyTurret: number;
				killsOnOtherLanesEarlyJungleAsLaner: number;
				killsOnRecentlyHealedByAramPack: number;
				killsUnderOwnTurret: number;
				killsWithHelpFromEpicMonster: number;
				knockEnemyIntoTeamAndKill: number;
				landSkillShotsEarlyGame: number;
				laneMinionsFirst10Minutes: number;
				laningPhaseGoldExpAdvantage: number;
				legendaryCount: number;
				legendaryItemUsed: number[];
				lostAnInhibitor: number;
				maxCsAdvantageOnLaneOpponent: number;
				maxKillDeficit: number;
				maxLevelLeadLaneOpponent: number;
				mejaisFullStackInTime: number;
				moreEnemyJungleThanOpponent: number;
				multiKillOneSpell: number;
				multiTurretRiftHeraldCount: number;
				multikills: number;
				multikillsAfterAggressiveFlash: number;
				outerTurretExecutesBefore10Minutes: number;
				outnumberedKills: number;
				outnumberedNexusKill: number;
				perfectDragonSoulsTaken: number;
				perfectGame: number;
				pickKillWithAlly: number;
				playedChampSelectPosition: number;
				poroExplosions: number;
				quickCleanse: number;
				quickFirstTurret: number;
				quickSoloKills: number;
				riftHeraldTakedowns: number;
				saveAllyFromDeath: number;
				scuttleCrabKills: number;
				skillshotsDodged: number;
				skillshotsHit: number;
				snowballsHit: number;
				soloBaronKills: number;
				soloKills: number;
				stealthWardsPlaced: number;
				survivedSingleDigitHpCount: number;
				survivedThreeImmobilizesInFight: number;
				takedownOnFirstTurret: number;
				takedowns: number;
				takedownsAfterGainingLevelAdvantage: number;
				takedownsBeforeJungleMinionSpawn: number;
				takedownsFirstXMinutes: number;
				takedownsInAlcove: number;
				takedownsInEnemyFountain: number;
				teamBaronKills: number;
				teamDamagePercentage: number;
				teamElderDragonKills: number;
				teamRiftHeraldKills: number;
				tookLargeDamageSurvived: number;
				turretPlatesTaken: number;
				turretTakedowns: number;
				turretsTakenWithRiftHerald: number;
				twentyMinionsIn3SecondsCount: number;
				twoWardsOneSweeperCount: number;
				unseenRecalls: number;
				visionScoreAdvantageLaneOpponent: number;
				visionScorePerMinute: number;
				voidMonsterKill: number;
				wardTakedowns: number;
				wardTakedownsBefore20M: number;
				wardsGuarded: number;
			};
			champExperience: number;
			champLevel: number;
			championId: number;
			championName: string;
			championTransform: number;
			commandPings: number;
			consumablesPurchased: number;
			damageDealtToBuildings: number;
			damageDealtToObjectives: number;
			damageDealtToTurrets: number;
			damageSelfMitigated: number;
			dangerPings: number;
			deaths: number;
			detectorWardsPlaced: number;
			doubleKills: number;
			dragonKills: number;
			eligibleForProgression: boolean;
			enemyMissingPings: number;
			enemyVisionPings: number;
			firstBloodAssist: boolean;
			firstBloodKill: boolean;
			firstTowerAssist: boolean;
			firstTowerKill: boolean;
			gameEndedInEarlySurrender: boolean;
			gameEndedInSurrender: boolean;
			getBackPings: number;
			goldEarned: number;
			goldSpent: number;
			holdPings: number;
			individualPosition: string;
			inhibitorKills: number;
			inhibitorTakedowns: number;
			inhibitorsLost: number;
			item0: number;
			item1: number;
			item2: number;
			item3: number;
			item4: number;
			item5: number;
			item6: number;
			itemsPurchased: number;
			killingSprees: number;
			kills: number;
			lane: string;
			largestCriticalStrike: number;
			largestKillingSpree: number;
			largestMultiKill: number;
			longestTimeSpentLiving: number;
			magicDamageDealt: number;
			magicDamageDealtToChampions: number;
			magicDamageTaken: number;
			missions: {
				playerScore0: number;
				playerScore1: number;
				playerScore2: number;
				playerScore3: number;
				playerScore4: number;
				playerScore5: number;
				playerScore6: number;
				playerScore7: number;
				playerScore8: number;
				playerScore9: number;
				playerScore10: number;
				playerScore11: number;
			};
			needVisionPings: number;
			neutralMinionsKilled: number;
			nexusKills: number;
			nexusLost: number;
			nexusTakedowns: number;
			objectivesStolen: number;
			objectivesStolenAssists: number;
			onMyWayPings: number;
			participantId: number;
			pentaKills: number;
			perks: {
				statPerks: {
					defense: number;
					flex: number;
					offense: number;
				};
				styles: {
					description: string;
					selections: {
						perk: number;
						var1: number;
						var2: number;
						var3: number;
					}[];
					style: number;
				}[];
			};
			physicalDamageDealt: number;
			physicalDamageDealtToChampions: number;
			physicalDamageTaken: number;
			placement: number;
			playerAugment1: number;
			playerAugment2: number;
			playerAugment3: number;
			playerAugment4: number;
			playerAugment5: number;
			playerAugment6: number;
			playerSubteamId: number;
			profileIcon: number;
			pushPings: number;
			puuid: string;
			quadraKills: number;
			riotIdName: string;
			riotIdTagline: string;
			role: string;
			sightWardsBoughtInGame: number;
			spell1Casts: number;
			spell2Casts: number;
			spell3Casts: number;
			spell4Casts: number;
			squadId: number;
			summonSpell1Id: number;
			summonSpell2Id: number;
			teamEarlySurrendered: boolean;
			teamId: number;
			teamPosition: string;
			timeCCingOthers: number;
			timePlayed: number;
			totalAllyJungleMinionsKilled: number;
			totalDamageDealt: number;
			totalDamageDealtToChampions: number;
			totalDamageShieldedOnTeammates: number;
			totalDamageTaken: number;
			totalEnemyJungleMinionsKilled: number;
			totalHeal: number;
			totalHealsOnTeammates: number;
			totalMinionsKilled: number;
			totalTimeCCDealt: number;
			totalTimeSpentDead: number;
			totalUnitsHealed: number;
			tripleKills: number;
			trueDamageDealt: number;
			trueDamageDealtToChampions: number;
			trueDamageTaken: number;
			turretKills: number;
			turretTakedowns: number;
			turretsLost: number;
			visionClearedPings: number;
			visionScore: number;
			visionWardsBoughtInGame: number;
			wardsKilled: number;
			wardsPlaced: number;
			win: boolean;
		}[];
		queueId: number;
		teams: {
			bans: {
				championId: number;
				pickTurn: number;
			}[];
			objectives: {
				baron: {
					first: boolean;
					kills: number;
				};
				champion: {
					first: boolean;
					kills: number;
				};
				dragon: {
					first: boolean;
					kills: number;
				};
				inhibitor: {
					first: boolean;
					kills: number;
				};
				riftHerald: {
					first: boolean;
					kills: number;
				};
				tower: {
					first: boolean;
					kills: number;
				};
			};
			teamId: number;
			win: boolean;
		}[];
		tournamentCode: string;
	};

	public constructor(init?: Partial<MatchData>) {
		Object.assign(this, init);
	}
}
