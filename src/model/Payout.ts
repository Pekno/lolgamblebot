import { Bet } from './Bet';

export class Payout {
	userId: string;
	amount: number;

	public constructor(init?: Partial<Bet>) {
		Object.assign(this, init);
	}
}
