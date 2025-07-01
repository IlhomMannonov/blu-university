import {Router} from "express";
import {amocrm_update_pipline} from "../controller/ThirdPartyController";

const router: Router = Router();

router.route('/webhook')
    .post(amocrm_update_pipline);

export default router;
