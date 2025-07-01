import {AuthenticatedRequest} from "../entity/interface/AuthenticatedRequest";
import {NextFunction, Response} from "express";
import {validFields} from "../utils/CustomErrors";
import {AppDataSource} from "../config/db";
import {EduForm} from "../entity/EduForm";
import {RestException} from "../middilwares/RestException";

const eduFormRepository = AppDataSource.getRepository(EduForm)

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {name_uz, name_en, name_ru} = req.body;

        validFields(['name_uz', 'name_en', 'name_ru'], req.body);

        const edu_form = await eduFormRepository.save({
            name_uz: name_uz,
            name_ru: name_ru,
            name_en: name_en,
        });
        res.status(201).json({data: {edu_form: edu_form}, success: true});
    } catch (error) {
        next(error);
    }
};
export const getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const eduForms = await eduFormRepository.find({
            where: {deleted: false},
            order: {created_at: 'DESC'},
            select: ['id', 'name_uz', 'name_en', 'name_ru', 'status'],
        });
        res.status(200).json({data: eduForms, success: true});
    } catch (error) {
        next(error);
    }
};
export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {id} = req.params;
        const {name_uz, name_en, name_ru} = req.body;

        validFields(['name_uz', 'name_en', 'name_ru'], req.body);

        const eduForm = await eduFormRepository.findOneBy({id: +id, deleted: false});
        if (!eduForm) {
            throw RestException.badRequest("EduForm not found")
        }

        eduForm.name_uz = name_uz;
        eduForm.name_en = name_en;
        eduForm.name_ru = name_ru;

        await eduFormRepository.save(eduForm);

        res.status(200).json({data: {edu_form: eduForm}, success: true});
    } catch (error) {
        next(error);
    }
};
export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {id} = req.params;

        const eduForm = await eduFormRepository.findOneBy({id: +id, deleted: false});
        if (!eduForm) {
            throw RestException.badRequest("EduForm not found")
        }

        eduForm.deleted = true;
        await eduFormRepository.save(eduForm);

        res.status(200).json({success: true, message: "EduForm deleted successfully"});
    } catch (error) {
        next(error);
    }
};

