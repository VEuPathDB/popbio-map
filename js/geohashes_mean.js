function initMap() {

    // create a map in the "map" div, set the view to a given place and zoom
    map = L.map('map').setView([18, 0.0], 3);
    assetLayerGroup = new L.LayerGroup();
    assetLayerGroup.addTo(map);

    L.tileLayer('https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png', {
        minZoom: 2,
        maxZoom: 13,
        noWrap: 1,
        detectRetina: 0,
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="http://mapbox.com">Mapbox</a>',
        id: 'examples.map-i875mjb7'
    }).addTo(map);

    map.spin(true);
    loadSolr(0, map.getZoom());
    map.spin(false);


    // detect when user changes zoom or pans around the map
    map.on("moveend", function () {
        loadSolr(1, map.getZoom());
        // map.spin(false);
        // console.log(map.getZoom());

    });
}