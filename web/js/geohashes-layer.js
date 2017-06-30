/**
 * Created by Ioann on 17/2/2016.
 */


function addGeohashes(objMap, force) {

    var geolevel = geohashLevel(endingZoom, "geohash").slice(-1);
    var startingGeolevel = geohashLevel(startingZooom, "geohash").slice(-1);

    // if (geolevel === startingGeolevel && !force ) return;

    // var geolevel = geohashLevel(zoomLevel, "geohash").slice(-1);
    var mapBounds = objMap.getBounds();
    var South = mapBounds.getSouth(), North = mapBounds.getNorth(), East = mapBounds.getEast(), West = mapBounds.getWest();

    if (geohashesGrid) {
        // setTimeout(function () {
        var i = 0;
        // geohashesGrid.eachLayer(function (layer) {
        //     // //     if (layer.options.className === "fade-in") {
        //     // //         var pane = geohashesGrid.getPane(layer)
        //     // //
        //     // //         L.DomUtil.setOpacity(pane, 0.1)
        //     // //         setTimeout(function () {
        //     // //             geohashesGrid.removeLayer(layer);
        //     if (i < 20) console.dir(layer)
        //     i++;
        //
        //     // //         }, 300)
        //     // //     }
        // });
        // },50)

        // $(".fade-in").fadeOut(300)


        objMap.removeLayer(geohashesGrid)
    }

    var geohashData = {
        "_type": "terms",
        "terms": []
    };

    var geohashes = geohash.bboxes(South, West, North, East, geolevel);
    // var lakis = GeoHash4.getGeohashesForBoundingBox(South, West, North, East, geolevel);

    // console.log(geohashes);
    // console.log(lakis);

    function fillGeohashesCounts(element, index) {
        geohashData.terms.push(
            {
                //"count": 1,
                term: element,
                selected: markers.isSelected(element)
            }
        )
    }

    geohashes.forEach(fillGeohashesCounts);

    var geohashFill = function (value) {
        if (!value) return "transparent";
        if (value === "self") return "darkblue";

        return "black";
    };

    var geohashStroke = function (value) {
        if (!value) return "grey";
        // if (value === "self") return "red";

        return "black";
    };

    var geohashFadeIn = function (value) {
        if (!value) return "";
        // if (value === "self") return "red";

        // return "fade-in";
        return;
    };

    var options = {
        recordsField: 'terms',
        geohashField: 'term',
        displayOptions: {
            selected: {
                fillColor: geohashFill,
                color: geohashStroke,
                className: geohashFadeIn
            }
        },
        layerOptions: {
            // fill       : false,
            clickable: false,
            fillOpacity: 0.2,
            opacity: 0.4,
            weight: 0.5,
            // color: "grey",
            dashArray: "4, 6",
            interactive: false
            // className: "fade-in"
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