
'use client';

import { useRef, useEffect } from 'react';
import { Input, type InputProps } from '@/components/ui/input';

type LocationAutocompleteProps = InputProps & {
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void;
};

export default function LocationAutocomplete({ onPlaceSelected, ...props }: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete>();

  useEffect(() => {
    if (!inputRef.current || !window.google || !window.google.maps.places) {
      return;
    }

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['(cities)'],
      fields: ['formatted_address', 'geometry'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location && place.formatted_address) {
        onPlaceSelected(place);
      }
    });

  }, [onPlaceSelected]);
  
  return <Input ref={inputRef} {...props} />;
}
