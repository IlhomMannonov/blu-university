import {AuthenticatedRequest} from "../entity/interface/AuthenticatedRequest";
import {NextFunction, Response} from "express";
import {AppDataSource} from "../config/db";
import {User} from "../entity/User";
import {validFields} from "../utils/CustomErrors";
import {get_info_passport} from "../Service/PasportInfoService";
import {AdmissionType} from "../entity/AdmissionType";
import {RestException} from "../middilwares/RestException";
import {__} from "i18n";
import {Admission} from "../entity/Admission";
import educationalInstitutions from "../data/educational_institution.json";
import {Attachment} from "../entity/Attachment";
import {instanceToPlain} from "class-transformer";
import {EduDirection} from "../entity/EduDirection";
import {EduLang} from "../entity/EduLang";
import {EduForm} from "../entity/EduForm";
import puppeteer from 'puppeteer';
import ejs from 'ejs';
import path from 'path';
import {v4 as uuidv4} from 'uuid';
import {create_contact, create_deal, update_lead_status} from "../Service/AmoCRMServise";
import {Not} from "typeorm";
import amo_config from '../../amo_crm_config.json';
import fs, {promises as fsPromises} from "fs";
import QRCode from 'qrcode'
import {exec} from 'child_process'
import util from 'util'

import AdmZip from 'adm-zip'

const userRepository = AppDataSource.getRepository(User)
const admissionTypeRepository = AppDataSource.getRepository(AdmissionType)
const admissionRepository = AppDataSource.getRepository(Admission)
const attachmentRepository = AppDataSource.getRepository(Attachment)
const eduDirectionRepository = AppDataSource.getRepository(EduDirection)
const eduLangRepository = AppDataSource.getRepository(EduLang)
const eduFormRepository = AppDataSource.getRepository(EduForm)

// SHAXSIY MALUMOTLARNI RUCHNOY KIRGIZISH
export const enter_personal_data_manual = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {first_name, last_name, patron, passport_id, jshir, passport_file_id, birth_date} = req.body;

        // Maydonlar to'g'ri keladimi tekshiramiz
        validFields(['first_name', 'last_name', 'patron', 'passport_id', 'jshir', 'passport_file_id', 'birth_date'], req.body);


        const user: User = req.user;

        user.first_name = first_name;
        user.last_name = last_name;
        user.patron = patron;
        user.passport_id = passport_id;
        user.jshir = jshir;
        user.passport_file_id = passport_file_id;
        user.birth_date = new Date(birth_date); // Sana to'g'ri formatda bo'lishi kerak

        user.state = 'admission-type'

        await userRepository.save(user);

        await create_contact({
            phone: user.phone_number,
            email: "",
            first_name: user.first_name,
            last_name: user.last_name,
            middle_name: user.patron,
            position: "Abiturent",
            birthdate: user.birth_date.toString(),
            gender_enum_id: '',
            country: '',
            region: '',
            district: '',
            address: ''
        });

        user.password = ''
        res.status(200).json({
            success: true,
            message: "Shaxsiy ma’lumotlar muvaffaqiyatli saqlandi",
            data: user,
        });


    } catch (err) {
        next(err)
    }
}

// SHAXSIY MALUMOTLARNI AVTOMATIK KIRGAZISH
export const enter_personal_data_auto = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {serial, pinfl} = req.body;
        validFields(['serial', 'pinfl'], req.body)

        const data = await get_info_passport(serial, pinfl)

        const user: User = req.user;
        // Foydalanuvchi ma’lumotlarini yangilash
        user.first_name = data.firstName;
        user.last_name = data.lastName;
        user.patron = data.fatherName;
        user.passport_id = data.serialAndNumber;
        user.birth_date = new Date(data.birthDate);
        user.gender = data.gender;
        user.photo = data.photo;
        user.passport_expire_date = new Date(data.passportExpireDate);
        user.givenDate = new Date(data.givenDate);
        user.country = data.country;
        user.region = data.region;
        user.district = data.district;
        user.address = data.address;
        user.jshir = data.pinfl;

        user.state = 'admission-type'
        await userRepository.save(user);

        user.password = ''
        user.photo = ''

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
        res.status(200).json({
            success: true,
            message: "Ma'lumotlar muvaffaqiyatli yangilandi",
            data: user,
        });
    } catch (err) {
        next(err)
    }
}

// PASPORT MALUMOTLARINI TEKSHIRISH
export const check_passport = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {serial, pinfl} = req.body;
        validFields(['serial', 'pinfl'], req.body)
        try {

            const login = await get_info_passport(serial, pinfl)
            console.log(login)
            res.status(200).json(login)
        } catch (e) {
            console.log(e)
            res.status(400).json({success: false})

        }
    } catch (err) {
        next(err)
    }
}
// http://172.18.9.171/person/pinpp-and-document/'
// 2 - STEP UCHUN TALIM TURLARINI TANLASH
export const choice_admission_type = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {type_id} = req.body;

        validFields(['type_id'], req.body)

        const user = req.user;
        const admissionType = await admissionTypeRepository.findOne({where: {id: type_id, deleted: false}});
        if (!admissionType) throw RestException.badRequest(__("admission.not_found"))

        if (admissionType.status !== 'active') throw RestException.badRequest(__("admission.status_not_active"))


        // user faqat bitta ariza topshira oladi
        let user_admission = await admissionRepository.findOne({where: {user_id: req.user.id, deleted: false}});
        if (!user_admission) {
            user_admission = await admissionRepository.save({
                user_id: req.user.id,
            })
        }
        user_admission.admission_type_id = type_id;
        user_admission.status = 'progressing'
        await admissionRepository.save(user_admission)

        user.state = 'edu-data'
        await userRepository.save(user)
        user.password = ''
        user_admission.user = user;
        res.status(200).send({success: true, data: user_admission, message: "Muvaffaqiyatli saqlandi"})

    } catch (err) {
        next(err)
    }
}

export const edu_data_select_options = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        let user_admission = await admissionRepository.findOne({
            where: {user_id: req.user.id, deleted: false},
            relations: ['admission_type'],
        })
        if (!user_admission) throw RestException.badRequest("Avalgi malumotni to'ldiring")



        const eduDirections = await eduDirectionRepository.find({
            where: {deleted: false, admission_type_id: user_admission.admission_type_id},
            select: ['id', 'name_uz', 'name_en', 'name_ru', 'edu_lang_ids','edu_form_id']
        });

        const eduLangs = await eduLangRepository.find({
            where: {deleted: false},
            select: ['id', 'name_en', 'name_ru', 'name_uz', 'edu_form_ids']
        });
        const eduForms = await eduFormRepository.find({
            where: {deleted: false},
            select: ['id', 'name_en', 'name_ru', 'name_uz']
        });

        res.status(200).send({
            edu_forms: eduForms,
            edu_langs: eduLangs,
            edu_directions: eduDirections,
        });
    } catch (err) {
        next(err);
    }
}
//3 - STEP UCHUN MUASSASA, TUGATGAN YIL, SERTIFIKAT AGAR BO'LSA
export const accept_step_3 = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {edu_ins_id, file_id, end_date} = req.body;

        validFields(['edu_ins_id', 'end_date'], req.body)

        const user = req.user;

        let admission = await admissionRepository.findOne({where: {user_id: user.id, deleted: false}})
        if (!admission) throw RestException.badRequest("Admission topilmadi bundan oldingi bo'limdagi amallarni bajaring")

        const edu_ins = educationalInstitutions.find((item) => item.id === edu_ins_id)
        if (!edu_ins) throw RestException.badRequest("Talim muassasasi topilmadi")


        if (file_id) {
            const exists_file = await attachmentRepository.existsBy({id: file_id})
            if (!exists_file) throw RestException.badRequest("Fayl topilmadi")
            admission.certificate_id = file_id;
        }
        admission.edu_end_date = new Date(`${end_date}-01-01`)
        user.state = 'edu-directions'
        admission.edu_ins_id = Number(edu_ins_id)
        await userRepository.save(user)
        await admissionRepository.save(admission)

        user.password = ''
        res.status(200).send({
            success: true,
            data: {admission: instanceToPlain(admission), user: instanceToPlain(user)}
        })

    } catch (err) {
        next(err)
    }
}

export const accept_step_4 = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const {edu_form_id, edu_lang_id, edu_direction_id} = req.body;

        validFields(["edu_form_id", "edu_lang_id", "edu_direction_id"], req.body);

        const user = await userRepository.findOne({where: {id: req.user.id, deleted: false}})
        if (!user) throw RestException.badRequest("USER yo'q")

        let user_admission = await admissionRepository.findOne({
            where: {user_id: user.id, deleted: false},
            relations: ['admission_type'],
        })
        if (!user_admission) throw RestException.badRequest("Avalgi malumotni to'ldiring")


        // 1. EduForm tekshiruv
        const edu_form = await eduFormRepository.findOne({
            where: {id: edu_form_id, deleted: false}
        });
        if (!edu_form) {
            throw RestException.notFound("Ta'lim shakli topilmadi");
        }

        // 2. EduLang tekshiruv
        const edu_lang = await eduLangRepository.findOne({
            where: {id: edu_lang_id, deleted: false}
        });
        if (!edu_lang) {
            throw RestException.notFound("Ta'lim tili topilmadi");
        }

        if (!edu_lang.edu_form_ids?.includes(edu_form_id)) {
            throw RestException.badRequest("Ta'lim tili ushbu shakl bilan mos emas");
        }

        // 3. EduDirection tekshiruv
        const edu_direction = await eduDirectionRepository.findOne({
            where: {id: edu_direction_id, deleted: false}
        });
        if (!edu_direction) {
            throw RestException.notFound("Ta'lim yo'nalishi topilmadi");
        }

        if (!edu_direction.edu_lang_ids?.includes(edu_lang_id)) {
            throw RestException.badRequest("Ta'lim yo'nalishi ushbu til bilan mos emas");
        }
        console.log(user)


        const contact = await create_contact({
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

        const certificate_link = `${process.env.APP_URL}/attachment/get/${user_admission.certificate_id}`;
        const passport_link = `${process.env.APP_URL}/attachment/get/${user.passport_file_id}`;
        const lead = await create_deal(user.first_name + ' ' + user.last_name,
            Number(contact),
            edu_lang.name_uz,
            user_admission.admission_type.name,
            edu_form.name_uz,
            edu_direction.name_uz,
            user_admission.edu_end_date.toString(),
            user_admission.id,
            user_admission.certificate_id != null ? certificate_link : "",
            user.passport_file_id != null ? passport_link : "",
        )


        user.state = 'passed'
        await userRepository.save(user)


        user_admission.edu_form_id = edu_form_id;
        user_admission.edu_lang_id = edu_lang_id;
        user_admission.edu_direction_id = edu_direction_id;
        user_admission.status = 'pending';
        user_admission.amo_lead_id = lead.id
        await admissionRepository.save(user_admission)

        res.status(200).json({success: true, message: "Ariza muvoffaqiyatli yaratildi", data: user_admission});
    } catch (err) {
        next(err);
    }
};

export const get_educational_institution = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        res.status(200).send({data: educationalInstitutions});
    } catch (err) {
        next(err)
    }
}
// USER OZINI ARIZASINI BEKOR QILISH
export const reject_my_request = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {admission_id} = req.body;

        const admission = await admissionRepository.findOne({
            where: {
                id: admission_id,
                deleted: false,
                user_id: req.user.id
            }
        });
        if (!admission) throw RestException.badRequest(__("admission.not_found"))

        if (admission.status == 'accepted') {
            throw RestException.badRequest(__("admission.no_access_rejecting"))
        }
        admission.deleted = true;
        await admissionRepository.save(admission)

        const user: User = req.user;

        user.state = 'enter-personal-data'
        await userRepository.save(user)
        res.status(200).send({success: true, message: __("admission.rejected")})
    } catch (err) {
        next(err)
    }
}

//USERNI SHAXSIY ARIZASI
export const my_admission = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = req.user;

        const admission = await AppDataSource
            .createQueryBuilder(Admission, 'a')
            .leftJoin('a.admission_type', 'admission_type')
            .leftJoin('a.edu_form', 'edu_form')
            .leftJoin('a.edu_lang', 'edu_lang')
            .leftJoin('a.edu_direction', 'edu_direction')
            .leftJoin('a.user', 'user')
            .select([
                'a.id',
                'a.edu_end_date',
                'a.certificate_id',
                'a.created_at',
                'a.status',

                'admission_type.id',
                'admission_type.name',

                'edu_form.id',
                'edu_form.name_uz',
                'edu_form.name_ru',
                'edu_form.name_en',

                'edu_lang.id',
                'edu_lang.name_uz',
                'edu_lang.name_ru',
                'edu_lang.name_en',

                'edu_direction.id',
                'edu_direction.name_uz',
                'edu_direction.name_ru',
                'edu_direction.name_en',

                'user.id',
                'user.first_name',
                'user.last_name',
            ])
            .where('a.user_id = :userId', {userId: user.id})
            .andWhere('a.deleted = false')
            .andWhere('a.status <> :status', {status: 'progressing'})
            .orderBy('a.id', 'DESC')
            .getOne();


        res.status(200).json({data: admission, success: true});
    } catch (err) {
        next(err);
    }
};

//ARIZA STATUSINI O'ZGARITIRISH  ADMIN
export const update_status = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {admission_id, status} = req.body;
        validFields(["admission_id", 'status'], req.body);

        const admission = await admissionRepository.findOne({
            where: {
                id: admission_id,
                deleted: false,
            }
        });
        if (!admission) throw RestException.notFound("Ariza topilmadi")

        if (admission.status !== 'accepted' && admission.status !== 'rejected' && admission.status !== 'pending') throw RestException.badRequest("Bu ariza xali to'liq yakunlanmagan")

        if (status !== 'accepted' && status !== 'rejected' && status !== 'pending') throw RestException.badRequest('Faqat accepted, rejected, pending status jonatish mumkin')

        if (status === 'accepted') {
            await update_lead_status(amo_config.lead_accepted_pipline_id, amo_config.lead_accepted_status_id, admission.amo_lead_id)
        } else if (status === 'rejected') {
            await update_lead_status(amo_config.lead_rejected_pipline_id, amo_config.lead_rejected_status_id, admission.amo_lead_id)
        } else if ((status === 'pending')) {
            await update_lead_status(amo_config.first_create_pipline_id, amo_config.first_create_status_id, admission.amo_lead_id)

        }
        admission.status = status;
        await admissionRepository.save(admission)

        res.status(200).send({success: true, data: admission});
    } catch (err) {
        next(err)
    }
}

//ADMIN ADMISSION YARATADI
export const create_admission = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const {
            user_id,
            certificate_id,
            admission_type_id,
            edu_ins_id,
            edu_end_date,
            edu_form_id,
            edu_lang_id,
            edu_direction_id
        } = req.body;

        validFields([
            'user_id',
            'admission_type_id',
            'edu_ins_id',
            'edu_end_date',
            'edu_form_id',
            'edu_lang_id',
            'edu_direction_id'], req.body)

        //USERNI TEKSHIRAMIZ
        const user = await userRepository.findOne({where: {id: user_id, deleted: false}})
        if (!user) throw RestException.notFound("User mavjud emas")

        //USERNI AVALGI QABUL ARIZASINI TEKSHIRAMIZ
        const admission = await admissionRepository.findOne({
            where: {
                user_id: user_id,
                deleted: false,
                status: Not('progressing')
            }
        })
        //AGAR ARIZA BO'LSA YANGISINI QO'SHDIRMAYMIZ
        if (admission) throw RestException.notFound("Bu foydalanuvchida ariza mavjud")


        //ADMISSION TYPENI TEKSHIRAMIZ
        const admissionType = await admissionTypeRepository.findOne({where: {id: admission_type_id, deleted: false}});
        if (!admissionType) throw RestException.badRequest(__("admission.not_found"))
        if (admissionType.status !== 'active') throw RestException.badRequest(__("admission.status_not_active"))

        // TA'LIM MUASSASINI TEKSHIRAMIZ
        const edu_ins = educationalInstitutions.find((item) => item.id === edu_ins_id)
        if (!edu_ins) throw RestException.badRequest("Talim muassasasi topilmadi")


        //EDU FORMALARNI TEKSHIRAMIZ

        // 1. EduForm tekshiruv
        const edu_form = await eduFormRepository.findOne({
            where: {id: edu_form_id, deleted: false}
        });
        if (!edu_form) {
            throw RestException.notFound("Ta'lim shakli topilmadi");
        }

        // 2. EduLang tekshiruv
        const edu_lang = await eduLangRepository.findOne({
            where: {id: edu_lang_id, deleted: false}
        });
        if (!edu_lang) {
            throw RestException.notFound("Ta'lim tili topilmadi");
        }

        if (!edu_lang.edu_form_ids?.includes(edu_form_id)) {
            throw RestException.badRequest("Ta'lim tili ushbu shakl bilan mos emas");
        }

        // 3. EduDirection tekshiruv
        const edu_direction = await eduDirectionRepository.findOne({
            where: {id: edu_direction_id, deleted: false}
        });
        if (!edu_direction) {
            throw RestException.notFound("Ta'lim yo'nalishi topilmadi");
        }

        if (!edu_direction.edu_lang_ids?.includes(edu_lang_id)) {
            throw RestException.badRequest("Ta'lim yo'nalishi ushbu til bilan mos emas");
        }
        //SERTIFICATENI TEKSHIRAMIZ

        if (certificate_id) {
            const exists_file = await attachmentRepository.existsBy({id: certificate_id})
            if (!exists_file) throw RestException.badRequest("Fayl topilmadi")
        }

        const save_admission = await admissionRepository.save({
            user_id: user_id,
            admission_type_id: admission_type_id,
            edu_end_date: new Date(`${edu_end_date}-01-01`),
            edu_form: edu_form_id,
            edu_lang_id: edu_lang_id,
            edu_direction_id: edu_direction_id,
            contracted: false,
            certificate_id: certificate_id
        })


        const contact = await create_contact({
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
        const certificate_link = `${process.env.APP_URL}/attachment/get/${save_admission.certificate_id}`;
        const passport_link = `${process.env.APP_URL}/attachment/get/${user.passport_file_id}`;

        await create_deal(user.first_name + ' ' + user.last_name,
            Number(contact),
            edu_lang.name_uz,
            save_admission.admission_type.name,
            edu_form.name_uz,
            edu_direction.name_uz,
            save_admission.edu_end_date.toString(),
            save_admission.id,
            save_admission.certificate_id != null ? certificate_link : "",
            user.passport_file_id != null ? passport_link : "",
        )

        res.status(200).send({success: true, data: save_admission})


    } catch (err) {
        next(err)
    }
}

export const get_admission = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {

        const {id} = req.params;
        const queryBuilder = AppDataSource
            .createQueryBuilder()
            .select([
                'a',
                'user',
                'user.patron',
                'edu_form.id',
                'edu_form.name_uz',
                'edu_lang.id',
                'edu_lang.name_uz',
                'edu_direction.id',
                'edu_direction.name_uz',
                'admission_type.id',
                'admission_type.name',
                'admission_type.status',
                'admission_type.created_at',

            ])
            .from(Admission, 'a')
            .leftJoin('a.user', 'user')
            .leftJoin('a.edu_form', 'edu_form')
            .leftJoin('a.edu_lang', 'edu_lang')
            .leftJoin('a.edu_direction', 'edu_direction')
            .leftJoin('a.admission_type', 'admission_type')
            .where('a.deleted = false')
            .andWhere('a.status <> :status', {status: 'progressing'})
            .andWhere('a.id = :id', {id: id})

        const data = await queryBuilder.getOne()
        res.status(200).send({success: true, data: data})

    } catch (err) {
        next(err);
    }
}
export const download_admission_request = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const user_id = req.params.id;

        const user = await userRepository.findOne({
            where: {id: Number(user_id), deleted: false, state: "passed"},
        });

        if (!user) throw RestException.notFound("User not found");

        const admission = await admissionRepository.findOne({
            where: {user_id: Number(user_id), deleted: false},
            order: {id: "desc"},
            relations: ["edu_form", "edu_lang", "edu_direction", "admission_type"],
        });

        if (!admission) throw RestException.notFound("Admission not found");

        const templatePath = "/app/uploads/qayd.ejs";

        const base64Photo = user.photo
            ? user.photo.startsWith("data:image")
                ? user.photo
                : `data:image/jpeg;base64,${user.photo}`
            : "";

        const edu_ins = educationalInstitutions.find(
            (item) => item.id === admission.edu_ins_id
        );

        const data = {
            id: user.id,
            fullName: `${user.last_name} ${user.first_name} ${user.patron || ""}`,
            birthDate: user.birth_date,
            gender:
                user.gender ,
            passport: `${user.passport_id} : ${user.jshir}`,
            phone: user.phone_number,
            citizenship: user.country || "",
            address: user.address ,
            school: edu_ins?.name_uz || "—",
            graduationYear: admission.edu_end_date
                ? new Date(admission.edu_end_date).getFullYear()
                : "—",
            universityName: "Sharq University",
            direction: admission.edu_direction?.name_uz || "—",
            language: admission.edu_lang?.name_uz || "—",
            exam: admission.edu_direction?.exam_name || "—",
            privilegeType: "Milliy sertifikat",
            privilegeLang: "Pushtu tili",
            privilegeScore: "1232",
            privilegeSerail: "21231",
            privilegeDate: "2025-05-19",
            registrationTime: formatCustomDate(admission.created_at),
            updateRegistrationTime: formatCustomDate(admission.updated_at),
            photo: base64Photo,
            eduType: admission.admission_type.name,
        };

        const html = await ejs.renderFile(templatePath, data, {async: true});
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(html, {waitUntil: "networkidle0"});

        const fileName = `qayd_varaqasi_${uuidv4()}.pdf`;
        const filePath = `/app/uploads/${fileName}`;

        await page.pdf({path: filePath, format: "A4"});
        await browser.close();

        // ✅ Foydalanuvchiga faylni yuborish
        res.download(filePath, "/app/uploads/qayd_varaqasi.pdf", async (err) => {
            try {
                await fsPromises.unlink(filePath); // Faylni avtomatik o‘chiramiz
            } catch (unlinkErr) {
                console.error("Faylni o‘chirishda xatolik:", unlinkErr);
            }

            if (err) {
                next(err);
            }
        });


    } catch (err) {
        next(err);
    }
};

export const all_appointment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {
            page = 1,
            limit = 20,
            edu_form_ids,
            edu_lang_ids,
            edu_direction_ids,
            search
        } = req.body;


        const offset = (Number(page) - 1) * Number(limit);

        const queryBuilder = AppDataSource
            .getRepository(Admission)
            .createQueryBuilder('a')
            .leftJoinAndSelect('a.user', 'user', 'user.state = :state', {state: 'passed'})
            .leftJoinAndSelect('a.edu_form', 'edu_form')
            .leftJoinAndSelect('a.edu_lang', 'edu_lang')
            .leftJoinAndSelect('a.edu_direction', 'edu_direction')
            .leftJoinAndSelect('a.admission_type', 'admission_type')
            .where('a.deleted = false')
            .andWhere('a.status <> :status', {status: 'progressing'});

        // === FILTERLAR ===
        if (edu_form_ids) {
            const ids = typeof edu_form_ids === 'string'
                ? edu_form_ids.split(',').map(id => Number(id))
                : (edu_form_ids as string[]).map(id => Number(id));

            if (ids.length) {
                queryBuilder.andWhere('a.edu_form_id IN (:...ids_form)', {ids_form: ids});
            }
        }

        if (edu_lang_ids) {
            const ids = typeof edu_lang_ids === 'string'
                ? edu_lang_ids.split(',').map(id => Number(id))
                : (edu_lang_ids as string[]).map(id => Number(id));

            if (ids.length) {
                queryBuilder.andWhere('a.edu_lang_id IN (:...ids_lang)', {ids_lang: ids});
            }
        }

        if (edu_direction_ids) {
            const ids = typeof edu_direction_ids === 'string'
                ? edu_direction_ids.split(',').map(id => Number(id))
                : (edu_direction_ids as string[]).map(id => Number(id));

            if (ids.length) {
                queryBuilder.andWhere('a.edu_direction_id IN (:...ids_direction)', {ids_direction: ids});
            }
        }

        // === QIDIRUV ===
        if (search) {
            const s = `%${search}%`;
            queryBuilder.andWhere(`
                (
                    CAST(a.id AS TEXT) ILIKE :s OR
                    CAST(user.id AS TEXT) ILIKE :s OR
                    user.first_name ILIKE :s OR
                    user.last_name ILIKE :s OR
                    user.phone_number ILIKE :s
                )
            `, {s});
        }

        // === PAGINATION va NATIJA ===
        queryBuilder
            .orderBy('a.created_at', 'DESC')
            .skip(offset)
            .take(Number(limit));

        const [data, total] = await queryBuilder.getManyAndCount();

        res.status(200).json({
            success: true,
            data,
            total,
            page: Number(page),
            last_page: Math.ceil(total / Number(limit))
        });
    } catch (err) {
        next(err);
    }
};


export const download_contract = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {admission_id} = req.params;


        const admission = await admissionRepository.findOne({
            where: {id: Number(admission_id), deleted: false},
            order: {id: "desc"},
            relations: ["edu_form", "edu_lang", "edu_direction", "admission_type", 'user'],
        });

        if (!admission) throw RestException.notFound("shartnoma mavjud emaas")

        // const templatePath = "/root/admission_files/contract.ejs";
        const templatePath = "/root/admission_files/contract.ejs";

        const user = admission.user;
        const data = {
            contract_id: admission.user.passport_id,
            date: formatDateToYMD(admission.created_at),
            edu_direction: admission.edu_direction.name_uz,
            edu_lang: admission.edu_lang.name_uz,
            edu_type: admission.admission_type.name,
            edu_form: admission.edu_form.name_uz,
            contract_price: admission.edu_direction.contract_price,
            fio: `${user.first_name} ${user.last_name} ${user.patron}`,
            address: user.address,
            passport_id: user.passport_id,
            phone_number: user.phone_number,
            edu_year: admission.edu_direction.year,
            direction_code: admission.edu_direction.direction_code,
            jshir: user.jshir,
            qr_code: await generateQRCode(`${process.env.APP_URL}/admission/download-contract/${admission_id}`)
        };

        const html = await ejs.renderFile(templatePath, data, {async: true});
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(html, {waitUntil: "networkidle0"});

        const fileName = `shartnoma_${uuidv4()}.pdf`;
        const filePath = `/root/admission_files/${fileName}`;

        await page.pdf({path: filePath, format: "A4"});
        await browser.close();

        // ✅ Foydalanuvchiga faylni yuborish
        res.download(filePath, "/root/admission_files/contract.pdf", async (err) => {
            try {
                await fsPromises.unlink(filePath); // Faylni avtomatik o‘chiramiz
            } catch (unlinkErr) {
                console.error("Faylni o‘chirishda xatolik:", unlinkErr);
            }

            if (err) {
                next(err);
            }
        });


    } catch (err) {
        next(err)
    }

}
const execPromise = util.promisify(exec)
export const download_contract_pdf = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {admission_id} = req.params

        const admission = await admissionRepository.findOne({
            where: {id: Number(admission_id), deleted: false},
            relations: ['edu_form', 'edu_lang', 'edu_direction', 'admission_type', 'user']
        })

        if (!admission) throw RestException.notFound("Shartnoma topilmadi")

        const user = admission.user

        const data = {
            contract_id: user.passport_id,
            date: formatDateToYMD(admission.created_at),
            edu_direction: admission.edu_direction.name_uz,
            edu_lang: admission.edu_lang.name_uz,
            edu_type: admission.admission_type.name,
            edu_form: admission.edu_form.name_uz,
            price: admission.edu_direction.contract_price,
            fio: `${user.first_name} ${user.last_name} ${user.patron}`,
            address: user.address,
            passport_id: user.passport_id,
            phone_number: user.phone_number,
            edu_year: admission.edu_direction.year,
            direction_code: admission.edu_direction.direction_code,
            jshir: user.jshir
        }

        const templatePath = path.resolve('src/templates/contract_template.docx')
        const tempDocxPath = path.resolve('src/templates', `contract_${uuidv4()}.docx`)
        fs.copyFileSync(templatePath, tempDocxPath)

        const zip = new AdmZip(tempDocxPath)
        const documentXml = zip.readAsText('word/document.xml')

        // Kalit so‘zlar `key:contract_id` ko‘rinishida bo‘lishi kerak
        let updatedXml = documentXml
        for (const [key, value] of Object.entries(data)) {
            const regex = new RegExp(`${key}`, 'g')
            updatedXml = updatedXml.replace(regex, value?.toString() || '')
        }

        zip.updateFile('word/document.xml', Buffer.from(updatedXml, 'utf-8'))
        zip.writeZip(tempDocxPath)

        const pdfPath = tempDocxPath.replace('.docx', '.pdf')

        // LibreOffice orqali PDFga aylantirish
        await execPromise(`libreoffice --headless --convert-to pdf --outdir src/templates ${tempDocxPath}`)

        res.download(pdfPath, 'contract.pdf', async (err) => {
            try {
                await fsPromises.unlink(tempDocxPath)
                await fsPromises.unlink(pdfPath)
            } catch (e) {
                console.error('Faylni o‘chirishda xatolik:', e)
            }

            if (err) next(err)
        })

    } catch (err) {
        next(err)
    }
}

function formatCustomDate(date: Date): string {
    const year = date.getFullYear();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 0-based
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${day}-${month} ${hours}:${minutes}:${seconds}`;
}

export const formatDateToYMD = (date: Date): string => {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0') // 0-based
    const day = date.getDate().toString().padStart(2, '0')

    return `${year}-${month}-${day}`
}


export const generateQRCode = async (text: string): Promise<string> => {
    try {
        const qrImageDataUrl = await QRCode.toDataURL(text)
        return qrImageDataUrl // bu `data:image/png;base64,...` formatda
    } catch (err) {
        throw new Error('QR code generatsiya qilishda xatolik yuz berdi')
    }
}