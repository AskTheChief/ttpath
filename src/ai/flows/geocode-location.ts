
'use server';

/**
 * @fileOverview A Genkit flow for geocoding a location string into coordinates.
 *
 * - geocodeLocation - A function that takes an address and returns latitude and longitude.
 * - GeocodeLocationInput - The input type for the geocodeLocation function.
 * - GeocodeLocationOutput - The return type for the geocodeLocation function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GeocodeLocationInputSchema = z.object({
  address: z.string().describe('The address or location to geocode.'),
});
export type GeocodeLocationInput = z.infer<typeof GeocodeLocationInputSchema>;

const GeocodeLocationOutputSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});
export type GeocodeLocationOutput = z.infer<typeof GeocodeLocationOutputSchema>;

export async function geocodeLocation(
  input: GeocodeLocationInput
): Promise<GeocodeLocationOutput> {
  return geocodeLocationFlow(input);
}

const geocodeLocationFlow = ai.defineFlow(
  {
    name: 'geocodeLocationFlow',
    inputSchema: GeocodeLocationInputSchema,
    outputSchema: GeocodeLocationOutputSchema,
  },
  async ({ address }) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key is not configured.');
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results[0]) {
      throw new Error(`Geocoding failed: ${data.status} - ${data.error_message || 'No results found.'}`);
    }

    const location = data.results[0].geometry.location;
    return {
      lat: location.lat,
      lng: location.lng,
    };
  }
);
