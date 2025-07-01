import axios from "axios";
// Login va token olish
export const login_oneid = async (): Promise<{ token: string }> => {
    const res = await axios.post(`https://qabul.kuaf.uz/api/auth/sign-in`, {
        phoneNumber: "998337820090",
        password: "57246Abs"
    });

    // Login javobidan tokenni olib qaytaramiz
    return {
        token: res.data.data.token // agar res.data.data.token bo‘lsa
    };
};

// Pasport ma’lumotlarini olish
export const get_info_passport = async (
    serialAndNumber: string,
    pinfl: string
): Promise<any> => {
    const login = await login_oneid();
    const res = await axios.post(
        `https://qabul.kuaf.uz/api/user/personal-info`,
        {
            serialAndNumber: serialAndNumber,
            pinfl: pinfl
        },
        {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${login.token}`
            }
        }
    );

    return res.data.data;
};