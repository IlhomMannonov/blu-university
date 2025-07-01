import {Column, Entity} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";
import {Role} from "./template/Role";

@Entity('users')
export class User extends BaseEntityFull {


    @Column({type: 'varchar', length: 255, nullable: true})
    first_name!: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    last_name!: string;
    @Column({type: 'varchar', length: 255, nullable: true})
    phone_number!: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    patron!: string;

    @Column({type: 'varchar', length: 255, unique: true, nullable: true})
    password!: string

    @Column({type: 'timestamp', nullable: true})
    last_login_time!: Date;

    @Column({type: 'boolean', default: false})
    phone_verified!: boolean;

    @Column({type: 'boolean', default: false})
    email_verified!: boolean;

    @Column({type: 'varchar', length: 255, nullable: true})
    state!: string;

    @Column({type: 'boolean', default: false})
    is_bot_user!: boolean;


    // PERSONAL DATA
    @Column({type: 'bigint', nullable: true})
    passport_file_id!: number;


    @Column({type: 'varchar', length: 255, nullable: true})
    jshir!: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    passport_id!: string;

    @Column({type: 'date', nullable: true})
    birth_date!: Date;

    @Column({type: 'text', nullable: true})
    photo!: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    gender!: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    passport_expire_date!: Date;

    @Column({type: 'varchar', length: 255, nullable: true})
    givenDate!: Date;


    @Column({type: 'varchar', length: 255, nullable: true})
    country!: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    region!: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    district!: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    address!: string;

    @Column({
        type: 'enum', enum: Role, nullable: true, default: Role.USER
    })
    role!: Role;

}
