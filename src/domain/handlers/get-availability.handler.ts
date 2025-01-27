import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Cache } from 'cache-manager';

import {
  ClubWithAvailability,
  GetAvailabilityQuery,
} from '../commands/get-availaiblity.query';
import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../ports/aquila-tu-cancha.client';

@QueryHandler(GetAvailabilityQuery)
export class GetAvailabilityHandler
  implements IQueryHandler<GetAvailabilityQuery>
{
  constructor(
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    private alquilaTuCanchaClient: AlquilaTuCanchaClient,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async execute(query: GetAvailabilityQuery): Promise<ClubWithAvailability[]> {
    const key = `clubs-with-availability-${query.placeId}-${query.date}`;
    const cache_clubs = await this.cacheManager.get<ClubWithAvailability[]>(
      key,
    );

    if (cache_clubs) return cache_clubs;

    const clubs = await this.alquilaTuCanchaClient.getClubs(query.placeId);

    const clubs_with_availability: ClubWithAvailability[] = await Promise.all(
      clubs.map(async (club) => {
        const courts = await this.alquilaTuCanchaClient.getCourts(club.id);

        const courts_with_availability = await Promise.all(
          courts.map(async (court) => {
            const slots = await this.alquilaTuCanchaClient.getAvailableSlots(
              club.id,
              court.id,
              query.date,
            );

            return {
              ...court,
              available: slots,
            };
          }),
        );

        return {
          ...club,
          courts: courts_with_availability,
        };
      }),
    );

    await this.cacheManager.set(key, clubs_with_availability, 1000 * 10);

    return clubs_with_availability;
  }
}
