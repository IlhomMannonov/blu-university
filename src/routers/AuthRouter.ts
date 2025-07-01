import {Router} from 'express';
import {
    access_code_send,
    check_number,
    check_sms_code,
    login, login_admin,
    password_reset, register_admin,
    registerUser
} from "../controller/AuthController";

const router: Router = Router();

router.route('/check-phone')
    .post(check_number);

router.route('/register')
    .post(registerUser);

router.route('/check-sms')
    .post(check_sms_code);

router.route('/login')
    .post(login);

router.route('/access-code')
    .post(access_code_send);

router.route('/reset-password')
    .post(password_reset);

router.route('/a-register')
    .post(register_admin);

router.route('/a-login')
    .post(login_admin);

export default router;
