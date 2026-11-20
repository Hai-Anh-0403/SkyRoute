import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  findActiveById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id, isActive: true } });
  }

  create(data: Pick<User, 'email' | 'passwordHash' | 'fullName'>): Promise<User> {
    const entity = this.repo.create({
      ...data,
      email: data.email.toLowerCase(),
    });
    return this.repo.save(entity);
  }

  async update(
    id: string,
    data: Partial<Pick<User, 'fullName' | 'avatarUrl' | 'preferences'>>,
  ): Promise<User | null> {
    const user = await this.findActiveById(id);
    if (!user) {
      return null;
    }
    Object.assign(user, data);
    return this.repo.save(user);
  }
}
