import {AuthenticatedRequest} from "../entity/interface/AuthenticatedRequest";
import {NextFunction, Response, Request} from "express";
import {AdmissionType} from "../entity/AdmissionType";
import {RestException} from "../middilwares/RestException";
import {AppDataSource} from "../config/db";
import {validFields} from "../utils/CustomErrors";

const admissionRepository = AppDataSource.getRepository(AdmissionType)
export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {name, icon} = req.body;

        validFields(['name', 'icon'], req.body);

        const admissionType = admissionRepository.create({name, icon});
        await admissionRepository.save(admissionType);

        res.status(201).json(admissionType);
    } catch (error) {
        next(error);
    }
};

// READ ALL (active only)
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const types = await admissionRepository.find({where: {deleted: false}, order: {id: "asc"}});
        res.json(types);
    } catch (error) {
        next(error);
    }
};


// UPDATE
export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {id} = req.params;
        const {name, icon} = req.body;

        const type = await admissionRepository.findOne({where: {id: Number(id), deleted: false}});

        if (!type) {
            throw RestException.badRequest("AdmissionType topilmadi");
        }

        type.name = name ?? type.name;
        type.icon = icon ?? type.icon;

        await admissionRepository.save(type);

        res.json(type);
    } catch (error) {
        next(error);
    }
};

// DELETE (soft delete)
export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {id} = req.params;

        const type = await admissionRepository.findOne({where: {id: Number(id), deleted: false}});

        if (!type) {
            throw RestException.badRequest("AdmissionType topilmadi");
        }

        type.deleted = true;
        await admissionRepository.save(type);

        res.json({message: "AdmissionType muvaffaqiyatli o‘chirildi"});
    } catch (error) {
        next(error);
    }
};