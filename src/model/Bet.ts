import { Side } from "../enum/Side";

export class Bet{
    side: Side;
    amount: number;

    public constructor(init?: Partial<Bet>) {
        Object.assign(this, init);
    }
}