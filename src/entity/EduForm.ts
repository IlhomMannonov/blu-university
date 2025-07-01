import {Column, Entity} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";

@Entity('edu_form')
export class EduForm extends BaseEntityFull {
    @Column({type: 'text', nullable: false})
    name_uz!: string;

    @Column({type: 'text', nullable: false})
    name_en!: string;

    @Column({type: 'text', nullable: false})
    name_ru!: string;
}