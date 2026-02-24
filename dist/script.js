// 1. Initialization
mapboxgl.accessToken = 'pk.eyJ1IjoicXl6enoiLCJhIjoiY21rY2x5MWQwMDIzZDNoczNlejE5dmgzZSJ9.3QwFBnKxEJcNp5SuTRUuRQ'; 
const DATA_URL = 'https://raw.githubusercontent.com/qiyaozhang51-maker/A2/refs/heads/main/Battlefields_Inventory_Boundary.json';      

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [-3.8, 56.8],
    zoom: 9.2
});

// 2. Global Controls
map.addControl(new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    placeholder: 'Search battlefield...'
}), 'top-right');
map.addControl(new mapboxgl.NavigationControl(), 'top-right');

// 3. Reusable Layer Logic (Ensures persistence on style switch)
function initDataLayers() {
    if (!map.getSource('battlefields')) {
        map.addSource('battlefields', {
            type: 'geojson',
            data: DATA_URL,
            generateId: true 
        });

        map.addLayer({
            'id': 'battle-fill',
            'type': 'fill',
            'source': 'battlefields',
            'paint': {
                'fill-color': [
                    'interpolate', ['linear'], ['get', 'Shape_Area'],
                    0, '#fdbb2d',
                    5000000, '#e55e5e'
                ],
                'fill-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    0.9, 0.6
                ]
            }
        });

        map.addLayer({
            'id': 'battle-outline',
            'type': 'line',
            'source': 'battlefields',
            'paint': {
                'line-color': '#2c3e50',
                'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 3, 0.5]
            }
        });
    }
}

// 4. Map Events
map.on('style.load', () => {
    initDataLayers();
});

let hoveredId = null;

// Hover Interaction
map.on('mousemove', 'battle-fill', (e) => {
    if (e.features.length > 0) {
        if (hoveredId !== null) {
            map.setFeatureState({ source: 'battlefields', id: hoveredId }, { hover: false });
        }
        hoveredId = e.features[0].id;
        map.setFeatureState({ source: 'battlefields', id: hoveredId }, { hover: true });

        const props = e.features[0].properties;
        document.getElementById('info-content').innerHTML = `
            <span class="data-title">${props.DES_TITLE}</span>
            <p><strong>Authority:</strong> ${props.LOCAL_AUTH}</p>
            <p><strong>Area:</strong> ${(props.Shape_Area / 1000000).toFixed(2)} km²</p>
            <p>Click area for official documentation link.</p>
        `;
        map.getCanvas().style.cursor = 'pointer';
    }
});

map.on('mouseleave', 'battle-fill', () => {
    if (hoveredId !== null) {
        map.setFeatureState({ source: 'battlefields', id: hoveredId }, { hover: false });
    }
    hoveredId = null;
    document.getElementById('info-content').innerHTML = '<p class="instruction-text">Hover over a battlefield area to view data.</p>';
    map.getCanvas().style.cursor = '';
});

// Click Interaction
map.on('click', 'battle-fill', (e) => {
    
    const props = e.features[0].properties;
    
    const battleUrl = props.LINK || props.link;
    const battleName = props.DES_TITLE || props.des_title || "Unnamed Battlefield";

    
    let popupContent = `<h3>${battleName}</h3>`;
    
    if (battleUrl && battleUrl !== " ") {
        
        popupContent += `<strong>Official Record:</strong><br>
                         <a href="${battleUrl}" target="_blank" style="color:#e74c3c; font-weight:bold;">
                         Click here to open portal ↗
                         </a>`;
    } else {
        
        popupContent += `<p style="color:#888;">No official record link available for this site.</p>`;
    }

    new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(popupContent)
        .addTo(map);
});

// 5. UI Control Logic
document.getElementById('auth-filter').addEventListener('change', (e) => {
    const value = e.target.value;
    const filterExpr = value === 'all' ? null : ['==', ['get', 'LOCAL_AUTH'], value];
    if (map.getLayer('battle-fill')) {
        map.setFilter('battle-fill', filterExpr);
        map.setFilter('battle-outline', filterExpr);
    }
});

const inputs = document.getElementById('style-switcher').getElementsByTagName('input');
for (const input of inputs) {
    input.onclick = (style) => {
        map.setStyle('mapbox://styles/mapbox/' + style.target.id);
    };
}