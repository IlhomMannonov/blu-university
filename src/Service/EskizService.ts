const mail: string = process.env.ESKIZ_EMAIL || "";
const pass: string = process.env.ESKIZ_PASS || "";
const eskizapi: string = process.env.ESKIZ_API || "";

export const loginEskiz = async (): Promise<void> => {
    const formData = new FormData();
    formData.append("email", mail);
    formData.append("password", pass);

    const res = await fetch(`${eskizapi}/auth/login`, {
        method: "POST",
        body: formData,
    });

    const token = await res.json();
    return token.data.token
};


export const send_sms = async (code: string, phone: string): Promise<void> => {
    const formData = new FormData();
    formData.append("mobile_phone", phone);
    formData.append("from", "4546");
    // formData.append("message", `Hurmatli ${code}! ${code} dan ${code} so'm qarz oldingiz. Jami qarzingiz ${code} so'm. Tashrifingiz uchun tashakkur!`);
    formData.append("message", `Sharq Universiteti. Qabuldan o'tish uchun tasdiqlash kod: ${code}`);

    const token = await loginEskiz()

    const res = await fetch(`${eskizapi}/message/sms/send`, {
        method: "POST",
        body: formData,
        headers: {"Authorization":`Bearer ${token}`},
    });

    return await res.json();
}

export const send_login_password = async (password: string, phone: string): Promise<void> => {

    const formData = new FormData();
    formData.append("mobile_phone", phone);
    formData.append("from", "4546");
    // formData.append("message", `Hurmatli ${code}! ${code} dan ${code} so'm qarz oldingiz. Jami qarzingiz ${code} so'm. Tashrifingiz uchun tashakkur!`);
    formData.append("message", `Sharq University. Qabul kabineti uchun Login: ${phone}, Parol: ${password}`);

    const token = await loginEskiz()

    const res = await fetch(`${eskizapi}/message/sms/send`, {
        method: "POST",
        body: formData,
        headers: {"Authorization":`Bearer ${token}`},
    });

    console.log(res)

    return await res.json();
}

