import {Router} from "express";
import {create_user, edit_user, get_user, get_users, getMe,} from "../controller/UserController";
import {verifyJwtToken} from "../middilwares/Security";

const router: Router = Router();

router.route('/me')
    .get(verifyJwtToken(), getMe);

router.route('/get-user/:id')
    .get(verifyJwtToken(), get_user);

router.route('/all')
    .get(verifyJwtToken(['admin', 'manager']), get_users);

router.route('/edit/:id')
    .put(verifyJwtToken(['admin', 'manager']), edit_user);

router.route('/delete-user/:id')
    .delete(verifyJwtToken(['admin']));

router.route('/create-user')
    .post(verifyJwtToken(['admin', 'manager']), create_user);

export default router;
