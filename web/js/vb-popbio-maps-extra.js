/*  This file is currently an "extra" file for vb-popbio, but I hope to eventually turn 
 *  this into the vb-popbio.js file.
 */
(function (PopulationBiologyMap, $, undefined) {

    //Object specific to this file
    PopulationBiologyMap.extra = {};

    if (PopulationBiologyMap.data == undefined) {
        PopulationBiologyMap.data = {};
    }

    if (PopulationBiologyMap.methods == undefined) {
        PopulationBiologyMap.methods = {};
    }

    //Might change to private function, but making it public for now until I know
    //that it is not needed anywhere else
    PopulationBiologyMap.methods.applyParameters = function () {
        // parse the URL parameters and update views and search terms
        var hasParameters = false;
        if (typeof urlParams.view === 'undefined' || urlParams.view === null) {
            $('#SelectView').selectpicker('val', 'smpl');
            // $('#view-mode').val('smpl');
        }

        for (var key in urlParams) {
            if (urlParams.hasOwnProperty(key)) {
                switch (key) {
                    case "view":
                        var view = urlParams[key];
                        $('#SelectView').selectpicker('val', view);
                        viewMode = view;
                        break;
                    case "stableID":
                        // have we passed multiple stable IDs??
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    value: element,
                                    activeTerm: true,
                                    type: 'Stable ID',
                                    field: mapTypeToField('Stable ID'),
                                    qtype: 'exact'
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: urlParams[key],
                                activeTerm: true,
                                type: 'Stable ID',
                                field: mapTypeToField('Stable ID'),
                                qtype: 'exact'
                            });
                        }
                        break;
                    case "projectID":
                        // have we passed multiple project IDs??
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    value: element,
                                    activeTerm: true,
                                    type: 'Projects',
                                    field: mapTypeToField('Projects'),
                                    qtype: 'exact'
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: urlParams[key],
                                activeTerm: true,
                                type: 'Projects',
                                field: mapTypeToField('Projects'),
                                qtype: 'exact'
                            });
                        }
                        break;
                    case "species":
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    value: element,
                                    activeTerm: true,
                                    type: 'Taxonomy',
                                    field: mapTypeToField('Taxonomy'),
                                    qtype: 'exact'
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: urlParams[key],
                                activeTerm: true,
                                type: 'Taxonomy',
                                field: mapTypeToField('Taxonomy'),
                                qtype: 'exact'
                            });
                        }
                        break;
                    case "collection_protocol":
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    value: element,
                                    activeTerm: true,
                                    type: 'Collection protocols',
                                    field: mapTypeToField('Collection protocols'),
                                    qtype: 'exact'
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: urlParams[key],
                                activeTerm: true,
                                type: 'Collection protocols',
                                field: mapTypeToField('Collection protocols'),
                                qtype: 'exact'
                            });
                        }
                        break;
                    case "text":
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    text: element,
                                    value: element,
                                    type: 'Anywhere',
                                    field: mapTypeToField('Anywhere'),
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                text: urlParams[key],
                                value: urlParams[key],
                                type: 'Anywhere',
                                field: mapTypeToField('Anywhere'),
                            });
                        }
                        break;
                    case "markerID":
                        highlightedId  = urlParams[key];
                        break;
                    case "zoom_level":
                        PopulationBiologyMap.data.zoomLevel = urlParams[key];
                        break;
                    case "center":
                        PopulationBiologyMap.data.center = urlParams[key].split(",").map(Number);
                        break;
                    case "panelID":
                        var panelId = urlParams[key];
                        $(".sidebar-pane.active").removeClass("active");
                        $(".sidebar-icon.active").removeClass("active");
                        $('[id="#' + panelId + '"]').parent().addClass("active");
                        $("#" + panelId).addClass("active");
                        break;
                    default :
                        break;
                }
            }
        }
        // update the export fields dropdown
        updateExportFields(viewMode);

        return hasParameters;
    }


    //Tasks that need to be done or events defined  when the page loads
    PopulationBiologyMap.extra.init = function() {
        //PopulationBiologyMap.methods.applyParameters();
    }

    $(document).ready(function () {
        PopulationBiologyMap.extra.init();
    });
    
    $(window).load(function (){
         //Selecting the marker that was selected if passed as parameter
        if (urlParams.hasOwnProperty('marker_coord')) {
            var marker_coord = urlParams['marker_coord'];
            var marker_bounds = L.latLngBounds(marker_coord);
            assetLayerGroup.eachLayer(function(marker) {
                if (marker instanceof L.Marker) {
                    if (marker_bounds.contains(marker.getLatLng())) {
                        highlightMarker(marker);
                        marker.fireEvent('click');
                    } 
                }
            });
        } 
    });

})(window.PopulationBiologyMap = window.PopulationBiologyMap || {}, jQuery);
