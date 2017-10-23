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

    //Thhis code was used in multiple locations, thought it would be a good
    //idea to make its own function.  Name can be changed, couldn't think of
    //a better one
    PopulationBiologyMap.methods.resetMap = function() {
        removeHighlight();
        sidebar.close();
        // close open panels
        $('.collapse').collapse('hide');
        setTimeout(function () {
            resetPlots()
        }, delay);
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
                    default:
                        break;
                }
            }
        }
        // update the export fields dropdown
        updateExportFields(viewMode);

        return hasParameters;
    }

    //Private function to map the field types to the URL query parameters that we accept
    function mapTypeToURLParam(type) {
        switch (type) {
            case "Projects":
                return "projectID";
            case "Anywhere":
                return "text";
            case "Collection protocols":
                return "collection_protocol";
            case "Taxonomy":
                return "species";
            default:
                break;
        }
    }

    //Tasks that need to be done or events defined  when the page loads
    PopulationBiologyMap.extra.init = function() {
        new Clipboard('#generate-link');
        //PopulationBiologyMap.methods.applyParameters();
        $("#generate-link").click(function () {
            var view_param = "view=" + viewMode;
            var zoom_param = "&zoom_level=" + map.getZoom();
            var center = map.getCenter();
            var center_param = "&center=" + center.lat.toString() + "," + center.lng.toString();
            var highlighted_id = $(".highlight-marker").attr("id");
            var marker_param = '';
            var panel_param = "";
            var url = window.location.origin + window.location.pathname + "?";
            var search_items = $('#search_ac').tagsinput('items');
            //Using an object to store search terms that will be used to generate link
            var search_terms = {};
            var query_parameters = '';

            //Retrieve all the terms that were entered in the search box and organize them by type
            search_items.forEach(function(search_item) {
                if (search_terms[search_item.type] == undefined) {
                    search_terms[search_item.type] = [];
                }

                search_terms[search_item.type].push(search_item.value);
            });

            //Go through the search terms and add them to the correct query parameter
            $.each(search_terms, function(index, values) {
                if (values.length > 1) {
                    values.forEach(function(value) {
                        query_parameters = query_parameters + mapTypeToURLParam(index) + "[]=" + value + "&";
                    });
                } else {
                    query_parameters = query_parameters + mapTypeToURLParam(index) + "=" + values[0] + "&";
                }
            });

            //Set the selected marker and panel that was being viewed
            if (highlighted_id != undefined) {
                marker_param = "&markerID=" + highlighted_id;
                panel_param = "&panelID=" + $(".sidebar-pane.active").attr("id");
            }

            query_parameters = query_parameters + view_param + zoom_param + center_param + marker_param + panel_param;

            url = url + query_parameters;

            //Add URL to attribute used to copy to clipboard
            $("#generate-link").attr("data-clipboard-text", url);
            $("#generate-link-msg").show();
        });
        
        $("#generate-link").mousemove(function (){
            $("#generate-link-msg").fadeOut();
        });

        $(document).on('mouseenter', ".detailedTip", function () {
            var $this = $(this);
            if (this.offsetWidth < this.scrollWidth && !$this.attr('title')) {
                $this.tooltip({
                    title: $this.text(),
                    placement: "bottom"
                });
                $this.tooltip('show');
            }
        });
    }

    $(document).ready(function () {
        PopulationBiologyMap.extra.init();
    });
})(window.PopulationBiologyMap = window.PopulationBiologyMap || {}, jQuery);
