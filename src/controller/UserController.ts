import {AuthenticatedRequest} from "../entity/interface/AuthenticatedRequest";
import {NextFunction, Response} from "express";
import {RestException} from "../middilwares/RestException";
import {AppDataSource} from "../config/db";
import {User} from "../entity/User";
import {create_contact} from "../Service/AmoCRMServise";
import {validFields} from "../utils/CustomErrors";
import bcrypt from "bcryptjs";
import {isValidUzbekPhone} from "../utils/CommonUtils";
import {__} from "i18n";
import {send_login_password} from "../Service/EskizService";

const userRepository = AppDataSource.getRepository(User)

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user.id;
        if (!user_id) throw RestException.badRequest("user_id is required");
        const user: any = await userRepository.findOne({
            where: {id: Number(user_id), deleted: false}
        })
        if (!user) throw RestException.notFound("USER");
        user.password = ''

        user.pasport_is_avto = false;
        res.status(200).json(user);

    } catch (err) {
        next(err);
    }
}


export const get_user = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        // const deal = await create_deal("Ilhom Mannonov", Number(response), "O'zbek", "Kunduzgi", "Bakalavr", "Iqtisodiyot", "2021")
        const user_id = req.params.id;
        if (!user_id) throw RestException.badRequest("user_id is required");
        const user = await userRepository.findOne({
            where: {id: Number(user_id), deleted: false}
        })
        if (!user) throw RestException.notFound("User topilmadi");
        res.status(200).json(user);

    } catch (err) {
        next(err);
    }

}
export const get_users = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string)?.trim() || '';

        const offset = (page - 1) * limit;

        let usersQuery = '';
        let countQuery = '';
        let params: any[] = [];
        let countParams: any[] = [];

        if (search) {
            usersQuery = `
                SELECT u.*
                FROM users u
                WHERE u.deleted = false AND (
                    u.first_name ILIKE '%' || $1 || '%' OR
                    u.last_name ILIKE '%' || $1 || '%' OR
                    u.patron ILIKE '%' || $1 || '%' OR
                    u.phone_number ILIKE '%' || $1 || '%'
                )
                ORDER BY u.created_at DESC
                LIMIT $2 OFFSET $3
            `;
            countQuery = `
                SELECT COUNT(*) AS total
                FROM users u
                WHERE u.deleted = false AND (
                    u.first_name ILIKE '%' || $1 || '%' OR
                    u.last_name ILIKE '%' || $1 || '%' OR
                    u.patron ILIKE '%' || $1 || '%' OR
                    u.phone_number ILIKE '%' || $1 || '%'
                )
            `;
            params = [search, limit, offset];
            countParams = [search];
        } else {
            usersQuery = `
                SELECT u.*
                FROM users u
                WHERE u.deleted = false
                ORDER BY u.created_at DESC
                LIMIT $1 OFFSET $2
            `;
            countQuery = `
                SELECT COUNT(*) AS total
                FROM users u
                WHERE u.deleted = false
            `;
            params = [limit, offset];
            countParams = [];
        }

        const data = await userRepository.query(usersQuery, params);
        const countResult = await userRepository.query(countQuery, countParams);
        const total = parseInt(countResult[0]?.total || '0', 10);

        res.status(200).json({
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (err) {
        next(err);
    }
};
export const edit_user = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.params.id // URL orqali yuboriladi: /users/:id

        const {
            first_name,
            last_name,
            patron,
            passport_file_id,
            jshir,
            passport_id,
            birth_date,
            phone_number,
            gender,
            passport_expire_date,
            givenDate,
            country,
            region,
            district,
            address
        } = req.body;

        // 🔍 Foydalanuvchini bazadan topamiz
        const user = await userRepository.findOne({
            where: { id: Number(userId), deleted: false }
        });

        if (!user) {
            throw RestException.notFound("Foydalanuvchi topilmadi");
        }

        // 🔄 Yangilash
        user.first_name = first_name || user.first_name;
        user.last_name = last_name || user.last_name;
        user.patron = patron || user.patron;
        user.passport_file_id = passport_file_id || user.passport_file_id;
        user.jshir = jshir || user.jshir;
        user.passport_id = passport_id || user.passport_id;
        user.birth_date = birth_date ? new Date(birth_date) : user.birth_date;
        user.phone_number = phone_number || user.phone_number;
        user.gender = gender || user.gender;
        user.passport_expire_date = passport_expire_date ? new Date(passport_expire_date) : user.passport_expire_date;
        user.givenDate = givenDate ? new Date(givenDate) : user.givenDate;
        user.country = country || user.country;
        user.region = region || user.region;
        user.district = district || user.district;
        user.address = address || user.address;

        // 📥 Bazaga saqlash
        await userRepository.save(user);

        res.status(200).json({
            success: true,
            message: 'Foydalanuvchi maʼlumotlari yangilandi',
            data: user
        });

    } catch (error) {
        next(error);
    }
};

export const delete_my = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const user_id = req.params.id;
    if (!user_id) throw RestException.badRequest("user_id is required");
    const user = await userRepository.findOne({
        where: {id: Number(user_id), deleted: false}
    })

    if (!user) throw RestException.notFound("User topilmadi");

    user.deleted = true;
    await userRepository.save(user)
    res.status(200).send({message: "User deleted"})
}


export const create_user = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {
            first_name,
            last_name,
            patron,
            passport_file_id,
            jshir,
            passport_id,
            birth_date,
            phone_number,
            gender,
            passport_expire_date,
            givenDate,
            country,
            region,
            district,
            address
        } = req.body;

        validFields(['first_name', 'last_name', 'patron', 'passport_file_id', 'birth_date', 'phone_number', 'passport_expire_date'], req.body);

        if (!isValidUzbekPhone(phone_number)) throw RestException.badRequest(__("phone_number_format_invalid"))

        // 🔍 Telefon raqam unikal bo'lishi kerak
        const existingUser = await userRepository.findOne({
            where: {phone_number, deleted: false}
        });

        if (existingUser) {
            throw RestException.badRequest("Bu telefon raqam bilan foydalanuvchi allaqachon ro‘yxatdan o‘tgan")
        }

        // Parol yaratish
        const password = generateRandomString(8);
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = userRepository.create({
            first_name,
            last_name,
            patron,
            passport_file_id,
            jshir,
            passport_id,
            birth_date: new Date(birth_date),
            phone_number,
            gender,
            passport_expire_date: new Date(passport_expire_date),
            givenDate: new Date(givenDate),
            country,
            region,
            district,
            address,
            password: hashedPassword,
            state: "enter-personal-data"
        });

        const user = await userRepository.save(newUser);

        await create_contact({
            phone: user.phone_number,
            email: "",
            first_name: user.first_name,
            last_name: user.last_name,
            middle_name: user.patron,
            position: "Abiturent",
            birthdate: user.birth_date.toString(),
            gender_enum_id: user.gender,
            country: user.country,
            region: user.region,
            district: user.district,
            address: user.address
        });

        await send_login_password(password, phone_number)

        res.status(201).send({
            message: 'Foydalanuvchi yaratildi',
            login: phone_number,
            password
        });

    } catch (err) {
        next(err);
    }
};

export const statistic = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {

    } catch (err) {
        next(err)
    }
}

export function generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
