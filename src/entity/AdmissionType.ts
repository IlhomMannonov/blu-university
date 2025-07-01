import {Column, Entity} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";

@Entity('admission_type')
export class AdmissionType extends BaseEntityFull{


    @Column({type: 'text', nullable: false})
    name!: string;

    @Column({type: 'text', nullable: false})
    icon!: string;

}