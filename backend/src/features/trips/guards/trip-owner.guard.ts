import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AuthUserPayload } from '../../../shared/decorators/current-user.decorator';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import { TripRepository } from '../repositories/trip.repository';

@Injectable()
export class TripOwnerGuard implements CanActivate {
  constructor(private readonly tripRepo: TripRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawTripId = request.params?.tripId ?? request.params?.id;
    const user = request.user as AuthUserPayload | undefined;

    if (!rawTripId || !/^\d+$/.test(String(rawTripId))) {
      throw new DomainException(
        'TRIP_001',
        'Trip not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const owner = await this.tripRepo.findOwnerById(String(rawTripId));
    if (!owner) {
      throw new DomainException(
        'TRIP_001',
        'Trip not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!user || String(owner.userId) !== String(user.userId)) {
      throw new DomainException(
        'AUTH_004',
        'User is not authorized for this resource',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
