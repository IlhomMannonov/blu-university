import {Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {User} from "./User";

@Entity('sms_code')
export class SmsCode {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({type: 'text', nullable: false})
    phone_number!: string;

    @Column({type: 'text', nullable: false})
    code!: string;

    @Column({type: 'boolean', default: false})
    is_checked!: boolean;

    @Column({type: 'varchar', length: 255, default: 'active'})
    status!: string;

    @ManyToOne(() => User, user => user.id)
    @JoinColumn({name: 'user'})
    user!: User;

    @Column({name: 'user', nullable: true})
    user_id!: number; // Foreign key sifatida saqlanad

    @CreateDateColumn({type: 'timestamp'})
    created_at!: Date;
}