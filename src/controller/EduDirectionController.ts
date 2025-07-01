import {AuthenticatedRequest} from "../entity/interface/AuthenticatedRequest";
import {NextFunction, Response} from "express";
import {validFields} from "../utils/CustomErrors";
import {AppDataSource} from "../config/db";
import {EduForm} from "../entity/EduForm";
import {RestException} from "../middilwares/RestException";
import {EduLang} from "../entity/EduLang";
import {EduDirection} from "../entity/EduDirection";

const eduFormRepository = AppDataSource.getRepository(EduForm)
const eduLangRepository = AppDataSource.getRepository(EduLang)
const eduDirectionRepository = AppDataSource.getRepository(EduDirection)

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {
            name_uz,
            name_en,
            name_ru,
            edu_lang_ids,
            year,
            direction_code,
            contract_price,
            exam_name,
            edu_form_id,
            admission_type_id
        } = req.body;

        validFields(['name_uz', 'name_en', 'name_ru', 'edu_lang_ids', 'year', 'direction_code', 'contract_price', 'exam_name', 'edu_form_id'], req.body);

        const edu_lang = await eduDirectionRepository.save({
            name_uz: name_uz,
            name_ru: name_ru,
            name_en: name_en,
            edu_lang_ids: edu_lang_ids,
            year: year,
            direction_code: direction_code,
            contract_price: contract_price,
            exam_name: exam_name,
            edu_form_id: edu_form_id,
            admission_type_id: admission_type_id,
        });
        res.status(201).json({data: {edu_form: edu_lang}, success: true});
    } catch (error) {
        next(error);
    }
};
export const getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await AppDataSource
            .createQueryRunner()
            .query(`
                SELECT ed.id,
                       ed.name_uz,
                       ed.name_en,
                       ed.name_ru,
                       ed.status,
                       ed.edu_lang_ids,
                       ed.year,
                       ed.direction_code,
                       ed.contract_price,
                       ed.exam_name,
                       ed.edu_form_id,

                       json_agg(el.*) FILTER (WHERE el.id IS NOT NULL) AS edu_langs, json_build_object(
                        'id', ef.id,
                        'name_uz', ef.name_uz,
                        'name_ru', ef.name_ru,
                        'name_en', ef.name_en
                                                                                     ) AS edu_form

                FROM edu_direction ed

                         LEFT JOIN LATERAL (
                    SELECT *
                    FROM edu_lang
                    WHERE id = ANY (ed.edu_lang_ids)
                      AND deleted = false
                        ) el ON true

                         LEFT JOIN edu_form ef ON ef.id = ed.edu_form_id AND ef.deleted = false

                WHERE ed.deleted = false

                GROUP BY ed.id, ef.id

                ORDER BY ed.created_at DESC
            `);

        res.status(200).json({data: result, success: true});
    } catch (error) {
        next(error);
    }
};


export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {id} = req.params;
        const {
            name_uz,
            name_en,
            name_ru,
            edu_lang_ids,
            year,
            direction_code,
            contract_price,
            exam_name,
            edu_form_id,
            admission_type_id,
        } = req.body;

        const eduDirection = await eduDirectionRepository.findOneBy({id: Number(id), deleted: false});
        if (!eduDirection) {
            throw RestException.notFound("Yo'nalish topilmadi");
        }

        if (name_uz !== undefined) eduDirection.name_uz = name_uz;
        if (name_en !== undefined) eduDirection.name_en = name_en;
        if (name_ru !== undefined) eduDirection.name_ru = name_ru;
        if (year !== undefined) eduDirection.year = year;
        if (direction_code !== undefined) eduDirection.direction_code = direction_code;
        if (contract_price !== undefined) eduDirection.contract_price = contract_price;
        if (exam_name !== undefined) eduDirection.exam_name = exam_name;
        if (edu_lang_ids !== undefined) eduDirection.edu_lang_ids = edu_lang_ids;
        if (edu_form_id !== undefined) eduDirection.edu_form_id = edu_form_id;
        if (admission_type_id !== undefined) eduDirection.admission_type_id = admission_type_id;


        await eduDirectionRepository.save(eduDirection);

        res.status(200).json({data: eduDirection, success: true});
    } catch (error) {
        next(error);
    }
};


export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {id} = req.params;

        const eduDirection = await eduDirectionRepository.findOneBy({id: +id, deleted: false});
        if (!eduDirection) {
            throw RestException.badRequest("EduLang not found")
        }

        eduDirection.deleted = true;
        await eduDirectionRepository.save(eduDirection);

        res.status(200).json({success: true, message: "EduLang deleted successfully"});
    } catch (error) {
        next(error);
    }
};

