import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';
import { CONFIG } from '../config/config';
import path from 'path';

const { combine, timestamp, json, prettyPrint, errors } = format;

export const Logger = createLogger({
	level: CONFIG.LOG_LEVEL,
	format: combine(errors({ stack: true }), json(), timestamp(), prettyPrint()),
	transports: [
		new transports.Console(),
		new transports.DailyRotateFile({
			filename: path.resolve(__dirname, '../logs/winston-logger-%DATE%.log'),
			datePattern: 'YYYY-MM-DD',
			zippedArchive: true,
			maxFiles: '30d',
		}),
	],
});
