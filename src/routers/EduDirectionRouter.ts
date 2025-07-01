import {Router} from "express";
import {create, getAll, remove, update} from "../controller/EduDirectionController";
import {verifyJwtToken} from "../middilwares/Security";

const router: Router = Router();

router.route('/create')
    .post(verifyJwtToken(['admin']), create);


router.route('/update/:id')
    .put(verifyJwtToken(['admin']), update);


router.route('/all')
    .get(getAll);


router.route('/delete/:id')
    .delete(verifyJwtToken(['admin']), remove);


export default router;