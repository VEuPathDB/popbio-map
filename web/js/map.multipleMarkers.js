/**
 * Created by Ioann on 03/03/2017.
 */

/*
    This Leaflet Class plugin to enable area selection
    Consists of the following:
    1) A geohash based layer to display the current geohash grid and save selected gridcells at the aggregation level
    the selection started
    2) Methods to add/remove/clear selected gridcells
    3) Methods to determine whether map markers fall within the selected gridcells
    4) Methods to check the enforce limits on the size of the selected area
    5) Methods to inform the user of selected samples and marker counts
    6) Methods for user interactions
    7) Methods to initiate a tutorial
 */



/*
 * L.Handler.ShiftDragZoom is used to add shift-drag zoom interaction to the map
 * (zoom to a selected bounding box), enabled by default.
 */

L.Map.mergeOptions({
    selectArea: true,
    maximumGridcells: 64,
    tutorial: false,
    tutorialDivId: false,
    controlPanel: false,
    controlPanelDivId: false,

});

L.Map.SelectMarkers = L.Class.extend({
    // markersLayer: L.featureGroup()
    //     .addTo(map),

    initialize: function (map) {
        // this map
        this._map = map;
        this._container = map._container;
        this._pane = map._panes.overlayPane;
        this.selectedMarkersIDs = {};


        // store selected markers here
        this._selectedMarkers = L.featureGroup();
        // .addTo(map);
        this.addHooks();
        map.on('unload', this._destroy, this);
    },

    // markersLayer: L.featureGroup()
    //     .addTo(this._map)
    // ,
    addHooks: function () {
        L.DomEvent.on(this._container, 'mousedown', this._onMouseDown, this);
        this._selectedMarkers.on('layeradd', this._onLayerAdd);
    },

    removeHooks: function () {
        L.DomEvent.off(this._container, 'mousedown', this._onMouseDown);
    },

    _onLayerAdd: function (e) {
        // console.dir(e);
        // highlightMarker(e.layer)
    },

    moved: function () {
        return this._moved;
    },


    _destroy: function () {
        this.removeHooks();
        L.DomUtil.remove(this._pane);
        delete this._pane;
    },

    _resetState: function () {
        this._moved = false;
    },

    _onMouseDown: function (e) {

        //DKDK VB-8709 easy way to disable ctrl+mouse dragging for selecting area event
        return false;

        if (!e.ctrlKey || ((e.which !== 1) && (e.button !== 1))) {
            return false;
        }

        map.dragging.disable();
        this._resetState();

        L.DomUtil.disableTextSelection();
        L.DomUtil.disableImageDrag();

        this._startPoint = this._map.mouseEventToContainerPoint(e);

        L.DomEvent.on(document, {
            contextmenu: L.DomEvent.stop,
            mousemove: this._onMouseMove,
            mouseup: this._onMouseUp,
            keydown: this._onKeyDown
        }, this);

    },

    _onMouseMove: function (e) {
        if (!this._moved) {
            this._moved = true;

            this._box = L.DomUtil.create('div', 'leaflet-select-box', this._container);
            L.DomUtil.addClass(this._container, 'leaflet-crosshair');

            this._map.fire('boxselectstart');
        }

        this._point = this._map.mouseEventToContainerPoint(e);

        var bounds = new L.bounds(this._point, this._startPoint),
            size = bounds.getSize();

        L.DomUtil.setPosition(this._box, bounds.min);

        this._box.style.width = size.x + 'px';
        this._box.style.height = size.y + 'px';
    },

    _finish: function () {
        if (this._moved) {
            L.DomUtil.remove(this._box);
            L.DomUtil.removeClass(this._container, 'leaflet-crosshair');
        }

        L.DomUtil.enableTextSelection();
        L.DomUtil.enableImageDrag();

        L.DomEvent.off(document, {
            contextmenu: L.DomEvent.stop,
            mousemove: this._onMouseMove,
            mouseup: this._onMouseUp,
            keydown: this._onKeyDown
        }, this);
        map.dragging.enable();

    },

    _onMouseUp: function (e) {

        if ((e.which !== 1) && (e.button !== 1)) {
            return;
        }

        this._finish();

        if (!this._moved) {
            return;
        }
        // Postpone to next JS tick so internal click event handling
        // still see it as "moved".
        setTimeout(L.Util.bind(this._resetState, this), 0);

        var bounds = new L.LatLngBounds(
            this._map.containerPointToLatLng(this._startPoint),
            this._map.containerPointToLatLng(this._point));

        this._map.fire('boxselectend', {boxSelectBounds: bounds});

        var selectMarkers = this;
        // var markersLayer = this._selectedMarkers;

        console.dir(bounds)
        geohashesGrid.eachLayer(function (layer) {
            if (layer.hasOwnProperty('_bounds')) {

                // console.dir(layer._bounds);
                // console.dir(layer._boundsToLatLngs());
                if (bounds.overlaps(layer._bounds)) {
                    selectMarkers.toggleGeohash(layer, assetLayerGroup);

                }
            }
        });

        // assetLayerGroup.eachLayer(function (layer) {
        //     if (layer instanceof L.Marker) {
        //
        //         if (bounds.contains(layer.getLatLng())) {
        //
        //             selectMarkers.toggleMarker(layer, assetLayerGroup);
        //         }
        //     }
        //
        //
        // });
        var zoomLevel = this._map.getZoom();
        var geoLevel = geohashLevel(zoomLevel, "geohash");
        if (urlParams.grid === "true" || $('#grid-toggle').prop('checked')) addGeohashes(map, geoLevel.slice(-1));


    },

    _onKeyDown: function (e) {
        if (e.keyCode === 27) {
            this._finish();
        }
    },

    getRandom: function (min, max) {
        return Math.random() * (max - min + 1) + min;
    },

    toggleMarker: function (marker, layer) {

        var selected = marker.options.icon.options.selected,
            markerID = marker.options.icon.options.id,
            thisObj = this;
        // remove marker from the layer
        var icon = marker._icon;

        layer.removeLayer(marker);
        if (selected) {
            marker.options.icon.options.selected = false;
            thisObj._selectedMarkers.removeLayer(marker);
            thisObj.selectedMarkersIDs[markerID] = false;

        } else {

            marker.options.icon.options.selected = true;
            thisObj._selectedMarkers.addLayer(marker);
            thisObj.selectedMarkersIDs[markerID] = true;
        }
        layer.addLayer(marker);

        // is marker already selected?

        // get marker ID
        // save the marker id
        // marker.options.icon.options.selected = true;
        // marker.options.icon.createIcon();
        // console.log(marker.getLatLng().toString())
    },

    toggleGeohash: function (geohashGrid, layer) {

        var selected = geohashGrid.options.selected,
            goehashID = geohashGrid.options.title,
            thisObj = this;
        // remove marker from the layer
        // var icon = geohashGrid._icon;

        // layer.removeLayer(geohashGrid);
        if (selected) {
            geohashGrid.options.selected = false;
            // thisObj._selectedMarkers.removeLayer(geohashGrid);
            thisObj.selectedMarkersIDs[goehashID] = false;

        } else {

            geohashGrid.options.selected = true;
            thisObj.selectedMarkersIDs[goehashID] = true;
        }

        // is marker already selected?

        // get marker ID
        // save the marker id
        // marker.options.icon.options.selected = true;
        // marker.options.icon.createIcon();
        // console.log(marker.getLatLng().toString())
    },

    isSelected: function (markerId) {
        if (_.size(this.selectedMarkersIDs) === 0) return false;
        if (this.selectedMarkersIDs[markerId]) {
            return "self";
        } else {
            for (var i = 0, len = markerId.length; i < len; i++) {
                var idCopy = markerId.slice(0, (len - i));
                if (this.selectedMarkersIDs[idCopy]) {
                    return "child"
                }
            }


            var regexStr = new RegExp("^" + markerId);
            for (var key in this.selectedMarkersIDs) {
                if (this.selectedMarkersIDs.hasOwnProperty(key)) {
                    var targetId = this.selectedMarkersIDs[key]
                    if (regexStr.test(key) && targetId) {
                        return "parent"
                    }
                }
            }


            return false;
        }
    },

    clearMarkers: function () {

    }
});

