import { useState, useEffect } from 'react';

export function useLocation() {
  const [location, setLocation] = useState({
    loading: true,
    isUS: true,
    state: 'your state',
    country: 'your country',
    error: false,
  });

  useEffect(() => {
    async function fetchLocation() {
      try {
        const cached = sessionStorage.getItem('nemocLocation');
        if (cached) {
          setLocation({ ...JSON.parse(cached), loading: false });
          return;
        }

        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) throw new Error('Failed to fetch location');
        const data = await res.json();

        const locData = {
          isUS: data.country_code === 'US',
          state: data.region || 'your state',
          country: data.country_name || 'your country',
          error: false,
        };

        sessionStorage.setItem('nemocLocation', JSON.stringify(locData));
        setLocation({ ...locData, loading: false });

      } catch (err) {
        console.warn('Geolocation failed, falling back to defaults:', err);
        setLocation({
          loading: false,
          isUS: true,
          state: 'your state',
          country: 'your region',
          error: true,
        });
      }
    }

    fetchLocation();
  }, []);

  return location;
}
