/**
 * Created by Ioann on 09/03/2017.
 */



L.PopbioMarkers = L.MarkerDataLayer.extend({
    initialize: function (data, options) {
        // L.Util.setOptions(this, options);

        L.MarkerDataLayer.prototype.initialize.call(this, data, options);
        this.initLatLngStorage();



    },


    initLatLngStorage: function () {
        this.storedMarkerCoords = {};
    },

    saveLatLng: function (marker) {
        if (layer instanceof L.Marker) {
            var markerID = marker.options.icon.options.id;
            this.storedMarkerCoords[markerID] = marker.getLatLng()
        }
    },

    startingLatLng: function(marker) {
        // if (_.size(this.storedMarkerCoords) === 0) {
        //     console.log("Zero size")
        //     return marker.getLatLng();
        // }
        var markerId = marker.options.icon.options.id,
            thisObj = this;

        if (this.storedMarkerCoords[markerId]) {
            // console.log("Match: " + markerId)
            return this.storedMarkerCoords[markerId];
        } else {
            for (var i = 0, len = markerId.length; i < len; i++) {
                var idCopy = markerId.slice(0,(len-i));
                if (this.storedMarkerCoords[idCopy]){
                    // console.log("Parent found: " + idCopy + ' (' + markerId + ')')
                    return this.storedMarkerCoords[idCopy]
                }
            }


            var regexStr = new RegExp("^" + markerId);
            for (var key in this.selectedMarkersIDs) {
                if (this.selectedMarkersIDs.hasOwnProperty(key)){
                    var targetId = this.selectedMarkersIDs[key]
                    if (regexStr.test(key) && targetId) {
                        return this.selectedMarkersIDs[key]
                    }
                }
            }

            // console.log("Found nothing")
            return marker.getLatLng();
        }
    }

});


