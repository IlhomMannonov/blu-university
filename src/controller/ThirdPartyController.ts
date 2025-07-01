import {AuthenticatedRequest} from "../entity/interface/AuthenticatedRequest";
import {NextFunction, Response} from "express";
import {get_status_by_id, getLeadByIds} from "../Service/AmoCRMServise";
import {AppDataSource} from "../config/db";
import {Admission} from "../entity/Admission";
import {In} from "typeorm";

const admissionRepository = AppDataSource.getRepository(Admission)

export const amocrm_update_pipline = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const ids = extractLeadIdsFromWebhook(req.body);
        const leads = await getLeadByIds(ids); // to'g'ri yozilishi uchun 'leeds' emas, 'leads'
        let admissions_id = []
        let pipeline_id
        let status_id

        for (const lead of leads) {
            const admissionField = lead.custom_fields_values?.filter((item: any) => {
                return item.field_name === 'Admission ID';
            });
            if (!admissionField) return

            pipeline_id = lead.pipeline_id
            status_id = lead.status_id

            admissions_id.push(admissionField[0].values[0].value);
        }

        if (pipeline_id && status_id) {
            const pip = await get_status_by_id(pipeline_id, status_id)
            console.log(pip)
            await admissionRepository.update(
                {id: In(admissions_id)},
                {amo_status: pip.name}
            );
        }

        res.status(200).send({message: "Webhook request"});

    } catch (err) {
        next(err);
    }
};

function extractLeadIdsFromWebhook(body: any): number[] {
    const leads = body?.leads?.status;
    if (!Array.isArray(leads)) return [];

    return leads
        .map(lead => Number(lead.id))
        .filter(id => !isNaN(id));
}