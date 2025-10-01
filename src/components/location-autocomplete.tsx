'use client';

import { useRef, useEffect, useState } from 'react';
import { Input, type InputProps } from '@/components/ui/input';

type LocationAutocompleteProps = Omit<InputProps, 'onChange' | 'value'> & {
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void;
  initialValue?: string;
};

export default function LocationAutocomplete({ onPlaceSelected, initialValue = '', ...props }: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete>();
  const [inputValue, setInputValue] = useState(initialValue);

  // When the initial value changes from the parent, update the input
  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (!inputRef.current || !window.google || !window.google.maps.places) {
      return;
    }

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['(cities)'],
      fields: ['formatted_address', 'geometry'],
    });

    const placeChangedListener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location && place.formatted_address) {
        setInputValue(place.formatted_address); // Update local state
        onPlaceSelected(place); // Propagate to parent
      }
    });
    
    return () => {
        // Clean up the listener when the component unmounts
        if (placeChangedListener) {
            placeChangedListener.remove();
        }
    };

  }, [onPlaceSelected]);
  
  return <Input 
    ref={inputRef} 
    value={inputValue}
    onChange={(e) => setInputValue(e.target.value)}
    {...props} 
  />;
}
