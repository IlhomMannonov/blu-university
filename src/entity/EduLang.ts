import {Column, Entity, JoinColumn, ManyToOne} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";
import {AdmissionType} from "./AdmissionType";
import {EduForm} from "./EduForm";

@Entity('edu_lang')
export class EduLang extends BaseEntityFull {

    @Column({type: 'text', nullable: false})
    name_uz!: string;

    @Column({type: 'text', nullable: false})
    name_en!: string;

    @Column({type: 'text', nullable: false})
    name_ru!: string;


    // TALIM SHAKLIGA RELATION BO'LADI

    @Column("int", {array: true, default: () => "'{}'"})
    edu_form_ids!: number[];
}