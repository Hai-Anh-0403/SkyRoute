import { toWktPoint } from './geo.util';

describe('geo.util', () => {
  describe('toWktPoint', () => {
    it('outputs WKT POINT with longitude first and latitude second', () => {
      const wkt = toWktPoint({ lat: 11.9404, lng: 108.4583 });
      expect(wkt).toBe('POINT(108.4583 11.9404)');
    });

    it('throws when latitude is out of range', () => {
      expect(() => toWktPoint({ lat: 95, lng: 108.4583 })).toThrow(
        'Invalid latitude',
      );
    });

    it('throws when longitude is out of range', () => {
      expect(() => toWktPoint({ lat: 11.9404, lng: -181 })).toThrow(
        'Invalid longitude',
      );
    });
  });
});
