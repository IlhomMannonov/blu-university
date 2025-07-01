import {Column, Entity, JoinColumn, ManyToOne} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";
import {User} from "./User";
import {AdmissionType} from "./AdmissionType";
import {EduForm} from "./EduForm";
import {EduLang} from "./EduLang";
import {EduDirection} from "./EduDirection";

@Entity('admission')
export class Admission extends BaseEntityFull {

    @ManyToOne(() => User, user => user.id)
    @JoinColumn({name: 'user'})
    user!: User;

    @Column({name: 'user', nullable: true})
    user_id!: number; // Foreign key sifatida saqlanad

    //
    @ManyToOne(() => AdmissionType, admission_type => admission_type.id)
    @JoinColumn({name: 'admission_type_id'})
    admission_type!: AdmissionType;

    @Column({name: 'admission_type_id', nullable: true})
    admission_type_id!: number; // Foreign key sifatida saqlanad

    //TALIM MUASSASININING BITIRGAN YILI
    @Column({type: 'date', nullable: true})
    edu_end_date!: Date;


    // ATTACHMENT ID SAQLANADI RELATION QILINMAGANINI SABABI FILE S3 DA BOB QOLISHI HAM MUMKUN
    @Column({name: 'certificate_id', nullable: true})
    certificate_id!: number;


    @ManyToOne(() => EduForm, edu_form => edu_form.id)
    @JoinColumn({name: 'edu_form_id'})
    edu_form!: EduForm;

    @Column({name: 'edu_form_id', nullable: true})
    edu_form_id!: number; // Foreign key sifatida saqlanad


    @ManyToOne(() => EduLang, edu_lang => edu_lang.id)
    @JoinColumn({name: 'edu_lang_id'})
    edu_lang!: EduLang;

    @Column({name: 'edu_lang_id', nullable: true})
    edu_lang_id!: number; // Foreign key sifatida saqlanad


    @ManyToOne(() => EduDirection, edu_direction => edu_direction.id)
    @JoinColumn({name: 'edu_direction_id'})
    edu_direction!: EduDirection;

    @Column({name: 'edu_direction_id', nullable: true})
    edu_direction_id!: number; // Foreign key sifatida saqlanad


    @Column({name: 'amo_status', nullable: true})
    amo_status!: string; // Foreign key sifatida saqlanad

    @Column({name: 'amo_lead_id', nullable: true})
    amo_lead_id!: string; // Foreign key sifatida saqlanad

    @Column({name: 'contracted', nullable: true, default: false})
    contracted!: boolean; // Foreign key sifatida saqlanad

    @Column({name: 'edu_ins_id', nullable: true})
    edu_ins_id!: number; // Foreign key sifatida saqlanad


}