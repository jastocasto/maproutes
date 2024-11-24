// Initialize the map
const map = L.map('map').setView([51.505, -0.09], 13); // Default location: London

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

// Marker for start point
let startMarker = null;

// Function to fetch isochrone data from OpenRouteService
async function fetchIsochrone(lat, lon, profile, range) {
    const apiKey = '5b3ce3597851110001cf62480f8a5da8fc4444d680755764310fc3e1'; // Replace with your API key
    const url = `https://api.openrouteservice.org/v2/isochrones/${profile}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: apiKey,
            },
            body: JSON.stringify({
                locations: [[lon, lat]], // Coordinates in [longitude, latitude] format
                range: [range],         // Time range in seconds
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenRouteService API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching isochrone data:', error);
        throw new Error('Failed to fetch isochrone data. Please check your API key or network connection.');
    }
}

// Function to geocode an address using Nominatim
async function geocodeAddress(address) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${address}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.length === 0) {
            throw new Error('Address not found.');
        }

        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch (error) {
        console.error('Error geocoding address:', error);
        throw new Error('Failed to geocode address. Please check the input.');
    }
}

// Event listener for map click to set a start point
map.on('click', (e) => {
    const { lat, lng } = e.latlng;

    // Remove the previous marker, if any
    if (startMarker) {
        map.removeLayer(startMarker);
    }

    // Add a new marker at the clicked location
    startMarker = L.marker([lat, lng]).addTo(map);

    // Set the coordinates as the value in the address input field
    document.getElementById('address').value = `${lat}, ${lng}`;
});

// Event listener for the "Find Reachable Area" button
document.getElementById('submit').addEventListener('click', async () => {
    const addressInput = document.getElementById('address').value.trim();
    const transportationMode = document.getElementById('transportation-mode').value;
    const timeFrameMinutes = parseInt(document.getElementById('time-frame').value, 10);
    const timeFrameSeconds = timeFrameMinutes * 60;

    if (!addressInput) {
        alert('Please enter an address or select a point on the map.');
        return;
    }

    try {
        let startPoint;

        // Determine whether the input is coordinates or an address
        if (addressInput.includes(',')) {
            // Parse coordinates directly from the input
            const [lat, lon] = addressInput.split(',').map(Number);
            startPoint = { lat, lon };

            if (isNaN(lat) || isNaN(lon)) {
                throw new Error('Invalid coordinates entered.');
            }
        } else {
            // Geocode the address to get coordinates
            startPoint = await geocodeAddress(addressInput);
        }

        const { lat, lon } = startPoint;

        // Set the map view to the start point
        map.setView([lat, lon], 14);

        // Fetch isochrone data
        const isochroneData = await fetchIsochrone(lat, lon, transportationMode, timeFrameSeconds);

        // Clear previous isochrone layers from the map
        map.eachLayer((layer) => {
            if (layer.options && layer.options.color === '#ff7800') {
                map.removeLayer(layer);
            }
        });

        // Add the isochrone as a GeoJSON layer to the map
        L.geoJSON(isochroneData, {
            style: {
                color: '#ff7800',
                weight: 2,
                opacity: 0.65,
            },
        }).addTo(map);
    } catch (error) {
        alert(error.message);
    }
});
