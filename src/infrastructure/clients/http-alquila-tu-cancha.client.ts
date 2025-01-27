import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import * as moment from 'moment';

import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';
import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';

@Injectable()
export class HTTPAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  private base_url: string;
  constructor(
    private httpService: HttpService,
    config: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.base_url = config.get<string>('ATC_BASE_URL', 'http://localhost:4000');
  }

  async getClubs(placeId: string): Promise<Club[]> {
    const key = `placeId-${placeId}-clubs`;

    try {
      const cache_clubs = await this.cacheManager.get<Club[]>(key);

      if (cache_clubs) return cache_clubs;

      const clubs = await this.httpService.axiosRef
        .get('clubs', {
          baseURL: this.base_url,
          params: { placeId },
        })
        .then((res) => res.data);

      await this.cacheManager.set(key, clubs, 1000 * 60 * 60);

      return clubs;
    } catch (error) {
      return [];
    }
  }

  async getCourts(clubId: number): Promise<Court[]> {
    const key = `clubId-${clubId}-courts`;

    try {
      const cache_courts = await this.cacheManager.get<Court[]>(key);

      if (cache_courts) return cache_courts;

      const courts = await this.httpService.axiosRef
        .get(`/clubs/${clubId}/courts`, {
          baseURL: this.base_url,
        })
        .then((res) => res.data);

      await this.cacheManager.set(key, courts, 1000 * 60 * 60);

      return courts;
    } catch (error) {
      return [];
    }
  }

  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    const key = `clubId-${clubId}-courts-${courtId}-date-${date}-slots`;

    try {
      const cache_slots = await this.cacheManager.get<Slot[]>(key);

      if (cache_slots) return cache_slots;

      const slots = await this.httpService.axiosRef
        .get(`/clubs/${clubId}/courts/${courtId}/slots`, {
          baseURL: this.base_url,
          params: { date: moment(date).format('YYYY-MM-DD') },
        })
        .then((res) => res.data);

      await this.cacheManager.set(key, slots, 1000 * 5);

      return slots;
    } catch (error) {
      return [];
    }
  }
}
