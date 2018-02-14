/*  This file is currently an "extra" file for vb-popbio, but I hope to eventually turn 
 *  this into the vb-popbio.js file.
 */
(function (PopulationBiologyMap, $, undefined) {

    //Local variables used withing the object
    var monthIndex = {"Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6, "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12};

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

    //Properly add the seasonal filter to search
    PopulationBiologyMap.methods.addSeason = function (months) {
        var objRanges = constructSeasonal(months);
        // add the filter, by keeping the value the same ('seasonal') we ensure
        // that there's only one seasonal filter enabled at any given point
        if (checkSeasonal()) {
            // adding the item with replace: true will prevent the map from updating
            // it will update once we remove the old tag
            $('#search_ac').tagsinput('add', {
                value: objRanges.rangesText.toString(),
                ranges: objRanges.ranges,
                replace: true,
                type: 'Seasonal',
                field: 'collection_season'
            });
            $('#search_ac').tagsinput('remove', checkSeasonal());
        } else {
            $('#search_ac').tagsinput('add', {
                value: objRanges.rangesText.toString(),
                ranges: objRanges.ranges,
                replace: false,
                type: 'Seasonal',
                field: 'collection_season'
            });
        }
    }

    //Gets the dates of the query parameters in a format that can be used by the addDate function
    PopulationBiologyMap.methods.retrieveDates = function (datesRange) {
        var [dateStartString, dateEndString] = datesRange.split("-");
        var dateStart;
        var dateEnd;
        var month;
        var day;
        var year;

        dateStartString.split('/').map( function (value, index) {
            if (index === 0) {
                day = value;
            } else if (index === 1) {
                month = value;
            } else {
                year = value;
            }
        });

        //Constructing string as MM/DD/YYYY
        dateStartString = month + "/" + day + "/" + year;

        dateEndString.split('/').map( function (value, index) {
            if (index === 0) {
                day = value;
            } else if (index === 1) {
                month = value;
            } else {
                year = value;
            }
        });

        //Constructing string as MM/DD/YYYY
        dateEndString = month + "/" + day + "/" + year;

        dateStart = new Date(dateStartString);
        dateEnd = new Date(dateEndString);

        return [dateStart, dateEnd];

    }

    PopulationBiologyMap.methods.addDate = function (dateStart, dateEnd) {
        var value;
        if (dateStart.getTime() === dateEnd.getTime()) {
            value = dateStart.toLocaleDateString('en-GB')
        } else {
            value = dateStart.toLocaleDateString('en-GB') + '-' + dateEnd.toLocaleDateString('en-GB')
        }

        $('#search_ac').tagsinput('add', {
            value: value,
            dateStart: dateStart,
            dateEnd: dateEnd,
            type: 'Date',
            //field: 'collection_date',
            field: 'collection_date_range'
        });
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
                    case "collectionID":
                        // have we passed multiple IDs??
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    value: element,
                                    activeTerm: true,
                                    type: 'Collection ID',
                                    field: mapTypeToField('Collection ID'),
                                    qtype: 'exact'
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: urlParams[key],
                                activeTerm: true,
                                type: 'Collection ID',
                                field: mapTypeToField('Collection ID'),
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
                                    type: 'Project',
                                    field: mapTypeToField('Project'),
                                    qtype: 'exact'
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: urlParams[key],
                                activeTerm: true,
                                type: 'Project',
                                field: mapTypeToField('Project'),
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
                                    type: 'Collection protocol',
                                    field: mapTypeToField('Collection protocol'),
                                    qtype: 'exact'
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: urlParams[key],
                                activeTerm: true,
                                type: 'Collection protocol',
                                field: mapTypeToField('Collection protocol'),
                                qtype: 'exact'
                            });
                        }
                        break;
                    case "protocols_cvterms":
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    value: element,
                                    activeTerm: true,
                                    type: 'Protocol',
                                    field: mapTypeToField('Protocol'),
                                    qtype: 'exact'
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: urlParams[key],
                                activeTerm: true,
                                type: 'Protocol',
                                field: mapTypeToField('Protocol'),
                                qtype: 'exact'
                            });
                        }
                        break;
                    case "sample_type":
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    value: element,
                                    activeTerm: true,
                                    type: 'Sample type',
                                    field: mapTypeToField('Sample type'),
                                    qtype: 'exact'
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: urlParams[key],
                                activeTerm: true,
                                type: 'Sample type',
                                field: mapTypeToField('Sample type'),
                                qtype: 'exact'
                            });
                        }
                        break;
                    case "insecticide":
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    value: element,
                                    activeTerm: true,
                                    type: 'Insecticide',
                                    field: mapTypeToField('Insecticide'),
                                    qtype: 'exact'
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: urlParams[key],
                                activeTerm: true,
                                type: 'Insecticide',
                                field: mapTypeToField('Insecticide'),
                                qtype: 'exact'
                            });
                        }
                        break;
                    case "allele":
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    value: element,
                                    activeTerm: true,
                                    type: 'Allele',
                                    field: mapTypeToField('Allele'),
                                    qtype: 'exact'
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: urlParams[key],
                                activeTerm: true,
                                type: 'Allele',
                                field: mapTypeToField('Allele'),
                                qtype: 'exact'
                            });
                        }
                        break;
                    case "locus":
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    value: element,
                                    activeTerm: true,
                                    type: 'Locus',
                                    field: mapTypeToField('Locus'),
                                    qtype: 'exact'
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: urlParams[key],
                                activeTerm: true,
                                type: 'Locus',
                                field: mapTypeToField('Locus'),
                                qtype: 'exact'
                            });
                        }
                        break;
                    case "geography":
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    value: element,
                                    activeTerm: true,
                                    type: 'Geography',
                                    field: mapTypeToField('Geography'),
                                    qtype: 'exact'
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: urlParams[key],
                                activeTerm: true,
                                type: 'Geography',
                                field: mapTypeToField('Geography'),
                                qtype: 'exact'
                            });
                        }
                        break;
                    case "project_title":
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    value: element,
                                    activeTerm: true,
                                    type: 'Project title',
                                    field: mapTypeToField('Project title'),
                                    qtype: 'exact'
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: urlParams[key],
                                activeTerm: true,
                                type: 'Project title',
                                field: mapTypeToField('Project title'),
                                qtype: 'exact'
                            });
                        }
                        break;
                    case "author":
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    value: element,
                                    activeTerm: true,
                                    type: 'Author',
                                    field: mapTypeToField('Author'),
                                    qtype: 'exact'
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: urlParams[key],
                                activeTerm: true,
                                type: 'Author',
                                field: mapTypeToField('Author'),
                                qtype: 'exact'
                            });
                        }
                        break;
                    case "title":
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    value: element,
                                    activeTerm: true,
                                    type: 'Title',
                                    field: mapTypeToField('Title'),
                                    qtype: 'exact'
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: urlParams[key],
                                activeTerm: true,
                                type: 'Title',
                                field: mapTypeToField('Title'),
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
                    case "norm-ir":
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    value: element,
                                    normIrValues: element,
                                    type: 'Norm-IR',
                                    field: 'phenotype_rescaled_value_f'
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: param,
                                normIrValues: param,
                                type: 'Norm-IR',
                                field: 'phenotype_rescaled_value_f'
                            });
                        }
                        break;
                    case "pubmed":
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    value: element,
                                    type: 'PubMed',
                                    field: 'pubmed',
                                    qtype: 'exact',
                                    is_synoym: false
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: param,
                                type: 'PubMed',
                                field: 'pubmed',
                                qtype: 'exact',
                                is_synoym: false
                            });
                        }
                        break;
                    case "collection_season":
                        var param = urlParams[key];

                        param.split(',').map( function (monthRanges) {
                            //See if what was passed was a range and take care of
                            //it accordingly
                            monthRange = monthRanges.split('-');

                            if (monthRange.length == 1) {
                                month = monthRange[0];
                                index = monthIndex[month];
                                months[index] = true;
                            } else {
                                startMonth = monthRange[0];
                                endMonth = monthRange[1];
                                startIndex = monthIndex[startMonth];
                                endMonth = monthIndex[endMonth];

                                for (startIndex; startIndex <= endMonth; ++startIndex) {
                                    months[startIndex] = true;
                                }
                            }
                        });

                        PopulationBiologyMap.methods.addSeason(months);

                        break;
                    case "date":
                        var param = urlParams[key];

                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                var dateStart;
                                var dateEnd;

                                [dateStart, dateEnd] = PopulationBiologyMap.methods.retrieveDates(element);
                                PopulationBiologyMap.methods.addDate(dateStart, dateEnd);
                            })
                        } else {
                            var dateStart;
                            var dateEnd;

                            [dateStart, dateEnd] = PopulationBiologyMap.methods.retrieveDates(param);
                            PopulationBiologyMap.methods.addDate(dateStart, dateEnd);
                        }
                        break
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
                    case "summarizeBy":
                        //Update global variable with value we want to summarize by
                        glbSummarizeBy = urlParams[key];
                        //Use to switch the legend data-toggle
                        //$('.legend .dropdown-menu li').find("[data-value='" + summarizeBy + "']").click()
                    default:
                        break;
                }
            }
        }
               
        // update the export fields dropdown
        updateExportFields(viewMode);
        $("#\\#swarm-plots").tooltip({placement: "right", title: "Disabled On This View"});

        // Add and remove the disabled class for the sidebar
        if (viewMode !== "ir" && viewMode !== "abnd") {
            $('#\\#swarm-plots').addClass('disabled');
            $("#\\#swarm-plots").tooltip('enable');
            
        } else {
            $('#\\#swarm-plots').removeClass('disabled');
            $("#\\#swarm-plots").tooltip('disable');
        }
        
        return hasParameters;
    }

    //Private function to map the field types to the URL query parameters that we accept
    function mapTypeToURLParam(type) {
        switch (type) {
            case "Project":
                return "projectID";
            case "Anywhere":
                return "text";
            case "Collection protocol":
                return "collection_protocol";
            case "Taxonomy":
                return "species";
            case "Protocol":
                return "protocols_cvterms";
            case "Seasonal":
                return "collection_season";
            case "Date":
                return "date";
            case "Sample type":
                return "sample_type";
            case "Insecticide":
                return "insecticide";
            case "Allele":
                return "allele";
            case "Locus":
                return "locus";
            case "Geography":
                return "geography";
            case "Project title":
                return "project_title";
            case "Author":
                return "author";
            case "Title":
                return "title";
            case "Norm-IR":
                return "norm-ir";
            case "PubMed":
                return "pubmed";
            default:
                return "text"
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
            var summarize_by = "&summarizeBy=" + $('.legend #summByDropdown button').text().trim();
            var grid = "&grid=" + $('#grid-toggle').prop('checked');
            var shared_link = "&shared_link=true";
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

            query_parameters = query_parameters + view_param + zoom_param + center_param + summarize_by + marker_param + panel_param + grid + shared_link;

            url = url + query_parameters;

            //Add URL to attribute used to copy to clipboard
            $("#generate-link").attr("data-clipboard-text", url);
            $("#generate-link-msg").show();
        });
        
        $("#generate-link").mousemove(function (){
            $("#generate-link-msg").fadeOut();
        });

        //Disable the panel from opening if it was disabled
        $(".sidebar-icon a").click(function (e) {
            if ($(this).hasClass("disabled")) {
                e.stopImmediatePropagation();
            }
        });

        $(document).on("mouseenter", ".detailedTip", function () {
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
