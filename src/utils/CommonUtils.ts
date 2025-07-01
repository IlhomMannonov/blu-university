export const isValidUzbekPhone = (phone: string): boolean => {
    return /^\+998[0-9]{9}$/.test(phone);
};

export const isValidPassword = (password: string): boolean => {
    return /^.{4,}$/.test(password);
};