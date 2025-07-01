import 'reflect-metadata';
import express, {Application} from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import {errorHandler} from './middilwares/errorHandlers';
import {connectDB} from './config/db';
import authRouter from "./routers/AuthRouter";
import i18 from "./config/i18";
import cors from "cors";
import userRouter from "./routers/UserRouter'";
import admissionRouter from "./routers/AdmissionRouter";
import admissionTypeRouter from "./routers/AdmissionTypeRouter";
import fileRouter from "./routers/FileRouter";
import eduFormRouter from "./routers/EduFormRouter";
import eduLangRouter from "./routers/EduLangRouter";
import eduDirectionRouter from "./routers/EduDirectionRouter";
import thirdPartyRouter from "./routers/ThirdPartyRouter";


const app: Application = express();


app.use(i18.init);
// PostgreSQL bazasiga ulanish
connectDB();
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(cors());
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/admission', admissionRouter);
app.use('/api/v1/ad-type', admissionTypeRouter);
app.use('/api/v1/attachment', fileRouter);
app.use('/api/v1/edu-form', eduFormRouter);
app.use('/api/v1/edu-lang', eduLangRouter);
app.use('/api/v1/edu-direction', eduDirectionRouter);
app.use('/api/v1/third-party', thirdPartyRouter);

app.use(errorHandler);

export default app;
