import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
  ) {}

  create(
    data: Pick<
      RefreshToken,
      'userId' | 'tokenHash' | 'expiresAt' | 'deviceName' | 'ipAddress' | 'userAgent'
    >,
  ): Promise<RefreshToken> {
    return this.repo.save(this.repo.create(data));
  }

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repo.findOne({ where: { tokenHash } });
  }

  async revokeById(id: string): Promise<void> {
    await this.repo.update({ id }, { isRevoked: true });
  }

  async revokeByHash(tokenHash: string): Promise<void> {
    await this.repo.update({ tokenHash }, { isRevoked: true });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.update({ userId, isRevoked: false }, { isRevoked: true });
  }
}
