
'use client';

import { useRef, useEffect, useState } from 'react';
import { Input, type InputProps } from '@/components/ui/input';

type LocationAutocompleteProps = InputProps & {
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void;
  initialValue?: string;
};

export default function LocationAutocomplete({ onPlaceSelected, initialValue = '', ...props }: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(initialValue);

  useEffect(() => {
    if (!inputRef.current || !window.google || !window.google.maps.places) {
      return;
    }

    if (!autocompleteRef.current) {
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        fields: ['formatted_address', 'geometry'],
      });
    }

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place && place.geometry && place.formatted_address) {
        setInputValue(place.formatted_address);
        onPlaceSelected(place);
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [onPlaceSelected]);

  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  return (
    <Input
      ref={inputRef}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      autoComplete="off"
      {...props}
    />
  );
}
