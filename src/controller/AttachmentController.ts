import {NextFunction, Request, Response} from "express";
import multer, {MulterError} from 'multer';
import path from 'path';
import fs from 'fs';
import {AppDataSource} from "../config/db";
import {Attachment} from "../entity/Attachment";
import {RestException} from "../middilwares/RestException";

const attachmentRepository = AppDataSource.getRepository(Attachment);

export const uploadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    upload(req, res, async (err) => {
        if (err instanceof MulterError) {
            console.error(err);
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({
                    message: 'Kutilmagan fayl topildi! Iltimos, ruxsat etilgan fayl nomlari yoki sonini tekshiring.',
                });
            } else if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    message: 'Yuklanadigan fayllar soni cheklangan.',
                });
            } else {
                return res.status(500).json({
                    message: 'Fayl yuklashda xato yuz berdi',
                    error: err.message,
                });
            }
        } else if (err) {
            console.error("Fayl yuklashda xato:", err);
            return res.status(500).json({message: 'Fayl yuklashda xato yuz berdi'});
        }

        if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
            return res.status(400).json({message: 'Fayllar yuborilmagan!'});
        }

        try {
            const savedFiles = [];

            for (const file of req.files as Express.Multer.File[]) {
                const attachment = attachmentRepository.create({
                    original_name: file.originalname,
                    file_name: file.filename,
                    file_size: file.size,
                    href: `/root/admission_files/${file.filename}`,
                    file_type: getFileExtension(file.filename),
                });
                const savedAttachment = await attachmentRepository.save(attachment);
                savedFiles.push(savedAttachment);
            }

            res.status(200).json({
                message: 'Fayllar muvaffaqiyatli yuklandi',
                files: savedFiles,
            });
        } catch (error) {
            console.error("Fayllarni saqlashda xato:", error);
            res.status(500).json({
                message: 'Fayllarni saqlashda xato yuz berdi',
                error,
            });
        }
    });
};

export const getFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const file_id = req.params.id;
        if (!file_id) throw RestException.badRequest("file_id is required");

        const attachment = await attachmentRepository.findOne({where: {id: Number(file_id)}});
        if (!attachment) throw RestException.notFound("Fayl topilmadi");

        const filePath = path.join('/app/uploads', attachment.file_name);

        if (!fs.existsSync(filePath)) {
            res.status(404).json({message: 'Fayl serverda mavjud emas!'});
        }

        return res.sendFile(filePath, {root: '/'}); // asosiy o'zgarish shu
    } catch (error) {
        console.error('Faylni olishda xato:', error);
        res.status(500).json({message: 'Faylni olishda xatolik yuz berdi', error});
    }
};


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = '/app/uploads'; // Fayllar saqlanadigan papkani ko'rsatish

        // Papka mavjudligini tekshirish va kerak bo'lsa yaratish
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, {recursive: true});
        }

        cb(null, uploadPath); // Fayllar saqlanadigan papka
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Fayl nomini vaqt tamg'asi bilan o'zgartiramiz
    },
});


// Bir nechta faylni yuklash uchun `upload.array()` dan foydalanamiz
const upload = multer({
    storage,
    limits: {fileSize: 5 * 1024 * 1024}, // Maksimal fayl hajmi 5 MB
}).array('file', 10);

// `files` - bu form field nomi, `10` - yuklanadigan fayllar soni limiti
function getFileExtension(filename: string): string {
    return path.extname(filename);
}