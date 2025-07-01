import {Router} from "express";
import {
    accept_step_3,
    accept_step_4,
    all_appointment,
    check_passport,
    choice_admission_type,
    create_admission,
    download_admission_request,
    download_contract_pdf,
    edu_data_select_options,
    enter_personal_data_auto,
    enter_personal_data_manual,
    get_admission,
    get_educational_institution,
    my_admission,
    reject_my_request,
    update_status
} from "../controller/AdmissionController";
import {verifyJwtToken} from "../middilwares/Security";

const router: Router = Router();

router.route('/manual-personal-data')
    .post(verifyJwtToken(['user']), enter_personal_data_manual);

router.route('/auto-personal-data')
    .post(verifyJwtToken(['user']), enter_personal_data_auto);

router.route('/check-passport')
    .post(verifyJwtToken(['user','admin']),check_passport);


router.route('/choice-type')
    .post(verifyJwtToken(['user']), choice_admission_type);

router.route("/edu-institution")
    .get(verifyJwtToken(), get_educational_institution)

router.route("/edu-institution-accept")
    .post(verifyJwtToken(['user']), accept_step_3)

router.route("/edu-data-select-options")
    .get(verifyJwtToken(), edu_data_select_options)

router.route("/edu-data-accept")
    .post(verifyJwtToken(['user']), accept_step_4)

router.route("/all-appointment")
    .post(verifyJwtToken(['admin', "manager"]), all_appointment)

router.route("/reject-my-admission")
    .post(verifyJwtToken(['user']), reject_my_request)

router.route("/my-admission")
    .get(verifyJwtToken(['user']), my_admission)

router.route("/admission-request-file/:id")
    .get(download_admission_request)

router.route("/update-status")
    .post(verifyJwtToken(['admin','manager']), update_status)

router.route("/get/:id")
    .get(verifyJwtToken(), get_admission)

router.route("/create-admission")
    .post(verifyJwtToken(), create_admission)

router.route("/download-contract/:admission_id")
        .get(download_contract_pdf)

export default router;
