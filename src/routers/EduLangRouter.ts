import {Router} from "express";
import {verifyJwtToken} from "../middilwares/Security";
import {create, getAll, remove, update} from "../controller/EduLangController";

const router: Router = Router();

router.route('/create')
    .post(verifyJwtToken(['admin']), create);

router.route('/update/:id')
    .put(verifyJwtToken(['admin']), update);

router.route('/delete/:id')
    .delete(verifyJwtToken(['admin']), remove);

router.route('/all')
    .get(verifyJwtToken(), getAll);


export default router;
