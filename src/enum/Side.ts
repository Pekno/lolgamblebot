export enum Side{
    BLUE = 100,
    RED = 200
}

export const sideToText = (side: Side) : string => {
    return side === Side.RED ? '🔴 RED' : '🔵 BLUE';
}

export const sideToShortText = (side: Side) : string => {
    return side === Side.RED ? '🔴' : '🔵';
}