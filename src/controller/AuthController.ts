import {NextFunction, Request, Response} from "express";
import {AuthenticatedRequest} from "../entity/interface/AuthenticatedRequest";
import {AppDataSource} from "../config/db";
import {User} from "../entity/User";
import {validFields} from "../utils/CustomErrors";
import {RestException} from "../middilwares/RestException";
import {__, __mf} from "i18n";
import bcrypt from 'bcryptjs';
import {send_sms} from "../Service/EskizService";
import {SmsCode} from "../entity/SmsCode";
import {MoreThan} from "typeorm";
import {isValidPassword, isValidUzbekPhone} from "../utils/CommonUtils";
import jwt from "jsonwebtoken";
import {Role} from "../entity/template/Role";

const userRepository = AppDataSource.getRepository(User)
const smsCodeRepository = AppDataSource.getRepository(SmsCode)
const JWT_SECRET = process.env.JWT_KEY || "dshakjfhdfs678g56d678gt98df";

export const check_number = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {phone_number} = req.body;
        validFields(['phone_number'], req.body)

        if (!isValidUzbekPhone(phone_number)) throw RestException.badRequest(__("phone_number_format_invalid"))
        const exists_user = await userRepository.exists({where: {phone_number, deleted: false, status: "active"}})

        res.status(200).send({exists: exists_user})
    } catch (err) {
        next(err)
    }
}

export const registerUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {phone_number, password}: { phone_number: string; password: string } = req.body;

        // Maydonlar to'g'ri keladimi tekshiramiz
        validFields(['phone_number', 'password'], req.body);
        if (!isValidUzbekPhone(phone_number)) throw RestException.badRequest(__("phone_number_format_invalid"))

        if (!isValidPassword(password)) throw RestException.badRequest(__("password_format_invalid"))


        let exists_user = await userRepository.findOne({
            where: {phone_number, deleted: false},
        });

        if (exists_user && exists_user.status === "active") {
            throw RestException.badRequest(__mf('user.already_exists', {number: phone_number}));
        }

        const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000); // Hozirdan 3 daqiqa oldin


        // 3 DAQIQA ICHIDA 5 TA SMS JONATILSA XATO QAYTARAMIZ
        const smsCodes = await smsCodeRepository.find({
            where: {
                created_at: MoreThan(threeMinutesAgo),
                phone_number: phone_number,
            },
            order: {created_at: "DESC"}, // Eng yangi ma'lumotlarni oldin chiqarish
        });


        if (smsCodes.length > 5) throw RestException.badRequest("Urinishlar soni ko'payib ketdi 3 daqiqadan song xarakat qilib ko'ring");

        const hashedPassword = await bcrypt.hash(password, 10);
        const code = generateCode(); // Tasdiqlash kodi

        let sms_code: any; // yoki SMSCodeEntity tipini qo'ying agar mavjud bo‘lsa

        await AppDataSource.transaction(async (transaction) => {
            if (exists_user) {
                exists_user.phone_number = phone_number;
                exists_user.password = hashedPassword;
                exists_user.status = 'active';
            } else {
                const newUser = userRepository.create({
                    phone_number,
                    password: hashedPassword,
                    status: 'no-active',
                });
                exists_user = await transaction.save(newUser);
            }

            sms_code = smsCodeRepository.create({
                phone_number,
                user_id: exists_user.id,
                is_checked: false,
                status: 'pending_check',
                code,
            });

            await transaction.save(sms_code);
        });

        await send_sms(code, phone_number);

        res.status(200).json({
            success: true,
            message: `${phone_number} raqamiga tasdiqlash kodi yuborildi`,
            data: {
                sms_id: sms_code.id,
                phone_number,
            },
        });
    } catch (err) {
        next(err);
    }
};

export const check_sms_code = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {sms_id, code} = req.body;
        validFields(["sms_id", 'code'], req.body);

        const sms = await smsCodeRepository.findOne({where: {id: sms_id, is_checked: false}});

        if (!sms) throw RestException.badRequest("Sms malumoti topilmadi");

        const user = await userRepository.findOne({where: {id: sms.user_id, deleted: false}});
        if (!user) throw RestException.badRequest("User topilmadi");

        if (sms.code !== code) throw RestException.badRequest("Noto'g'ri kod! Iltimos qaytadan urinib ko'ring");
        sms.is_checked = true;
        await smsCodeRepository.save(sms);

        const token = jwt.sign(
            {
                id: user.id,
                phone_number: user.phone_number,
            },
            JWT_SECRET
        );

        //AGRA ACTIVE BO'LSA BU ODAM LOGIN QILMOQCHI NO-ACTIVE BO'LSA DEMAK YANGI REGISTRATSIYA
        if (user.status === 'no-active') {
            user.status = 'active';
            user.state = 'enter-personal-data'
            await userRepository.save(user)
        }


        // 5. Javob qaytarish
        res.status(200).json({
            success: true,
            message: "Muvaffaqiyatli login!",
            token,
            user: {
                id: user.id,
                phone_number: user.phone_number,
                state: user.state,
            },
        });
    } catch (err) {
        next(err);
    }
}

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {password, phone} = req.body;

        // 1. Kerakli maydonlarni tekshirish
        validFields(["password", "phone"], req.body);

        // 2. Foydalanuvchini topish
        const user = await userRepository.findOne({where: {phone_number: phone, deleted: false, status: "active"}});

        if (!user) {
            res.status(401).json({message: "Foydalanuvchi yoki parol noto‘g‘ri!", success: false});
            return;
        }
        if (user.role !== Role.USER) {
            res.status(401).json({message: "Foydalanuvchi yoki parol noto‘g‘ri!", success: false});
            return;
        }

        // 3. Parolni tekshirish
        if (!password || !user.password) {
            res.status(401).json({message: "Foydalanuvchi yoki parol noto‘g‘ri!", success: false});
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({message: "Foydalanuvchi yoki parol noto‘g‘ri!", success: false});
            return;
        }

        // 4. JWT token yaratish
        if (!JWT_SECRET) {
            res.status(500).json({message: "Serverda muammo bor. Iltimos, keyinroq urinib ko‘ring.", success: false});
            return;
        }

        const token = jwt.sign(
            {
                id: user.id,
                phone_number: user.phone_number,
            },
            JWT_SECRET,
        );

        // 5. Javob qaytarish
        res.status(200).json({
            success: true,
            message: "Muvaffaqiyatli login!",
            token,
            user: {
                id: user.id,
                phone_number: user.phone_number,
            },
        });
    } catch (err) {
        next(err); // Xatolikni keyingi middleware-ga yuborish
    }
};


export const access_code_send = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {phone} = req.body;

        // 1. Kerakli maydonlarni tekshirish
        validFields(["phone"], req.body);
        if (!isValidUzbekPhone(phone)) throw RestException.badRequest(__("phone_number_format_invalid"))

        // 2. Foydalanuvchini topish
        const user = await userRepository.findOne({where: {phone_number: phone, deleted: false, status: "active"}});

        if (!user) {
            throw RestException.badRequest("Foydalanuvchi yoki parol noto‘g‘ri!")
        }

        const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000); // Hozirdan 3 daqiqa oldin


        // 3 DAQIQA ICHIDA 5 TA SMS JONATILSA XATO QAYTARAMIZ
        const smsCodes = await smsCodeRepository.find({
            where: {
                created_at: MoreThan(threeMinutesAgo),
                phone_number: phone,
            },
            order: {created_at: "DESC"}, // Eng yangi ma'lumotlarni oldin chiqarish
        });
        if (smsCodes.length > 5) throw RestException.badRequest("Urinishlar soni ko'payib ketdi 3 daqiqadan song xarakat qilib ko'ring");


        const code = generateCode(); // Tasdiqlash kodi

        const sms_code = await smsCodeRepository.save({
            phone_number: phone,
            user_id: user.id,
            is_checked: false,
            status: 'pending_check',
            code,
        });

        await send_sms(code, phone);


        res.status(200).send({
            success: true, message: "Tasdiqlash ko'd jonatildi", data: {
                phone_number: phone,
                sms_id: sms_code.id,
            }
        });


    } catch (err) {
        next(err)
    }
}


export const password_reset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {sms_id, password, code} = req.body;

        validFields(["sms_id", 'password', 'code'], req.body);
        if (!isValidPassword(password)) throw RestException.badRequest(__("password_format_invalid"))

        const sms = await smsCodeRepository.findOne({where: {id: sms_id, is_checked: false}});
        if (!sms) throw RestException.badRequest("Sms topilmadi");

        if (sms.code !== code) throw RestException.badRequest(__("sms.wrong_code"))

        const user = await userRepository.findOne({where: {id: sms.user_id, deleted: false, status: "active"}});
        if (!user) throw RestException.badRequest(__('user.not_found'));

        const hashedPassword = await bcrypt.hash(password, 10);


        await AppDataSource.transaction(async (transaction) => {
            sms.is_checked = true;
            user.password = hashedPassword;
            await transaction.save(sms)
            await transaction.save(user)
        })
        res.status(200).send({success: true, message: "Password reset successfully"})
    } catch (err) {
        next(err)
    }
}
const generateCode = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};


//ADMIN
export const register_admin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {phone, password} = req.body;

        // Kerakli maydonlarni tekshirish
        validFields(["phone", "password"], req.body);

        // Telefon raqamini tekshirish (+ bilan boshlanishi shart)
        if (!phone.startsWith("+")) {
            res.status(400).json({message: "Telefon raqami + bilan boshlanishi shart!"});
            return;
        }

        // Foydalanuvchi mavjudligini tekshirish
        const existsUser = await userRepository.count({where: {phone_number: phone}});

        if (existsUser > 0) {
            res.status(400).json({message: "Foydalanuvchi allaqachon mavjud"});
            return;
        }

        // Parolni hash qilish
        const hashedPassword = await bcrypt.hash(password, 10);

        // Yangi foydalanuvchi yaratish
        const newUser = userRepository.create({
            phone_number: phone,
            password: hashedPassword,
        });

        await userRepository.save(newUser);

        res.status(201).json({message: "Foydalanuvchi muvaffaqiyatli yaratildi"});

    } catch (err) {
        next(err);
    }
};

export const login_admin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {password, username} = req.body;

        // 1. Kerakli maydonlarni tekshirish
        validFields(["password", "username"], req.body);

        // 2. Foydalanuvchini topish
        const user = await userRepository.findOne({where: {phone_number: username, deleted: false}});

        if (!user) {
            res.status(401).json({message: "Foydalanuvchi yoki parol noto‘g‘ri!", success: false});
            return;
        }
        if (user.role == Role.USER) {
            res.status(401).json({message: "Foydalanuvchi yoki parol noto‘g‘ri!", success: false});
            return;
        }

        // 3. Parolni tekshirish
        if (!password || !user.password) {
            res.status(401).json({message: "Foydalanuvchi yoki parol noto‘g‘ri!", success: false});
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({message: "Foydalanuvchi yoki parol noto‘g‘ri!", success: false});
            return;
        }

        // 4. JWT token yaratish
        if (!JWT_SECRET) {
            res.status(500).json({message: "Serverda muammo bor. Iltimos, keyinroq urinib ko‘ring.", success: false});
            return;
        }

        const token = jwt.sign(
            {
                id: user.id,
                phone_number: user.phone_number,
            },
            JWT_SECRET,
        );

        // 5. Javob qaytarish
        res.status(200).json({
            success: true,
            message: "Muvaffaqiyatli login!",
            token,
            user: {
                id: user.id,
                phone_number: user.phone_number,
            },
        });
    } catch (err) {
        next(err); // Xatolikni keyingi middleware-ga yuborish
    }
};