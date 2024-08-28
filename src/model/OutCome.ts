import { Side } from "../enum/Side";
import { MatchData } from "./RiotModels";

export class OutCome{
    matchData: MatchData;

    get victorySide(): Side {
        let team = this.matchData.info.teams.find(t => t.win);
        if(!team) throw new Error("No team found in matchdata")
        return team.teamId as Side
    }

    public constructor(init?: Partial<OutCome>) {
        Object.assign(this, init);
    }
}