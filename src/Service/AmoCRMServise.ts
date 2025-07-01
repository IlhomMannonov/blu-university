import axios from "axios";
import amo_config from '../../amo_crm_config.json';

const base_api = 'https://sharquniversity.amocrm.ru/api/v4'
const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjE3NzkxOWMzNWQ0ZGUzNTc1MmMxODliY2FiZDVmYmY2ZTYwODI1ODQxMjI2ZmM3OWFkZTljZTYyYjRhOWYxMWI5Y2E1Yjg3YTU5ODY5MjE2In0.eyJhdWQiOiIzZTY1ZTllZC1hZjE5LTQyMGUtODE0OC02YjhmMzBmMDdhNmQiLCJqdGkiOiIxNzc5MTljMzVkNGRlMzU3NTJjMTg5YmNhYmQ1ZmJmNmU2MDgyNTg0MTIyNmZjNzlhZGU5Y2U2MmI0YTlmMTFiOWNhNWI4N2E1OTg2OTIxNiIsImlhdCI6MTc0NzY3NTg1OCwibmJmIjoxNzQ3Njc1ODU4LCJleHAiOjE4NTAzNDI0MDAsInN1YiI6IjEyNTIwMzA2IiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMyNDMzMDM4LCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiYjMxZTNkODQtMGE1Yy00OGFhLWExNTQtMDA1NTRiY2RkNTA2IiwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.X2t0qlET77yyQ3jLdgB1NZbpPgILgYJikUEitP2RjOWlT9lXODmw0N4B6TUrkOI3qND7P85tKLWHCluBFkhISfsC0a_rwlkQn_5L46I_HxoGd9Phh88_yXPXOIFqWSnrpeG1v3FOIfS8RP7vxXxseJDy8vdIDkQ5U3upC1bPRGEoZtXosWvRT6tNSn_S0WJ_m-_Yf37wzBFnTemeid9Exlw5erG2JyDdHOS9-FfVp1alR2ND9YQS_SKdNB1FzH-23RpLNiL6vaVgV99uX0q9QesSr-jqQ8ocyyM2KwHxPf7iBnGyMzWTdCXmuP5GXGBvDvKofBfkGUSDxVkKGA0gOg"


export const get_status_by_id = async (pipeline_id: number, status_id: number): Promise<any> => {
    try {
        const response = await axios.get(`${base_api}/leads/pipelines/${pipeline_id}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const statuses = response.data._embedded.statuses;

        const status = statuses.find((item: any) => item.id === status_id);

        if (!status) {
            throw new Error(`Status ID ${status_id} topilmadi`);
        }

        return status;
    } catch (error: any) {
        console.error('Xatolik:', error.response?.data || error.message);
        throw error;
    }
};

export const create_contact = async (data: {
    phone: string;
    email: string;
    first_name: string;
    last_name: string;
    middle_name: string;
    position: string;
    birthdate: string;
    gender_enum_id: string;
    country: string;
    region: string;
    district: string;
    address: string;
}): Promise<number | null> => {
    try {
        const fields = await getContactFields(); // 1. Custom fieldlarni olamiz
        const custom_fields_values = [
            {field_code: "PHONE", values: [{value: data.phone}]},
            {field_code: "EMAIL", values: [{value: data.email}]},
            {field_id: fields["ism"], values: [{value: data.first_name}]},
            {field_id: fields["familya"], values: [{value: data.last_name}]},
            {field_id: fields["ota ismi"], values: [{value: data.middle_name}]},
            {field_id: fields["должность"], values: [{value: data.position}]},
            {field_id: fields["tug'ilgan kuni"], values: [{value: data.birthdate ? data.birthdate : ''}]},
            {field_id: fields["jinsi"], values: [{value: data.gender_enum_id ? data.gender_enum_id : ""}]},
            {field_id: fields["country"], values: [{value: data.country ? data.country : ""}]},
            {field_id: fields["region"], values: [{value: data.region ? data.region : ""}]},
            {field_id: fields["district"], values: [{value: data.district ? data.district : ""}]},
            {field_id: fields["manzil"], values: [{value: data.address ? data.address : ""}]},
        ];

        // 2. Avval kontakt bor yoki yo‘qligini tekshiramiz
        const existing = await search_contact(data.phone);
        if (existing) {
            const contactId = existing.id;
            console.log("🔄 Kontakt topildi, yangilanmoqda:", contactId);

            await axios.patch(`${base_api}/contacts/${contactId}`, {
                name: `${data.last_name} ${data.first_name}`,
                custom_fields_values
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            return contactId;
        }

        // 3. Agar yo‘q bo‘lsa, yangi kontakt yaratamiz
        const response = await axios.post(`${base_api}/contacts`, [
            {
                name: `${data.last_name} ${data.first_name}`,
                custom_fields_values
            }
        ], {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const created = response.data._embedded?.contacts?.[0];
        console.log("✅ Yangi kontakt yaratildi:", created?.id);
        return created?.id ?? null;

    } catch (error: any) {
        console.error("❌ Kontakt yaratish/yangi qilishda xatolik:", JSON.stringify(error.response?.data, null, 2));
        return null;
    }
};


export const search_contact = async (phone: string): Promise<any | null> => {
    try {
        const response = await axios.get(`${base_api}/contacts`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            params: {query: phone}
        });

        const contacts = response.data._embedded?.contacts || [];
        return contacts.length > 0 ? contacts[0] : null;

    } catch (error) {
        console.error("❌ Qidirishda xatolik:");
        throw error;
    }
};

export const getContactFields = async (): Promise<Record<string, number>> => {
    const response = await axios.get(`${base_api}/contacts/custom_fields`, {
        headers: {Authorization: `Bearer ${token}`}
    });

    const fields = response.data._embedded?.custom_fields || [];

    const result: Record<string, number> = {};
    for (const field of fields) {
        result[field.name.toLowerCase()] = field.id;
    }

    return result;
};


export const create_deal = async (
    deal_name: string,
    contact_id: number,
    edu_lang_id: string,
    edu_type: string,
    edu_form: string,
    edu_direction: string,
    edu_end_date: string,
    admission_id: number,
    certificate_link: string,
    passport_file_link: string,
): Promise<any> => {
    try {
        // 1. Custom field'larni olish
        const fields = await getLeadFields(); // bu siz yozgan yoki yozadigan GET /leads/custom_fields funksiyasi
        // 2. Tugatgan sanani ISO formatga aylantirish
        const formatToAmoCrmDate = (dateStr: string): string => {
            return `${dateStr}T00:00:00+05:00`;
        };

        // 3. Deal (lead) ma'lumotlari
        const dealData = [
            {
                name: deal_name,
                pipeline_id: amo_config.first_create_pipline_id, // o'z pipeline_id'ingizni kiriting
                status_id: amo_config.first_create_status_id,
                _embedded: {
                    contacts: [{id: contact_id}],
                    tags: [
                        {name: "Qabul sayt"}
                    ],
                },

                custom_fields_values: [
                    {
                        field_id: fields["talim tili"],
                        values: [{value: edu_lang_id}]
                    },
                    {
                        field_id: fields["talim turi"],
                        values: [{value: edu_type}]
                    },
                    {
                        field_id: fields["talim shakli"],
                        values: [{value: edu_form}]
                    },
                    {
                        field_id: fields["talim yo'nalishi"],
                        values: [{value: edu_direction}]
                    },
                    {
                        field_id: fields["o'rta talim tugatgan yili"],
                        values: [{value: formatToAmoCrmDate(edu_end_date)}]
                    },
                    {
                        field_id: fields["admission id"],
                        values: [{value: admission_id}]
                    },
                    {
                        field_id: fields["certificate fayl"],
                        values: [{value: certificate_link}]
                    },
                    {
                        field_id: fields["pasport fayl"],
                        values: [{value: passport_file_link}]
                    }
                ]
            }
        ];

        const response = await axios.post(`${base_api}/leads`, dealData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const createdDeal = response.data._embedded?.leads?.[0];
        console.log("✅ Deal yaratildi:", createdDeal?.id);
        return createdDeal;

    } catch (error: any) {
        console.error("❌ Deal yaratishda xatolik:", JSON.stringify(error.response?.data, null, 2));
        return null;
    }
};

export const getLeadFields = async (): Promise<Record<string, number>> => {
    const res = await axios.get(`${base_api}/leads/custom_fields`, {
        headers: {Authorization: `Bearer ${token}`}
    });
    const fields = res.data._embedded?.custom_fields || [];
    const map: Record<string, number> = {};
    for (const f of fields) {
        map[f.name.toLowerCase()] = f.id;
    }
    return map;
};

export const getLeadByIds = async (lead_ids: number[]): Promise<any> => {
    try {
        const response = await axios.get(`${base_api}/leads`, {
            headers: {
                Authorization: `Bearer ${token}`
            },
            params: {
                'id[]': lead_ids
            }
        });

        return response.data?._embedded?.leads
    } catch (error: any) {
        if (error.response) {
            console.error('❌ Xatolik:', error.response.status, error.response.data);
        } else {
            console.error('❌ Xatolik:', error.message);
        }
    }
}


export const update_lead_status = async (pipeline_id: any, status_id: any, lead_id: any
): Promise<any> => {
    try {
        const response = await axios.patch(
            `${base_api}/leads/${lead_id}`,
            {
                pipeline_id: Number(pipeline_id),
                status_id: Number(status_id)
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error: any) {
        console.error('Lead status update xatosi:', error.response?.data || error.message)
    }
};