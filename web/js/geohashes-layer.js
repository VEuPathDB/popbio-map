/**
 * Created by Ioann on 17/2/2016.
 */


function addGeohashes(map, South, West, North, East, geolevel) {

    if (geohashesGrid) {
        map.removeLayer(geohashesGrid)
    }

    var geohashData = {
        "_type": "terms",
        "terms": []
    };

    var geohashes = geohash.bboxes(South, West, North, East, geolevel);

    function fillGeohashesCounts(element, index) {
        //console.log(a.join(""))
        geohashData.terms.push(
            {
                //"count": 1,
                "term": element
            }
        )
    }

    geohashes.forEach(fillGeohashesCounts);

    var options = {
        recordsField: 'terms',
        geohashField: 'term',
        //showLegendTooltips: false,
        //tooltipOptions: {
        //    fillOpacity: 0,
        //    opacity: 0.5,
        //    weight: 1,
        //    gradient: false
        //},
        layerOptions: {
            fill: false,
            clickable: false,
            fillOpacity: 0,
            opacity: 0.3,
            weight: 1,
            //color: "grey"
        }
    };


    geohashesGrid = new L.GeohashDataLayer(geohashData, options);

    map.addLayer(geohashesGrid);


}
