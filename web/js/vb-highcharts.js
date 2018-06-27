(function (PopulationBiologyMap, $, undefined) {
    //Private variables used for the chart
    var endpoint = "Graphdata";
    var result_limit = 500000;
    var collection_resolutions;
    var highest_resolution;
    var lowest_resolution;
    var projects_list;
    var result_count;
    var highcharts_filter;
    var resolution;
    var min_date;
    var max_date;
    var min_range;

    //Object that maps the resolution value to solr field
    var resolution_to_solr_field = {
        Yearly: "collection_year_s",
        Monthly: "collection_month_s",
        EpiWeekly: "collection_epiweek_s",
        Daily: "collection_day_s"
    }

    //Mapping from solr to what is used in the code
    var solr_to_resolution_name = {
        year: "Yearly",
        month: "Monthly",
        day: "Daily"
    }

    //Used to compare resolutions to see which one should be used
    var resolution_rank = {
        day: 1,
        month: 3,
        year: 4,
        Daily: 1,
        EpiWeekly: 2,
        Monthly: 3,
        Yearly: 4
    }

    if (PopulationBiologyMap.data == undefined) {
        PopulationBiologyMap.data = {};
    }

    PopulationBiologyMap.data.highcharts = {};

    if (PopulationBiologyMap.methods == undefined) {
        PopulationBiologyMap.methods = {};
    }

    PopulationBiologyMap.methods.createAbundanceGraph = function(divid, filter) {
        $('#swarm-plots h3').text('Population Abundance');
        //How the URL will be constructed
        var abundanceUrl = solrPopbioUrl + viewMode + "Projects?";
        var queryUrl = abundanceUrl + qryUrl + filter;

        //Reset variables related to the data being graphed
        collection_resolutions = [];
        lowest_resolution = undefined;
        highest_resolution = undefined;
        min_range = undefined;

        //Remove created tooltips
        $("#resolution-selector .disabled").tooltip("destroy");

        //Reset any buttons that were disabled
        $.each($(".disabled"), function() {
            $(this).removeClass("disabled");
        });

        $("#resolution-selector .btn-primary").addClass("btn-default").removeClass("btn-primary");

        //Storing filter in object to use later
        highcharts_filter = filter;

        //Will need to find a better way of organizing these ajax calls
        //$('#swarm-chart-area').fadeOut();
        $.ajax({
            type: 'GET',
            url: queryUrl,
            dataType: 'json',
            success: function (json) {
                //Get the min and max dates of the data
                var collection_year_list = json.facets[resolution_to_solr_field.Yearly].buckets;
                //Get the resolutions of the data being graphed
                var collection_resolution_list = json.facets.collection_resolution.buckets;
                var last_year_position = collection_year_list.length - 1;
                min_date = new Date(collection_year_list[0].val + '-01-01T00:00:00Z').getTime();
                max_date = new Date(collection_year_list[last_year_position].val + '-12-31T00:00:00Z').getTime();
                var number_of_days = (max_date-min_date) / (1000 * 3600 * 24);


                for (var j = 0; j < collection_resolution_list.length; j++) {
                    var resolution_value = collection_resolution_list[j].val
                    collection_resolutions.push(resolution_value);
                }

                //Get the possible ranges for the chart navigator
                var ranges_list = {};
                for (var j = 0; j < collection_resolutions.length; j++) {
                    //Check the collection resolution and set the appropriate range for the chart
                    if (collection_resolutions[j] == "year") {
                        //Possible range is approx. 3 years
                        ranges_list["year"] = 3600 * 1000 * 24 * 365 * 3;
                    } else if (collection_resolutions[j] == "month") {
                        //Possible range is approx. 3 months
                        ranges_list["month"] = 3600 * 1000 * 24 * 90;
                    } else {
                       //Possible range is 10 days
                       ranges_list["day"] = 3600 * 1000 * 24 * 10;
                    }
                }

                //Now get the minimum range the navigator can go
                for (var key in ranges_list) {
                    if (ranges_list[key] < min_range || min_range == undefined) {
                        min_range = ranges_list[key];
                        highest_resolution = key;
                    }

                    if (lowest_resolution == undefined) {
                        lowest_resolution = key;
                    } else if (resolution_rank[key] > resolution_rank[lowest_resolution]) {
                        lowest_resolution = key;
                    }
                }

                //Decide what resolution of data to get
                if (number_of_days > 3650) {
                    //More than 10 years gets yearly data
                    resolution = "Yearly";
                    min_date -= (3600 * 1000 * 24 * 365);
                    max_date += (3600 * 1000 * 24 * 365);

                    //More than 10 years, do not give users option of viewing EpiWeekly and Daily
                    $("#EpiWeekly").addClass("disabled");
                    $("#Daily").addClass("disabled");
                } else if (number_of_days > 1095) {
                    //More than 3 years but less than 10 years get monthly data
                    resolution = "Monthly";
                    min_date -= (3600 * 1000 * 24 * 30);
                    max_date += (3600 * 1000 * 24 * 30);

                    //More than 3 years but less than 10 years, do not allow users to see Daily data
                    $("#Daily").addClass("disabled");
                } else if (number_of_days > 365) {
                    //More than 1 year, but less than 3 years gets EpiWeekly
                    //Using monthly for now since EpiWeekly needs a function to take care of correctly
                    resolution = "EpiWeekly";
                    min_date -= (3600 * 1000 * 24 * 7);
                    max_date += (3600 * 1000 * 24 * 7);
                } else {
                    //Less than one year gets daily data
                    resolution = "Daily";
                    min_date -= (3600 * 1000 * 24);
                    max_date += (3600 * 1000 * 24);
                }

                //Set the default tooltip message for disabled buttons
                $("#resolution-selector .disabled").tooltip({
                    position: "top",
                    title: "Date range graphed is too broad.  Narrow down date range to enable."
                });

                //Update the calculated resolution since the data being graphed is not available
                //in the resolution that was calculated
                if (resolution_rank[lowest_resolution] > resolution_rank[resolution]) {
                    resolution = solr_to_resolution_name[lowest_resolution];
                }

                //Disable buttons based on the highest resolution available
                if (highest_resolution === "year") {
                    $("#Monthly").addClass("disabled");
                    $("#EpiWeekly").addClass("disabled");
                    $("#Daily").addClass("disabled");
                } else if (highest_resolution === "month") {
                    $("#EpiWeekly").addClass("disabled");
                    $("#Daily").addClass("disabled");
                }

                //Add a tooltip letting user know the buttons are disabled because
                //no higher resolution is available
                if (highest_resolution !== "day") {
                    //Destory tooltip created and recreate with a different title
                    $("#resolution-selector .disabled").tooltip("destroy");
                    $("#resolution-selector .disabled").tooltip({
                        position: 'top',
                        title: "The data is not available at a higher resolution"
                    });
                }

                //Display the resolution selector to let user know the resolution of the data
                $("#resolution-selector-group").show();
                $("#" + resolution).addClass("btn-primary").removeClass("btn-default");

                //Hide warning icon if only one resolution is present in data being graphed
                if (collection_resolutions.length == 1) {
                    $("#resolution-selector-title .fa-exclamation-triangle").hide();
                } else {
                    $("#resolution-selector-title .fa-exclamation-triangle").show();
                }

                projects_list = json.facets.projects_category.buckets;
                result_count = json.response.numFound;
            },
            error: function() {
                PaneSpin('swarm-plots', 'stop');
                console.log("An error has occurred");
            }
        })
        .then(function () {
            // add GA - VB-4680
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

            //Get graph data for project and build chart
            //Construct URL used to retrieve data from solr
            var term  = mapSummarizeByToField(glbSummarizeBy).summarize;
            var date_resolution_field = resolution_to_solr_field[resolution];
            var abundanceUrl = solrPopbioUrl + viewMode + endpoint + "?";
            // unfortunately 'term' seems to be a misnomer.  'field' would be better!
            var facet_term = "&term=" + term + "&date_resolution=" + date_resolution_field;
            var queryUrl = abundanceUrl + qryUrl + facet_term + filter;

            //Hopefully this will not be needed anymore
            if (result_count > result_limit) {
                $("#swarm-chart-area").html(
                    '<div style="text-align: center; margin-top: 30px">' +
                    '<i class="fa fa-area-chart" style="color: #C3312D; font-size: 12em"></i>' +
                    '<h4>Too many points to plot</h4>' +
                    '<h4>Apply filters to plot less data</h4>' +
                    '<h4><b>Points</b>: ' + result_count.toString() + '</h4>' +
                    '<h4><b>Limit</b>: ' + result_limit.toString() + '</h4>' +
                    '</div>'
                );

                $("#resolution-selector-group").hide();
            } else {
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
                        //Construct graph with ajax call to Solr servr
                        var data = PopulationBiologyMap.data.highcharts.data;
                        PopulationBiologyMap.methods.createStockchart(data);
                        PaneSpin('swarm-plots', 'stop');
                    }
                });
            }
        });
    }

    //Tasks that need to be done or events defined  when the page loads
    PopulationBiologyMap.init = function() {
        $("#resolution-selector button").click(function () {
            if (!$(this).hasClass("disabled")) {
                $("#resolution-selector .btn-primary").addClass("btn-default").removeClass("btn-primary");
                $(this).addClass("btn-primary").removeClass("btn-default");
                resolution = this.value;

                //Check if the data has already disappeared
                if (resolution_rank[lowest_resolution] > resolution_rank[resolution]) {
                    $("#resolution-selector-title .fa-exclamation-triangle").addClass("danger");
                } else {
                    $("#resolution-selector-title .fa-exclamation-triangle").removeClass("danger");
                }

                var chart = Highcharts.charts[0];
                var extremes = chart.xAxis[0].getExtremes();
                var start_date = new Date(extremes.min).toISOString();
                var end_date = new Date(extremes.max).toISOString();
                var number_of_days = (extremes.max-extremes.min) / (1001 * 3600 * 24);

                //NOTE: This is probably not needed since we do not change the extremes of the navigator, but
                //leaving for now in the off chance that it is needed somehow
                //Based on how many days are viewing viewed, disable certain resolutions
                if (number_of_days > 3650 + 730) {
                    //More than 10 years, do not give users option of viewing EpiWeekly and Daily
                    $("#EpiWeekly").addClass("disabled");
                    $("#Daily").addClass("disabled");
                    //More than 10 years gets yearly data
                    //resolution = "Yearly";
                } else if (number_of_days > 1095 + 60) {
                    //More than 3 years but less than 10 years, do not allow users to see Daily data
                    //Also make sure we are not trying to disable a button that is not available for that dataset
                    $("#Daily").addClass("disabled");
                } else {
                    $("#resolution-selector .disabled").tooltip("destroy");
                    $("#EpiWeekly").removeClass("disabled");
                    $("#Daily").removeClass("disabled");
                }

                //Set the default tooltip message for disabled buttons
                $("#resolution-selector .disabled").tooltip({
                    position: "top",
                    title: "Date range graphed is too broad.  Narrow down date range to enable."
                });
                //End NOTE

                //Disable buttons based on the highest resolution available
                if (highest_resolution === "year") {
                    $("#Monthly").addClass("disabled");
                    $("#EpiWeekly").addClass("disabled");
                    $("#Daily").addClass("disabled");
                } else if (highest_resolution === "month") {
                    $("#EpiWeekly").addClass("disabled");
                    $("#Daily").addClass("disabled");
                }

                //Add a tooltip letting user know the buttons are disabled because
                //no higher resolution is available
                if (highest_resolution !== "day") {
                    //Destory tooltip created and recreate with a different title
                    $("#resolution-selector .disabled").tooltip("destroy");
                    $("#resolution-selector .disabled").tooltip({
                        position: 'top',
                        title: "The data is not available at a higher resolution"
                    });
                }

                var term  = mapSummarizeByToField(glbSummarizeBy).summarize;
                var date_resolution_field = resolution_to_solr_field[resolution];
                var abundanceUrl = solrPopbioUrl + viewMode + endpoint + "?";
                var facet_term = "&term=" + term + "&date_resolution=" + date_resolution_field;
                //var queryUrl = abundanceUrl + qryUrl + facet_term + highcharts_filter;
                var queryUrl = abundanceUrl + qryUrl + facet_term + highcharts_filter + "&fq=collection_date:[" + start_date + " TO " + end_date +"]";

                chart.showLoading("Loading data from server...");
                //Get new data based on the Date range selected with Highcharts' navigator
                $.getJSON(queryUrl, function (json) {
                    //Show series in graph in case it was hidden when no data was found
                    $(".highcharts-series-group").show();

                    if (json.facets.term) {
                        //chart.showLoading('Loading data from server...');
                        setHighchartsData(json);
                        var data = PopulationBiologyMap.data.highcharts.data;

                         //Remove the old data points
                        while(chart.series.length > 0)
                            chart.series[0].remove(false);

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
        });

        //Give info on why buttons might get greyed out
        $("#resolution-selector-title .fa-info-circle").tooltip({placement: "top", title: "A higher resolution might get disabled if viewing a broad timeline or when a higher resolution is not available."});
        $("#resolution-selector-title .fa-exclamation-triangle").tooltip({placement: "top", title: "Graphed data contains mixed temporal resolution.  Selecting a higher resolution will cause some data to disappear."});
    }

    PopulationBiologyMap.methods.createStockchart = function(data) {
        //$('#swarm-chart-area').highcharts('StockChart',{
        //Delete previous created chart object and add a new one
        if (Highcharts.charts[0] !== undefined ) {
            Highcharts.charts[0].destroy();
            Highcharts.charts.splice(0,1);
        }

        Highcharts.stockChart('swarm-chart-area', {
            rangeSelector: {
                enabled: false
            },
            legend: {
                enabled: true,
                labelFormat: "<i>{name}</i>"
            },
            chart: {
                type: 'scatter',
                //zoomType: 'xy',
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
                formatter: function () {
                    var start_date = new Date(this.x);
                    var year = start_date.getUTCFullYear();
                    var month = start_date.getUTCMonth();
                    var day = start_date.getUTCDate();
                    var collection_date;
                    var end_date;
                    var data_type;

                    if (resolution === "Yearly") {
                        data_type = "Year";
                        start_date = Highcharts.dateFormat('%b %d', start_date);
                        end_date = Highcharts.dateFormat('%b %d', new Date(year, 12, 31));
                        collection_date = start_date + " to " + end_date;
                    } else if (resolution === "Monthly") {
                        data_type = "Month";
                        start_date = Highcharts.dateFormat('%b %d', start_date);
                        month += 1;
                        end_date = Highcharts.dateFormat('%b %d',new Date(year, month, 0));
                        collection_date = start_date + " to " + end_date;
                    } else if (resolution === "EpiWeekly") {
                        data_type = "Epi Week";
                        day = start_date.getDate() + 6;
                        start_date = Highcharts.dateFormat('%b %d', start_date);
                        end_date = Highcharts.dateFormat('%b %d', new Date(year, month, day));
                        collection_date = start_date + " to " + end_date;
                    } else {
                        data_type = "Day";
                        collection_date = Highcharts.dateFormat('%b %d, %Y',new Date(this.x));
                    }

                    if (glbSummarizeBy === "Species") {
                        var tooltip = '<i><b>' + this.series.name + '</b></i><br/>';
                    } else {
                        var tooltip =  '<b>' + this.series.name +'</b><br>';
                    }

                    tooltip += '<b>Date:</b> ' + collection_date  + '<br>' +
                        '<b>Abundance:</b> ' + this.y + '<br>' +
                        '<b>Resolution:</b> ' + data_type + '<br>' +
                        '<b>Year:</b> ' + year;

                    if (resolution === "EpiWeekly") {
                        tooltip += '<br>' + '<b>Epi Week:</b> ' + this.point.epi_week;
                    }

                    return tooltip;
                }
            },
            xAxis: {
                events: {
                    afterSetExtremes: afterSetExtremes
                },
                min: min_date,
                max: max_date,
                //Set minimum range to 10 days
                minRange: min_range
            },
            yAxis: {
                opposite: false,
                title: {
                    text: "Average individuals (per night per trap)"
                },
                labels: {
                    align: "left",
                    x: 0
                }
            },
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
        var start_date = new Date(e.min).toISOString();
        var end_date = new Date(e.max).toISOString();
        var number_of_days = (e.max-e.min) / (1000 * 3600 * 24);

        //Based on how many days are viewing viewed, disable certain resolutions
        if (number_of_days > 3650 + 730) {
            //More than 10 years, do not give users option of viewing EpiWeekly and Daily
            $("#EpiWeekly").addClass("disabled");
            $("#Daily").addClass("disabled");

            if (resolution === "Daily" || resolution === "EpiWeekly") {
                resolution = "Monthly";
                $("#resolution-selector .btn-primary").removeClass("btn-primary").addClass("btn-default").blur();
                $("#Monthly").addClass("btn-primary").removeClass("btn-default");
            };
        } else if (number_of_days > 1095 + 60) {
            //More than 3 years but less than 10 years, do not allow users to see Daily data
            //Also make sure we are not trying to disable a button that is not available for that dataset
            $("#Daily").addClass("disabled");

            if (resolution === "Daily") {
                resolution = "EpiWeekly";
                $("#resolution-selector .btn-primary").removeClass("btn-primary").addClass("btn-default").blur();
                $("#EpiWeekly").addClass("btn-primary").removeClass("btn-default");
            };
        } else {
            $("#resolution-selector .disabled").tooltip("destroy");
            $("#EpiWeekly").removeClass("disabled");
            $("#Daily").removeClass("disabled");
        }

        //Set the default tooltip message for disabled buttons
        $("#resolution-selector .disabled").tooltip({
            position: "top",
            title: "Date range graphed is too broad.  Narrow down date range to enable."
        });

        //Disable buttons based on the highest resolution available
        if (highest_resolution === "year") {
            $("#Monthly").addClass("disabled");
            $("#EpiWeekly").addClass("disabled");
            $("#Daily").addClass("disabled");
        } else if (highest_resolution === "month") {
            $("#EpiWeekly").addClass("disabled");
            $("#Daily").addClass("disabled");
        }

        //Add a tooltip letting user know the buttons are disabled because
        //no higher resolution is available
        if (highest_resolution !== "day") {
            //Destory tooltip created and recreate with a different title
            $("#resolution-selector .disabled").tooltip("destroy");
            $("#resolution-selector .disabled").tooltip({
                position: 'top',
                title: "The data is not available at a higher resolution"
            });
        }


        //Construct the URL that will be used to get the new data
        var term  = mapSummarizeByToField(glbSummarizeBy).summarize;
        var date_resolution_field = resolution_to_solr_field[resolution];
        var abundanceUrl = solrPopbioUrl + viewMode + endpoint + "?";
        var facet_term = "&term=" + term + "&date_resolution=" + date_resolution_field;
        var queryUrl = abundanceUrl + qryUrl + facet_term + highcharts_filter + "&fq=collection_date:[" + start_date + " TO " + end_date +"]";

        chart.showLoading('Loading data from server...');
        //Get new data based on the Date range selected with Highcharts' navigator
        $.getJSON(queryUrl, function (json) {
            //Show series in graph in case it was hidden when no data was found
            $(".highcharts-series-group").show();

            if (json.facets.term) {
                //chart.showLoading('Loading data from server...');
                setHighchartsData(json);
                var data = PopulationBiologyMap.data.highcharts.data;

                //Remove the old data points
                while(chart.series.length > 0)
                    chart.series[0].remove(false);

                for (var i = 0; i < data.length; i++) {
                    chart.addSeries(data[i], false);
                }

                chart.redraw();
                chart.hideLoading();
            } else {
                chart.showLoading('No data found');
            }
        });
    }

    //Uses the response from SOLR to construct the data array that will be used by Highcharts
    function setHighchartsData(json) {
        PopulationBiologyMap.data.highcharts.data = [];

        //Get species (or protocols etc) collection info from response
        if (json.facets.term) {
            var term_collections_list = json.facets.term.buckets;

            term_collections_list.forEach(function (term_collections) {
                //Used to hold the formatted data for a single species (or protocol, etc)  chart
                var marker_color = legend.options.palette[term_collections.val];
                var single_term_data = {
                    "name": term_collections.val,
                    "marker": {
                    "symbol": "circle"
                },
                    "color": marker_color,
                    "data": []
                };

                collections_info = term_collections.collection_dates.buckets;
                collections_info.forEach(function (collections_date) {
                    var average_abundance = (collections_date.sum_abundance/collections_date.num_collections).roundDecimals(1);

                    if (resolution === "Yearly") {
                        var unix_date = new Date(collections_date.val + '-01-01T00:00:00Z').getTime();
                    } else if (resolution === "Monthly") {
                        var unix_date = new Date(collections_date.val + '-01T00:00:00Z').getTime();
                    } else if (resolution === "EpiWeekly") {
                        [epi_week_year, epi_week] = collections_date.val.split("-");
                        epi_week = epi_week.replace("W", "");
                        var epi_week_date = getDateFromWeek(epi_week, epi_week_year);
                        var unix_date = epi_week_date.getTime();
                    } else {
                        var unix_date = new Date(collections_date.val + 'T00:00:00Z').getTime();
                    }

                    if (resolution === "EpiWeekly") {
                        single_term_data.data.push({x:unix_date, y:average_abundance, epi_week:epi_week});
                    } else {
                        single_term_data.data.push([unix_date, average_abundance]);
                    }
                });
                PopulationBiologyMap.data.highcharts.data.push(single_term_data);
            });
        }
    }

    //Return first Sunday of the epi week
    function getDateFromWeek(w, y)
    {
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

    $(document).ready(function () {
        PopulationBiologyMap.init();
    });
})(window.PopulationBiologyMap = window.PopulationBiologyMap || {}, jQuery);
