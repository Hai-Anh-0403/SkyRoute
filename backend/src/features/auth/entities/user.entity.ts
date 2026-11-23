import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../../shared/decorators/roles.decorator';

@Entity('users')
@Index('idx_users_active', ['isActive'])
@Index('idx_users_role', ['role'])
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  preferences: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20, default: 'traveler' })
  role: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
