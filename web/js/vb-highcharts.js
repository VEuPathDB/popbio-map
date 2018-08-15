(function (PopulationBiologyMap, $, undefined) {
    //Private variables used for the chart
    var dataEndpoint = "Graphdata";
    var resolutionEndpoint = "MarkerYearRange"
    var resultLimit = 500000;
    var collectionResolutions;
    var highestResolution;
    var lowestResolution;
    var resultCount;
    var highchartsFilter;
    var resolution;
    var minDate;
    var maxDate;
    var minRange;
    var graphConfig;
    var afterSetExtremesTriggered = false;
    var externalAction = false;
    var resolutionSelector = false;
    var highcharts = {};

    //Object that contain the configuration of how certain views are supposed to be graphed with highcharts
    //Preferably, this configuration should be constructed using information stored in a database
    var viewGraphConfig = {
        abnd : {
            //Will be used to support different type of data that gets graphed
            dataType: "timeplot",
            graphTitle: "Population abundance",
            quantityLabel: "Abundance",
            yAxis: [{
                value: ["sum_abundance", "num_collections"],
                operator: '/',
                decimalPlaces: 1,
                title: "Average individuals (per night per trap)",
                chartType: "column",
                offset: 20
            }],
            plotOptions: {
                column: {
                    stacking: 'normal',
                    groupPadding: 0.01,
                    events: {
                        legendItemClick: setExternalActionFlag
                    }
                }
            },
            collectionKey: "facets.term.buckets"
        },
        path: {
            //Will be used to support different type of data that gets graphed
            dataType: "timeplot",
            graphTitle: "Pathogen infection data",
            quantityLabel: "Number of assays",
            yAxis: [{
                value: "count",
                title: "Total number of assays",
                chartType: "column",
                transparent: true,
                offset: 15
            },
            {
                value: "infected.count",
                title: "Number of infected assay",
                chartType: "line",
                offset: 0,
                tooltip: {
                    data: [{
                        key: "pathogen",
                        value: "infected.pathogen.buckets",
                        label: "Pathogen(s)",
                        type: "variable"
                    }]
                } //Will contain the configuration to set the tooltip of the graph
            }],
            plotOptions: {
                column: {
                    stacking: 'normal',
                    groupPadding: 0.01,
                    events: {
                        legendItemClick: setExternalActionFlag
                    }
                },
                line: {
                    events: {
                        legendItemClick: setExternalActionFlag
                    },
                    marker: {
                        enabled: true,
                        radius: 5
                    }
                }
            },
            collectionKey: "facets.term.buckets"
        }
    } 

    //Object that maps the resolution value to solr field
    var resolutionToSolrField = {
        Yearly: "collection_year_s",
        Monthly: "collection_month_s",
        EpiWeekly: "collection_epiweek_s",
        Daily: "collection_day_s"
    }

    //Mapping from solr to what is used in the code
    var solrToResolutionName = {
        year: "Yearly",
        month: "Monthly",
        day: "Daily"
    }

    //Used to compare resolutions to see which one should be used
    var resolutionRank = {
        day: 1,
        month: 3,
        year: 4,
        Daily: 1,
        EpiWeekly: 2,
        Monthly: 3,
        Yearly: 4
    }

    var performOperation = {
        "+": function (x,y) { return x + y },
        "-": function (x,y) { return x + y },
        "*": function (x,y) { return x * y },
        "/": function (x,y) { return x / y }
    }

    if (PopulationBiologyMap.data == undefined) {
        PopulationBiologyMap.data = {};
    }

    if (PopulationBiologyMap.methods == undefined) {
        PopulationBiologyMap.methods = {};
    }

    PopulationBiologyMap.methods.createHighchartsGraph = function(divid, filter) {
        //How the URL will be constructed
        var baseUrl = solrPopbioUrl + viewMode + resolutionEndpoint + "?";
        var queryUrl = baseUrl + qryUrl + filter;
        
        //Resets/updates variables related to the data being graphed
        collectionResolutions = [];
        lowestResolution = undefined;
        highestResolution = undefined;
        minRange = undefined;
        graphConfig = viewGraphConfig[viewMode];

        //Set title of graph panel
        $("#swarm-plots h3").text(graphConfig.graphTitle);

        //Hide resolution selector to not show the changes the code does to the buttons
        $("#resolution-selector-group").hide();
        //Reset any buttons that were disabled
        $.each($("#resolution-selector .disabled"), function() {
            $(this).removeClass("disabled");
        });
        $("#resolution-selector .btn-primary").addClass("btn-default").removeClass("btn-primary");

        //Storing filter in object to use later
        highchartsFilter = filter;

        //Will need to find a better way of organizing these ajax calls
        //$('#swarm-chart-area').fadeOut();
        $.ajax({
            type: "GET",
            url: queryUrl,
            dataType: "json",
            success: function (json) {
                //Get the resolutions of the data being graphed
                var collectionResolutionList = json.facets.collection_resolution.buckets;
                //Get the min and max dates of data
                var collectionYearList = json.facets[resolutionToSolrField.Yearly].buckets;
                var lastYearPosition = collectionYearList.length - 1;
                minDate = new Date(collectionYearList[0].val + '-01-01T00:00:00Z').getTime();
                maxDate = new Date(collectionYearList[lastYearPosition].val + '-12-31T00:00:00Z').getTime();
                //Calculate number of days the data of query will could cover
                var numberOfDays = (maxDate-minDate) / (1000 * 3600 * 24);

                //Store the resolutions of the data
                for (var j = 0; j < collectionResolutionList.length; j++) {
                    var resolutionValue = collectionResolutionList[j].val
                    collectionResolutions.push(resolutionValue);
                }

                //Get the possible ranges for the chart navigator
                var rangesList = {};
                for (var j = 0; j < collectionResolutions.length; j++) {
                    //Check the collection resolution and set the appropriate range for the chart
                    if (collectionResolutions[j] == "year") {
                        //Possible range is approx. 3 years
                        rangesList["year"] = 3600 * 1000 * 24 * 365 * 3;
                    } else if (collectionResolutions[j] == "month") {
                        //Possible range is approx. 3 months
                        rangesList["month"] = 3600 * 1000 * 24 * 90;
                    } else {
                       //Possible range is 10 days
                       rangesList["day"] = 3600 * 1000 * 24 * 10;
                    }
                }

                for (var key in rangesList) {
                    //Now get the minimum range the navigator can go since it is possible
                    //for the data returned to not be available for a certain range
                    if (rangesList[key] < minRange || minRange == undefined) {
                        minRange = rangesList[key];
                        highestResolution = key;
                    }

                    //Also find the lowest resolution of the data
                    if (lowestResolution == undefined) {
                        lowestResolution = key;
                    } else if (resolutionRank[key] > resolutionRank[lowestResolution]) {
                        lowestResolution = key;
                    }
                }

                //Decide what resolution of data to get based on the number of days the data covers for performance
                //Also add padding to graph range to ensure all data will be graphed when changing resolution
                if (numberOfDays > 3650) {
                    //More than 10 years gets yearly data
                    resolution = "Yearly";

                    //Add a year of padding,
                    minDate -= (3600 * 1000 * 24 * 365);
                    maxDate += (3600 * 1000 * 24 * 365);

                    //More than 10 years, do not give users option of viewing EpiWeekly and Daily
                    $("#EpiWeekly").addClass("disabled");
                    $("#Daily").addClass("disabled");
                } else if (numberOfDays > 1095) {
                    //More than 3 years but less than 10 years get monthly data
                    resolution = "Monthly";

                    //Add approximately a month of padding
                    minDate -= (3600 * 1000 * 24 * 31);
                    maxDate += (3600 * 1000 * 24 * 31);

                    //More than 3 years but less than 10 years, do not allow users to see Daily data
                    $("#Daily").addClass("disabled");
                } else if (numberOfDays > 365) {
                    //More than 1 year, but less than 3 years gets EpiWeekly
                    resolution = "EpiWeekly";

                    //Add a week of padding
                    minDate -= (3600 * 1000 * 24 * 7);
                    maxDate += (3600 * 1000 * 24 * 7);
                } else {
                    //Less than one year gets daily data
                    resolution = "Daily";

                    //Add a day of padding
                    minDate -= (3600 * 1000 * 24);
                    maxDate += (3600 * 1000 * 24);
                }


                //Set the default tooltip message for disabled buttons
                $.each($("#resolution-selector button"), function() {
                    if ($(this).attr('data-original-title')) {
                        $(this).attr('title', "Date range graphed is too broad.  Narrow down date range to enable.").tooltip("fixTitle");
                    } else {
                        $(this).tooltip({
                            position: "top",
                            title: "Date range graphed is too broad.  Narrow down date range to enable."
                        });
                    }
                });


                $("#resolution-selector button").tooltip("disable");

                //Update the calculated resolution since the data being graphed is not available
                //in the resolution that was calculated
                if (resolutionRank[lowestResolution] > resolutionRank[resolution]) {
                    resolution = solrToResolutionName[lowestResolution];
                }

                //Disable buttons based on the highest resolution available
                if (highestResolution === "year") {
                    $("#Monthly").addClass("disabled");
                    $("#EpiWeekly").addClass("disabled");
                    $("#Daily").addClass("disabled");
                } else if (highestResolution === "month") {
                    $("#EpiWeekly").addClass("disabled");
                    $("#Daily").addClass("disabled");
                }

                //Add a tooltip letting user know the buttons are disabled because
                //no higher resolution is available
                if (highestResolution !== "day") {
                    $("#resolution-selector button")
                        .attr('title', "The data is not available at a higher resolution")
                        .tooltip("fixTitle");
                }

                $("#resolution-selector .disabled").tooltip("enable");

                //Display the resolution selector to let user know the resolution of the data
                $("#resolution-selector-group").fadeIn();
                $("#" + resolution).addClass("btn-primary").removeClass("btn-default");

                //Hide warning icon if only one resolution is present in data being graphed
                if (collectionResolutions.length == 1) {
                    $("#resolution-selector-title .fa-exclamation-triangle").hide();
                } else {
                    $("#resolution-selector-title .fa-exclamation-triangle").show();
                }

                resultCount = json.response.numFound;
            },
            error: function() {
                PaneSpin('swarm-plots', 'stop');
                console.log("An error has occurred");
            }
        })
        .then(function () {
            // add GA - VB-4680
            // Will eventually move to GTM so we do not have to add code related to analytics
            Highcharts.setOptions({
                exporting: {
                    buttons: {
                        contextButton: {
                            text: '',
                            menuItems: [{
                                text: 'Print chart',
                                onclick: function() {
                                    gtag('event', 'exportchart', {'event_category': 'Popbio', 'event_label': 'Abundance Print'});
                                    this.print();
                                }
                            }, {
                                separator: true,
                            }, {
                                text: 'Download PNG image',
                                onclick: function() {
                                    gtag('event', 'exportchart', {'event_category': 'Popbio', 'event_label': 'Abundance PNG'});
                                    this.exportChart();
                                }
                            }, {
                                text: 'Download JPEG image',
                                onclick: function() {
                                    gtag('event', 'exportchart', {'event_category': 'Popbio', 'event_label': 'Abundance JPEG'});
                                    this.exportChart({
                                        type: 'image/jpeg'
                                    });
                                }
                            }, {
                                text: 'Download PDF document',
                                onclick: function() {
                                    gtag('event', 'exportchart', {'event_category': 'Popbio', 'event_label': 'Abundance PDF'});
                                    this.exportChart({
                                        type: 'application/pdf'
                                    });
                                }
                            }, {
                                text: 'Download SVG vector image',
                                onclick: function() {
                                    gtag('event', 'exportchart', {'event_category': 'Popbio', 'event_label': 'Abundance SVG'});
                                    this.exportChart({
                                        type: 'image/svg+xml'
                                    });
                                },
                                separator: false
                            }]
                        }
                    }
                }
            });

            //Construct URL used to retrieve data from solr
            var term  = mapSummarizeByToField(glbSummarizeBy).summarize;
            var dateResolutionField = resolutionToSolrField[resolution];
            var baseUrl = solrPopbioUrl + viewMode + dataEndpoint + "?";
            // unfortunately 'term' seems to be a misnomer.  'field' would be better!
            var facetTerm = "&term=" + term + "&date_resolution=" + dateResolutionField;
            var queryUrl = baseUrl + qryUrl + facetTerm + filter;

            //Check if the results that will be retrieved from query are more than what we allow to be graphed
            //Hopefully this will not be needed anymore once graphing by resolution is implemented
            if (resultCount > resultLimit) {
                //Display message letting user know why data was not graphed
                $("#swarm-chart-area").html(
                    '<div style="text-align: center; margin-top: 30px">' +
                    '<i class="fa fa-chart-area" style="color: #C3312D; font-size: 12em"></i>' +
                    '<h4>Too many points to plot</h4>' +
                    '<h4>Apply filters to plot less data</h4>' +
                    '<h4><b>Points</b>: ' + result_count.toString() + '</h4>' +
                    '<h4><b>Limit</b>: ' + result_limit.toString() + '</h4>' +
                    '</div>'
                );

                $("#resolution-selector-group").hide();
            } else {
                //Limit not reached so get actual data used to create graph
                $.ajax({
                    beforeSend: function(xhr) {
                        //Clear chart area and start the spinner
                        PaneSpin('swarm-plots', 'start');
                        $('#swarm-chart-area').empty();
                        $(divid + ' select').remove();
                        $(divid + ' label').remove();

                        //Probably not nessary
                        if (xhr && xhr.overrideMimeType) {
                            xhr.overrideMimeType('application/json;charset-utf-8');
                        }
                    },
                    url: queryUrl,
                    dataType: 'json',
                    success: function(json) {
                        setHighchartsData(json);
                    },
                    error: function() {
                        PaneSpin('swarm-plots', 'stop');
                        console.log("An error has occurred");
                    },
                    complete: function() {
                        //Construct graph using the data that was received from Solr
                        var data = highcharts.series;
                        var yAxis = highcharts.yAxis;
                        createStockchart(yAxis, data);
                        PaneSpin('swarm-plots', 'stop');
                    }
                });
            }
        });
    }

    //Tasks that need to be done or events defined  when the page loads
    function initialize() {
        //Event used to graph data based on the resolution selected by user
        $("#resolution-selector button").click(function () {
            //Only get data if button is not disabled
            if (!$(this).hasClass("disabled")) {
                //Update button that is selected
                $("#resolution-selector .btn-primary").addClass("btn-default").removeClass("btn-primary");
                $(this).addClass("btn-primary").removeClass("btn-default");
                resolution = this.value;

                //Show that data has already disappeared by checking the lowest resolution that was available
                //for data that is being graphed
                if (resolutionRank[lowestResolution] > resolutionRank[resolution]) {
                    $("#resolution-selector-title .fa-exclamation-triangle").addClass("danger");
                } else {
                    $("#resolution-selector-title .fa-exclamation-triangle").removeClass("danger");
                }

                var chart = Highcharts.charts[0];
                var extremes = chart.xAxis[0].getExtremes();
                var startDate = new Date(extremes.min).toISOString();
                var endDate = new Date(extremes.max).toISOString();
                var numberOfDays = (extremes.max-extremes.min) / (1001 * 3600 * 24);

                //Update the graph
                updateHighchartsGraph(startDate, endDate, resolution);
            }
        });

        //Give info on why buttons might get greyed out
        $("#resolution-selector-title .fa-info-circle").tooltip({placement: "top", title: "A higher resolution might get disabled if viewing a broad timeline or when a higher resolution is not available."});
        $("#resolution-selector-title .fa-exclamation-triangle").tooltip({placement: "top", title: "Graphed data contains mixed temporal resolution.  Selecting a higher resolution will cause some data to disappear."});
    }

    function createStockchart(yAxis, data) {
        var plotOptions = viewGraphConfig[viewMode].plotOptions;
        
        //Delete previous created chart object and add a new one
        //when clicking a different marker
        if (Highcharts.charts[0] !== undefined ) {
            Highcharts.charts[0].destroy();
            Highcharts.charts.splice(0,1);
        }

        //Add additional plot options than what is required by the different views
        if (!plotOptions['series']) {
            plotOptions['series'] = {
                dataGrouping: {
                    enabled: false
                }
            }
        }

        //Add graph to the swarm-chart-area div
        Highcharts.stockChart('swarm-chart-area', {
            rangeSelector: {
                enabled: false
            },
            legend: {
                enabled: true,
                labelFormat: "<i>{name}</i>",
                symbolRadius: 0
            },
            chart: {
                height: "200%"
            },
            navigator: {
                adaptToUpdateData: false,
                series: {
                    data: []
                },
                height: 20
            },
            scrollbar: {
                enabled: false,
                liveRedraw: false
            },
            tooltip: {
                useHTML: true,
                split: false,
                formatter: customTooltipFormatter 
            },
            plotOptions: plotOptions,
            xAxis: {
                events: {
                    afterSetExtremes: afterSetExtremes
                },
                min: minDate,
                max: maxDate,
                minRange: minRange,
            },
            yAxis: yAxis, 
            credits: {
                enabled: false
            },
            series: data
        });
    };

    /**
     * Load new data depending on the selected min and max
     */
    function afterSetExtremes(e) {
        var chart = Highcharts.charts[0];
        var startDate = new Date(e.min).toISOString();
        var endDate = new Date(e.max).toISOString();
        var numberOfDays = (e.max-e.min) / (1000 * 3600 * 24);
        var oldResolution = resolution;

        //The following code is to fix a small bug where setAfterExtreme gets executed when clicking on a 
        //legend item if setAfterExtreme has not been executed before
        //Update the flag that the afterSetExtreme function has already been accessed
        if (!afterSetExtremesTriggered) {
            afterSetExtremesTriggered = true;

            //Since accessing afterSetExtremes for the first time, check if it was triggered due to a legend
            //and do not execute rest of function if that is the case
            if (externalAction) {
                externalAction = false;
                return;
            }
        }

        //Only enable buttons if the highestResolution in the data is not year
        if (highestResolution !== "year") {
            //Based on how many days are viewing viewed, disable certain resolutions
            if (numberOfDays > 3650 + 730 || highestResolution === "month") {
                //More than 10 years, do not give users option of viewing EpiWeekly and Daily
                $("#EpiWeekly").addClass("disabled");
                $("#Daily").addClass("disabled");
                $("#resolution-selector .disabled").tooltip("enable");

                if (resolution === "Daily" || resolution === "EpiWeekly") {
                    resolution = "Monthly";
                    $("#resolution-selector .btn-primary").removeClass("btn-primary").addClass("btn-default").blur();
                    $("#Monthly").addClass("btn-primary").removeClass("btn-default");
                };
            } else if (numberOfDays > 1095 + 60) {
                //More than 3 years but less than 10 years, do not allow users to see Daily data
                //Also make sure we are not trying to disable a button that is not available for that dataset
                $("#Daily").addClass("disabled");
                $("#resolution-selector .disabled").tooltip("enable");

                if (resolution === "Daily") {
                    resolution = "EpiWeekly";
                    $("#resolution-selector .btn-primary").removeClass("btn-primary").addClass("btn-default").blur();
                    $("#EpiWeekly").addClass("btn-primary").removeClass("btn-default");
                };
            } else {
                $("#resolution-selector .disabled").tooltip("disable");
                $("#EpiWeekly").removeClass("disabled");
                $("#Daily").removeClass("disabled");
            }
        }

        //Only update the graph if the resolution was changed
        if (oldResolution !== resolution) {
            updateHighchartsGraph(startDate, endDate, resolution);
        }
    }

    //Creaates query for new data, does a request, and updates the graph
    function updateHighchartsGraph(startDate, endDate, resolution) {
        //Construct the URL that will be used to get the new data
        var term  = mapSummarizeByToField(glbSummarizeBy).summarize;
        var dateResolutionField = resolutionToSolrField[resolution];
        var baseUrl = solrPopbioUrl + viewMode + dataEndpoint + "?";
        var facetTerm = "&term=" + term + "&date_resolution=" + dateResolutionField;
        var queryUrl = baseUrl + qryUrl + facetTerm + highchartsFilter + "&fq=collection_date:[" + startDate + " TO " + endDate +"]";
        var chart = Highcharts.charts[0];

        chart.showLoading("Loading data from server...");
        //Get new data based on the Date range selected with Highcharts' navigator
        $.getJSON(queryUrl, function (json) {
            //Show series in graph in case it was hidden when no data was found
            $(".highcharts-series-group").show();

            if (json.facets.term) {
                //chart.showLoading('Loading data from server...');
                setHighchartsData(json);
                setExternalActionFlag();
                var data = highcharts.series;

                //Remove all the old series
                while(chart.series.length > 0)
                    chart.series[0].remove(false);

                //Add each series to the graph
                for (var i = 0; i < data.length; i++) {
                    chart.addSeries(data[i], false);
                }

                chart.redraw();
                chart.hideLoading();
            } else {
                chart.showLoading("No data found");

                //Hide the left over series data, might be a better way, but do not have time
                $(".highcharts-series-group").hide();
            }
        });
    }


    //Uses the response from SOLR to construct the data array that will be used by Highcharts
    function setHighchartsData(json) {
        //Reset what is used to set the properties to create the graph
        highcharts.series = [];
        highcharts.yAxis = [];

        //Get species (or protocols etc) collection info from response
        if (json.facets.term) {
            var collectionKey = graphConfig.collectionKey;
            //Use the collection key to that was set to get the data that will be used
            var termCollectionsList = Object.byString(json, collectionKey); 

            //Used to choose what side to place the y-axis
            var opposite = false;
            graphConfig.yAxis.forEach(function (yAxis) {

                //Flag used to tell if there is non-zero data in series for column charts
                var noData = true;
                
                //Go through response to parse data out that will be plotted
                termCollectionsList.forEach(function (termCollections) {
                    //Get the key of the y-axis we are population
                    var yAxisKey = opposite ? " infected" : "";
                    var marker = opposite ? "diamond" : "circle";

                    //Used to hold the formatted data for a single species (or protocol, etc)  chart
                    var markerColor = legend.options.palette[termCollections.val];
                    var chartType = yAxis.chartType;
                    var transparent = yAxis.transparent;
                    
                    if (transparent) {
                        var r = hexToRgb(markerColor).r;
                        var g = hexToRgb(markerColor).g;
                        var b = hexToRgb(markerColor).b;

                        markerColor = 'rgba(' + r + ',' + g + ',' + b + ',0.7)';
                    }

                    var singleTermData = {
                        "name": termCollections.val + yAxisKey,
                        "marker": {
                            "symbol": marker
                        },
                        "type": chartType,
                        "color": markerColor,
                        //Use the opposite boolean to decide which yAxis to map the series
                        "yAxis": opposite ? 1 : 0,
                        "data": []
                    };

                    //Will need to standardize in the future since the "collection_info" could be in a different location
                    collectionsInfo = termCollections.collection_dates.buckets;
                    collectionsInfo.forEach(function (collectionsDate) {
                        //Get the key of the y-axis we are population
                        var yAxisKey = opposite ? 1 : 0;
                        var operator = yAxis.operator;
                        var valueKey = yAxis.value;
                        var data = {};

                        //Decide how we will get the actual yValue
                        if (operator) {
                            var x = Object.byString(collectionsDate, valueKey[0]);
                            var y = Object.byString(collectionsDate, valueKey[1]);
                            var yValue = performOperation[operator](x,y).roundDecimals(1);
                        } else {
                            var yValue = Object.byString(collectionsDate, valueKey);
                        }

                        //Only take into consideration no_data if the graph is columns type
                        //if (chart_type === "column") {
                        //    if (no_data && y_value !== 0) {
                        //       no_data = false;
                        //    } 
                        //} else if (no_data) {
                        //    no_data = false;
                        //}
                        
                        //Could support different values on x-axis so checking the data_type which will not do anything for now
                        if (graphConfig.dataType === "timeplot") {
                            if (resolution === "Yearly") {
                                var unixDate = new Date(collectionsDate.val + '-01-01T00:00:00Z').getTime();
                            } else if (resolution === "Monthly") {
                                var unixDate = new Date(collectionsDate.val + '-01T00:00:00Z').getTime();
                            } else if (resolution === "EpiWeekly") {
                                [epiWeekYear, epiWeek] = collectionsDate.val.split("-");
                                epiWeek = epiWeek.replace("W", "");
                                var epiWeekDate = getDateFromWeek(epiWeek, epiWeekYear);
                                var unixDate = epiWeekDate.getTime();
                            } else {
                                var unixDate = new Date(collectionsDate.val + 'T00:00:00Z').getTime();
                            }

                            //Check what additional data needs to be set with the series
                            //Using try catch since it is possible tooltip is not always defined
                            try {
                                if (yAxis.tooltip.data) {
                                    //Go through each additional tooltip data config to add the additional data for the tooltip
                                    yAxis.tooltip.data.forEach(function (dataConfig) {
                                        var dataPoints = Object.byString(collectionsDate, dataConfig.value);

                                        if (dataPoints) {
                                            data[dataConfig.key] = {label: dataConfig.label, value: []};

                                            dataPoints.forEach(function (dataPoint) {
                                                data[dataConfig.key].value.push(dataPoint.val)
                                            });
                                        }
                                    });
                                }
                            } catch {
                                //Only adding because it is necessary
                            }

                            if (resolution === "EpiWeekly") {
                                data.epiWeek = {label: "Epi Week", value: [epiWeek]};
                            }

                            singleTermData.data.push({x:unixDate, y:yValue, data:data});
                        }
                    });

                    //Add series data
                    highcharts.series.push(singleTermData);
                });

                //Add the y-axis that will be used
                highcharts.yAxis.push({
                    opposite: opposite,
                    allowDecimals: false,
                    reversedStacks: false,
                    min: 0,
                    offset: yAxis.offset,
                    title: {
                        text: yAxis.title
                    },
                    labels: {
                        align: "left",
                        x: 0
                    },
                    visible: true //no_data ? false : true
                });

                //Change opposite to true so the next yAxis will be in the opossite side of graph
                opposite = true;
            });
        }
    }

    //Usec to customize the information showed in the tooltip
    function customTooltipFormatter() {
        var startDate = new Date(this.x);
        var year = startDate.getUTCFullYear();
        var month = startDate.getUTCMonth();
        var day = startDate.getUTCDate();
        var collectionDate;
        var endDate;
        var dataType;
        var quantityLabel = graphConfig.quantityLabel;

        //Right now we are only doing timeplots, but if it changes will need to use graphConfig.dataType to customize how 
        //the tooltip will look with different type of data
        if (resolution === "Yearly") {
            dataType = "Year";
            startDate = Highcharts.dateFormat('%b %d', startDate);
            endDate = Highcharts.dateFormat('%b %d', new Date(year, 12, 31));
            collectionDate = startDate + " to " + endDate;
        } else if (resolution === "Monthly") {
            dataType = "Month";
            startDate = Highcharts.dateFormat('%b %d', startDate);
            month += 1;
            endDate = Highcharts.dateFormat('%b %d',new Date(year, month, 0));
            collectionDate = startDate + " to " + endDate;
        } else if (resolution === "EpiWeekly") {
            dataType = "Epi Week";
            day = startDate.getDate() + 6;
            startDate = Highcharts.dateFormat('%b %d', startDate);
            endDate = Highcharts.dateFormat('%b %d', new Date(year, month, day));
            collectionDate = startDate + " to " + endDate;
        } else {
            dataType = "Day";
            collectionDate = Highcharts.dateFormat('%b %d, %Y',new Date(this.x));
        }

        if (glbSummarizeBy === "Species") {
            var tooltip = '<i><b>' + this.series.name + '</b></i><br/>';
        } else {
            var tooltip =  '<b>' + this.series.name +'</b><br>';
        }

        tooltip += '<b>Date:</b> ' + collectionDate  + '<br>' +
            '<b>' + quantityLabel + ':</b> ' + this.y + '<br>' +
            '<b>Resolution:</b> ' + dataType + '<br>' +
            '<b>Year:</b> ' + year;

        var data = this.point.data;
        for (var key in data) {
            tooltip += '<br>' + '<b>' + data[key].label + ':</b> ' + data[key].value.join(', ');
        }

        return tooltip;
    }

    //Return first Sunday of the epi week
    function getDateFromWeek(w, y) {
        var _days;
        if(w == 53){
            _days = (1 + (w - 1) * 7);
        } else {
            _days = (w * 7);
        }

        var _date = new Date(y,0,_days);
        _date.setDate(_date.getDate() - _date.getDay());

        return _date;
    }

    //Allows one to use strings representing an object key to access the value of an object
    Object.byString = function(o, s) {
        s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
        s = s.replace(/^\./, '');           // strip a leading dot
        var a = s.split('.');
        for (var i = 0, n = a.length; i < n; ++i) {
            var k = a[i];
            if (k in o) {
                o = o[k];
            } else {
                return;
            }
        }
        return o;
    }

    //In order to set opacity on highcharts, need to set the color in rgb format
    //Function below allows me to retrieve the r, g, b values for hex
    function hexToRgb(hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    //Sets legend_flag flag to prevent afterSetExtremes from re-rendeing 
    //the graph when toggling a legend item
    function setExternalActionFlag() {
        if (!afterSetExtremesTriggered) {
            externalAction = true;
        }
    }

    $(document).ready(function () {
        //Initialize things needed for the graph
        initialize();
    });
})(window.PopulationBiologyMap = window.PopulationBiologyMap || {}, jQuery);
