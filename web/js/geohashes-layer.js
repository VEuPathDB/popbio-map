/**
 * Created by Ioann on 17/2/2016.
 */


function addGeohashes(objMap, geolevel) {

    // var geolevel = geohashLevel(zoomLevel, "geohash").slice(-1);
    var mapBounds = objMap.getBounds();
    var South = mapBounds.getSouth(), North = mapBounds.getNorth(), East = mapBounds.getEast(), West = mapBounds.getWest();

    if (geohashesGrid) {
        objMap.removeLayer(geohashesGrid)
    }

    var geohashData = {
        "_type": "terms",
        "terms": []
    };

    var geohashes = geohash.bboxes(South, West, North, East, geolevel);
    var lakis = GeoHash4.getGeohashesForBoundingBox(South, West, North, East, geolevel);

    console.log(geohashes);
    console.log(lakis);

    function fillGeohashesCounts(element, index) {
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
        layerOptions: {
            fill       : false,
            clickable  : false,
            fillOpacity: 0,
            opacity    : 0.3,
            weight     : 1,
            //color: "grey"
        }
    };

    geohashesGrid = new L.GeohashDataLayer(geohashData, options);

    objMap.addLayer(geohashesGrid);

}

//ToDo: Convert this to an object

//L.GeohashGrid = L.GeohashDataLayer.extend({
//    options: {
//        recordsField: 'terms',
//        geohashField: 'term',
//        layerOptions: {
//            fill: false,
//            clickable: false,
//            fillOpacity: 0,
//            opacity: 0.3,
//            weight: 1
//            //color: "grey"
//        },
//        grid: false,
//        geolevel: 2,
//    },
//
//    data: {
//        "_type": "terms",
//        "terms": []
//    },
//
//
//    _fillGeohashes: function (parameters) {
//
//        if (!parameters.geolevel) parameters.geolevel = this.options.geolevel;
//        var geohashes = geohash.bboxes(parameters.South, parameters.West, parameters.North, parameters.East,
// parameters.geolevel);  function fillHash (element) { this.terms.push( { //"count": 1, "term": element } ) }
// geohashes.forEach(fillHash, this.data);   },  _addGrid: function (South, West, North, East, geolevel) { if
// (!geolevel) geolevel = this.geolevel; if (!this.options.grid) {  this._fillGeohashes({ South: South, West: West,
// North: North, East: East, geolevel: geolevel }); this.options.grid = true; } },  _removeGrid: function () { if
// (this.options.grid) { map.removeLayer(geohashesGrid); // find the proper name, from the variable this.options.grid =
// true;  } },  redrawGrid: function (parameters) { if (this.options.grid) { this._removeGrid(); // find the proper
// name, from the variable  }  this._addGrid(parameters.South, parameters.West, parameters.North, parameters.East,
// parameters.geolevel); }  });  L.geohashGrid = function (parameters) {   var newGrid = new L.GeohashGrid();   return
// newGrid; };