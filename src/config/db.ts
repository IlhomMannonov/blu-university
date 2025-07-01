import {DataSource} from 'typeorm';
import config from './config';
import {User} from '../entity/User';
import {SmsCode} from "../entity/SmsCode";
import {AdmissionType} from "../entity/AdmissionType";
import {Admission} from "../entity/Admission";
import {Attachment} from "../entity/Attachment";
import {EduForm} from "../entity/EduForm";
import {EduLang} from "../entity/EduLang";
import {EduDirection} from "../entity/EduDirection";

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: config.db.host,
    port: config.db.port,
    username: config.db.username,
    password: config.db.password,
    database: config.db.database,
    entities: [
        User,
        SmsCode,
        AdmissionType,
        Admission,
        Attachment,
        EduForm,
        EduLang,
        EduDirection
    ],
    synchronize: true,
});

export const connectDB = async (): Promise<void> => {
    try {
        await AppDataSource.initialize();
        console.log('PostgreSQL database connected');
    } catch (error) {
        console.error('Database connection error', error);
        process.exit(1);
    }
};
