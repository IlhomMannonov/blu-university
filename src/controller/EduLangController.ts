import {AuthenticatedRequest} from "../entity/interface/AuthenticatedRequest";
import {NextFunction, Response} from "express";
import {validFields} from "../utils/CustomErrors";
import {AppDataSource} from "../config/db";
import {EduForm} from "../entity/EduForm";
import {RestException} from "../middilwares/RestException";
import {EduLang} from "../entity/EduLang";

const eduFormRepository = AppDataSource.getRepository(EduForm)
const eduLangRepository = AppDataSource.getRepository(EduLang)

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {name_uz, name_en, name_ru, edu_form_ids} = req.body;

        validFields(['name_uz', 'name_en', 'name_ru', 'edu_form_ids'], req.body);

        const edu_lang = await eduLangRepository.save({
            name_uz: name_uz,
            name_ru: name_ru,
            name_en: name_en,
            edu_form_ids: edu_form_ids
        });
        res.status(201).json({data: edu_lang, success: true});
    } catch (error) {
        next(error);
    }
};



export const getAll = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const result = await AppDataSource.query(`
      SELECT
          el.id,
          el.name_uz,
          el.name_en,
          el.name_ru,
          el.status,
          el.edu_form_ids,
          json_agg(ef.*) FILTER (WHERE ef.id IS NOT NULL) AS edu_forms
      FROM edu_lang el
      LEFT JOIN LATERAL (
          SELECT 
              ef.id, 
              ef.name_uz, 
              ef.name_ru, 
              ef.name_en, 
              ef.status
          FROM edu_form ef
          WHERE ef.id = ANY(el.edu_form_ids) AND ef.deleted = false
      ) ef ON true
      WHERE el.deleted = false
      GROUP BY el.id
      ORDER BY el.created_at DESC
    `)

        res.status(200).send({ data: result, success: true })
    } catch (error) {
        next(error)
    }
}

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {id} = req.params;
        const {name_uz, name_en, name_ru, edu_form_ids} = req.body;

        const eduLang = await eduLangRepository.findOneBy({id: Number(id), deleted: false});
        if (!eduLang) {
            throw RestException.badRequest("Til shakli topilmadi");
        }


        if (name_uz !== undefined) eduLang.name_uz = name_uz;
        if (name_en !== undefined) eduLang.name_en = name_en;
        if (name_ru !== undefined) eduLang.name_ru = name_ru;
        if (edu_form_ids !== undefined) eduLang.edu_form_ids = edu_form_ids;

        await eduLangRepository.save(eduLang);

        res.status(200).json({data: eduLang, success: true});
    } catch (error) {
        next(error);
    }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {id} = req.params;

        const eduLang = await eduLangRepository.findOneBy({id: +id, deleted: false});
        if (!eduLang) {
            throw RestException.badRequest("EduLang not found")
        }

        eduLang.deleted = true;
        await eduLangRepository.save(eduLang);

        res.status(200).json({success: true, message: "EduLang deleted successfully"});
    } catch (error) {
        next(error);
    }
};

