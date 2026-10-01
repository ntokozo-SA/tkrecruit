import locationsUrl from '../data/locations.json?url';
import { Combobox } from './Combobox';

interface LocationInputProps {
  id: string;
  value: string;
  onChange: (location: string) => void;
  onBlur: () => void;
  invalid: boolean;
  describedBy?: string;
}

export function LocationInput(props: LocationInputProps) {
  return (
    <Combobox
      {...props}
      name="location"
      placeholder="Search for your city or country"
      listLabel="Locations"
      optionsUrl={locationsUrl}
      noMatchesText="No matches. Try the nearest larger city, or just your country."
    />
  );
}
